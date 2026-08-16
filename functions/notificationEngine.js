const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

const DEFAULTS = {
  pushEnabled: false,
  feedingEnabled: true,
  weighingEnabled: true,
  shedEnabled: true,
  medicationEnabled: true,
  otherEnabled: true,
  quietHoursEnabled: true,
  quietStart: "22:00",
  quietEnd: "07:00",
  medicationCanNotifyDuringQuietHours: true,
};

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone || "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return { hour: Number(parts.find((p) => p.type === "hour")?.value || 0), minute: Number(parts.find((p) => p.type === "minute")?.value || 0) };
}

function inQuietHours(date, settings) {
  if (!settings.quietHoursEnabled) return false;
  const start = Number(String(settings.quietStart || "22:00").split(":")[0]) * 60 + Number(String(settings.quietStart || "22:00").split(":")[1]);
  const end = Number(String(settings.quietEnd || "07:00").split(":")[0]) * 60 + Number(String(settings.quietEnd || "07:00").split(":")[1]);
  const now = localParts(date, settings.timezone);
  const current = now.hour * 60 + now.minute;
  return start === end ? false : start < end ? current >= start && current < end : current >= start || current < end;
}

function minutesUntilQuietEnd(date, settings) {
  const end = Number(String(settings.quietEnd || "07:00").split(":")[0]) * 60 + Number(String(settings.quietEnd || "07:00").split(":")[1]);
  const now = localParts(date, settings.timezone);
  const current = now.hour * 60 + now.minute;
  let delta = end - current;
  if (delta <= 0) delta += 1440;
  return delta;
}

function reminderTypeEnabled(type, settings) {
  if (type === "feeding") return settings.feedingEnabled;
  if (type === "weighing") return settings.weighingEnabled;
  if (type === "shed") return settings.shedEnabled;
  if (type === "medication") return settings.medicationEnabled;
  return settings.otherEnabled;
}

function shouldRespectQuietHours(reminder, settings) {
  if (!reminder.respectQuietHours) return false;
  if (reminder.type === "medication" && settings.medicationCanNotifyDuringQuietHours) return false;
  return true;
}

function nextMedicationDate(current, intervalDays) {
  const date = new Date(current);
  date.setDate(date.getDate() + Math.max(1, Number(intervalDays) || 1));
  return date;
}

async function sendReminder(reminder, uid, deviceDocs) {
  const tokens = deviceDocs.map((item) => item.data().token).filter(Boolean).slice(0, 500);
  if (!tokens.length) return { success: false, stale: [], reason: "No active notification devices." };

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: reminder.title, body: reminder.body },
    data: {
      url: String(reminder.deepLink || "/"),
      notificationId: String(reminder.id),
      reminderType: String(reminder.type),
      snakeId: String(reminder.snakeId || ""),
    },
    webpush: { fcmOptions: { link: `https://tinytitans-hoggy-companion.web.app${reminder.deepLink || "/"}` } },
  });

  const stale = [];
  response.responses.forEach((result, index) => {
    if (!result.success) {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") stale.push(deviceDocs[index].id);
    }
  });
  await Promise.all(stale.map((id) => db.doc(`users/${uid}/notificationDevices/${id}`).delete().catch(() => undefined)));
  return { success: response.successCount > 0, stale, reason: response.failureCount ? `${response.failureCount} device(s) failed.` : undefined };
}

async function processReminder(snapshot) {
  const reminder = snapshot.data();
  if (!reminder || reminder.status !== "scheduled") return;
  const uid = snapshot.ref.parent.parent?.id;
  if (!uid) return;

  const settingsSnap = await db.doc(`users/${uid}/notificationSettings/main`).get();
  const settings = { ...DEFAULTS, ...(settingsSnap.exists ? settingsSnap.data() : {}) };
  if (!settings.pushEnabled || !reminderTypeEnabled(reminder.type, settings)) {
    await snapshot.ref.set({ updatedAt: Timestamp.now(), suppressedReason: "Notification type disabled or push notifications disabled." }, { merge: true });
    return;
  }

  const scheduledFor = reminder.scheduledFor?.toDate ? reminder.scheduledFor.toDate() : new Date(reminder.scheduledFor);
  if (!(scheduledFor instanceof Date) || Number.isNaN(scheduledFor.getTime())) {
    await snapshot.ref.set({ status: "failed", failureReason: "Invalid scheduledFor timestamp.", failedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
    return;
  }

  if (shouldRespectQuietHours(reminder, settings) && inQuietHours(new Date(), settings)) {
    const shifted = new Date(Date.now() + minutesUntilQuietEnd(new Date(), settings) * 60000);
    await snapshot.ref.set({ scheduledFor: Timestamp.fromDate(shifted), updatedAt: Timestamp.now(), quietHoursShifted: true }, { merge: true });
    return;
  }

  const deviceSnapshot = await db.collection(`users/${uid}/notificationDevices`).where("enabled", "==", true).get();
  const deviceDocs = deviceSnapshot.docs.filter((item) => item.data().token);
  const result = await sendReminder(reminder, uid, deviceDocs);
  const historyRef = db.doc(`users/${uid}/notificationHistory/${reminder.id}`);

  if (result.success) {
    await snapshot.ref.set({ status: "sent", sentAt: Timestamp.now(), updatedAt: Timestamp.now(), staleDeviceCount: result.stale.length }, { merge: true });
    await historyRef.set({ ...reminder, status: "sent", sentAt: Timestamp.now(), deviceCount: deviceDocs.length, staleDeviceCount: result.stale.length }, { merge: true });

    if (reminder.type === "medication" && reminder.medicationId) {
      const medicationSnap = await db.doc(`users/${uid}/medications/${reminder.medicationId}`).get();
      const medication = medicationSnap.exists ? medicationSnap.data() : null;
      if (medication?.active) {
        const next = nextMedicationDate(scheduledFor, medication.intervalDays);
        if (!medication.endDate || next.toISOString().slice(0, 10) <= medication.endDate) {
          const nextId = `medication-${reminder.medicationId}-${next.toISOString().slice(0, 10)}-${medication.scheduledTime}`;
          await db.doc(`users/${uid}/reminders/${nextId}`).set({ ...reminder, id: nextId, status: "scheduled", scheduledFor: Timestamp.fromDate(next), sequenceDate: next.toISOString().slice(0, 10), createdAt: Timestamp.now(), updatedAt: Timestamp.now(), sentAt: FieldValue.delete() }, { merge: true });
        }
      }
    }
  } else {
    await snapshot.ref.set({ status: "failed", failedAt: Timestamp.now(), failureReason: result.reason || "No notification device accepted the message.", updatedAt: Timestamp.now() }, { merge: true });
    await historyRef.set({ ...reminder, status: "failed", failedAt: Timestamp.now(), failureReason: result.reason || "No notification device accepted the message." }, { merge: true });
  }
}

exports.processDueReminders = onSchedule({ schedule: "every 5 minutes", timeZone: "UTC", region: "europe-west2" }, async () => {
  const now = Timestamp.now();
  const snapshot = await db.collectionGroup("reminders").where("scheduledFor", "<=", now).limit(100).get();
  await Promise.all(snapshot.docs.map((item) => processReminder(item)));
});

exports.completeFeedingReminders = onDocumentCreated({ document: "users/{uid}/snakes/{snakeId}/feedings/{feedingId}", region: "europe-west2" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const uid = event.params.uid;
  const snakeId = event.params.snakeId;
  const feedingDate = String(data.date || "");
  if (!feedingDate) return;
  const snapshot = await db.collection(`users/${uid}/reminders`).where("type", "==", "feeding").where("snakeId", "==", snakeId).where("sequenceDate", "==", feedingDate).where("status", "in", ["scheduled", "sent"]).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((item) => batch.set(item.ref, { status: "completed", completedAt: Timestamp.now(), updatedAt: Timestamp.now(), completionSource: "feeding-tracker" }, { merge: true }));
  await batch.commit();
});
