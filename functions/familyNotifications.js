const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

async function sendPush(uid, eventKey, title, body, url, type = "reminder") {
  const userRef = db.collection("users").doc(uid);
  const profile = await userRef.get();
  const settings = profile.data()?.notificationSettings || {};
  if (settings.enabled !== true) return { sent: 0, invalid: 0, skipped: "disabled" };
  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  const existing = await eventRef.get();
  if (existing.exists) return { sent: 0, invalid: 0, duplicate: true };
  const tokenSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  if (!tokenDocs.length) {
    await eventRef.set({ type, status: "no-delivery", title, body, url, read: false, createdAt: FieldValue.serverTimestamp() });
    return { sent: 0, invalid: 0 };
  }
  await eventRef.set({ type, status: "sending", title, body, url, read: false, createdAt: FieldValue.serverTimestamp() });
  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.data().token),
      notification: { title, body },
      data: { title, body, eventKey, url, notificationType: type },
      webpush: { fcmOptions: { link: `https://tinytitans-hoggy-companion.web.app${url.startsWith("/") ? url : `/${url}`}` } },
    });
    sent += response.successCount;
    invalid += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete();
    }));
  }
  await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, sentAt: FieldValue.serverTimestamp() }, { merge: true });
  return { sent, invalid };
}

async function findUserByEmail(email) {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised) return null;
  const snapshot = await db.collection("users").where("email", "==", normalised).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

async function getDisplayName(uid, fallback = "A family member") {
  const userId = String(uid || "").trim();
  if (!userId) return fallback;
  try {
    const snapshot = await db.collection("users").doc(userId).get();
    const data = snapshot.data() || {};
    const name = String(data.displayName || data.name || data.username || "").trim();
    return name || fallback;
  } catch (error) {
    console.warn("Tiny Titans: unable to resolve notification display name", { uid: userId, error });
    return fallback;
  }
}

function londonNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}`, minutes: Number(value.hour) * 60 + Number(value.minute) };
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateDifference(targetDate, currentDate) {
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  const current = new Date(`${currentDate}T00:00:00Z`).getTime();
  return Math.round((target - current) / 86400000);
}

function timeInWindow(target, currentMinutes, windowMinutes = 5) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(target || ""))) return false;
  const [hours, minutes] = target.split(":").map(Number);
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + windowMinutes;
}

function weightIntervalDays(frequency) {
  switch (frequency) {
    case "Weekly": return 7;
    case "Fortnightly": return 14;
    case "Every 3 Weeks": return 21;
    case "Monthly": return 30;
    default: return 30;
  }
}

exports.sendFamilyInvitationNotification = onDocumentCreated({ document: "familyInvites/{inviteId}", region: "europe-west2" }, async (event) => {
  const invite = event.data?.data();
  if (!invite || invite.status !== "pending") return;
  const target = await findUserByEmail(invite.targetEmail);
  if (!target) return;
  const owner = await db.collection("users").doc(String(invite.ownerUid || "")).get();
  const ownerName = String(owner.data()?.displayName || owner.data()?.name || "A Tiny Titans family member");
  await sendPush(target.id, `family-invite-${event.params.inviteId}`, "👨‍👩‍👦 Tiny Titans Family Invitation", `${ownerName} has invited you to join their Tiny Titans Family.`, "/account/family", "family");
});

exports.sendFamilyApprovalNotification = onDocumentCreated({ document: "familyApprovals/{approvalId}", region: "europe-west2" }, async (event) => {
  const approval = event.data?.data();
  if (!approval || approval.status !== "pending" || !approval.familyId) return;
  const family = await db.collection("families").doc(String(approval.familyId)).get();
  const ownerUid = String(family.data()?.ownerUid || "");
  if (!ownerUid) return;
  const requesterUid = String(approval.requesterUid || "").trim();
  if (!requesterUid || requesterUid === ownerUid) return;
  const requesterName = await getDisplayName(requesterUid, String(approval.requesterName || "A family member").trim() || "A family member");
  const action = String(approval.title || "a family change");
  await sendPush(ownerUid, `family-approval-${event.params.approvalId}`, "🔐 Tiny Titans Approval Needed", `${requesterName} needs your approval for: ${action}.`, "/account/family", "family");
});

exports.sendFamilyApprovalDecisionNotification = onDocumentUpdated({ document: "familyApprovals/{approvalId}", region: "europe-west2" }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status || !["approved", "rejected"].includes(after.status)) return;
  const requesterUid = String(after.requesterUid || "");
  if (!requesterUid) return;
  const title = after.status === "approved" ? "🟢 Tiny Titans Change Approved" : "🔴 Tiny Titans Change Declined";
  const body = after.status === "approved" ? `${String(after.title || "Your requested change")} has been approved and applied to the family record.` : `${String(after.title || "Your requested change")} was declined by the Family Owner.`;
  await sendPush(requesterUid, `family-approval-decision-${event.params.approvalId}-${after.status}`, title, body, "/account/family", "family");
});

exports.runNotificationBotProbe = onCall({ region: "europe-west2" }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in to run the Notification BOT.");
  const profile = await db.collection("users").doc(uid).get();
  const data = profile.data() || {};
  const claims = request.auth.token || {};
  const authorised = claims.admin === true || claims.creator === true || claims.creatorTester === true || data.role === "admin" || data.profileType === "creator";
  if (!authorised) throw new HttpsError("permission-denied", "Creator or Creator Tester authorization is required.");
  const eventKey = String(request.data?.eventKey || "").trim();
  if (!/^notification-bot-[a-z0-9-]{10,80}$/.test(eventKey)) throw new HttpsError("invalid-argument", "Invalid notification BOT event key.");
  const title = "🤖 Tiny Titans Notification BOT";
  const body = "Live notification probe passed through the production notification pipeline.";
  const url = "/settings";
  const result = await sendPush(uid, eventKey, title, body, url, "notification-bot-probe");
  return { eventKey, status: result.sent > 0 ? "sent" : result.duplicate ? "duplicate" : result.skipped === "disabled" ? "disabled" : "no-delivery", sentCount: result.sent, invalidTokenCount: result.invalid, title, body, url };
});

exports.sendAllKeeperReminderNotifications = onSchedule({ schedule: "*/5 * * * *", timeZone: "Europe/London", region: "europe-west2", memory: "512MiB", timeoutSeconds: 300 }, async () => {
  const now = londonNow();
  const users = await db.collection("users").get();
  let sent = 0;
  let evaluated = 0;

  for (const userDocument of users.docs) {
    const uid = userDocument.id;
    const userData = userDocument.data();
    const settings = userData.notificationSettings || {};
    if (settings.enabled !== true) continue;

    const snakes = await userDocument.ref.collection("snakes").get();
    for (const snakeDocument of snakes.docs) {
      const snake = snakeDocument.data();
      const snakeId = snakeDocument.id;
      const snakeName = String(snake.name || "your snake");
      evaluated += 1;

      const feeding = snake.feedingSchedule || {};
      if (feeding.enabled === true && feeding.notificationsEnabled !== false && settings.feedingRemindersEnabled !== false && feeding.nextFeedingDate) {
        const daysUntil = dateDifference(String(feeding.nextFeedingDate), now.date);
        const eventDate = String(feeding.nextFeedingDate);
        const prepEnabled = settings.feedingPreparationEnabled === true && feeding.preparationReminderEnabled === true;
        const prepDays = Number.isFinite(Number(feeding.preparationReminderDaysBefore)) ? Number(feeding.preparationReminderDaysBefore) : Number(settings.feedingPreparationDaysBefore || 0);
        const prepTime = typeof feeding.preparationReminderTime === "string" ? feeding.preparationReminderTime : String(settings.feedingPreparationTime || "08:00");

        if (daysUntil === 0) {
          const delivery = await sendPush(uid, `feeding-due-${snakeId}-${eventDate}`, `🍽️ Feeding due — ${snakeName}`, `${snakeName} is scheduled for feeding today.`, `/feeding/${snakeId}`, "feeding");
          sent += delivery.sent;
        }
        if (prepEnabled && daysUntil === prepDays && timeInWindow(prepTime, now.minutes)) {
          const delivery = await sendPush(uid, `feeding-prep-${snakeId}-${eventDate}-${prepDays}`, `🥩 Feeding preparation — ${snakeName}`, `Prepare ${snakeName}'s feed. Feeding is scheduled for ${eventDate}.`, "/feeding/preparation", "feeding-preparation");
          sent += delivery.sent;
        }
      }

      const weightTracking = snake.weightTracking || {};
      if (weightTracking.enabled === true && settings.weightRemindersEnabled !== false) {
        const lastDate = String(snake.lastWeighedDate || "").trim();
        if (lastDate) {
          const nextDate = addDays(lastDate, weightIntervalDays(weightTracking.frequency));
          const daysUntil = dateDifference(nextDate, now.date);
          if (daysUntil === 0 && timeInWindow(String(settings.weightReminderTime || "09:00"), now.minutes)) {
            const delivery = await sendPush(uid, `weight-due-${snakeId}-${nextDate}`, `⚖️ Weigh-in due — ${snakeName}`, `${snakeName} is due for their scheduled weight record today.`, `/weights/${snakeId}`, "weight");
            sent += delivery.sent;
          } else if (daysUntil === -1 && timeInWindow(String(settings.weightReminderTime || "09:00"), now.minutes)) {
            const delivery = await sendPush(uid, `weight-overdue-${snakeId}-${nextDate}`, `⚖️ Weight overdue — ${snakeName}`, `${snakeName}'s scheduled weigh-in was missed yesterday.`, `/weights/${snakeId}`, "weight");
            sent += delivery.sent;
          }
        }
      }

      if (settings.healthRemindersEnabled !== false) {
        const healthSnapshot = await snakeDocument.ref.collection("health").get();
        for (const healthDocument of healthSnapshot.docs) {
          const record = healthDocument.data();
          const schedule = record.medicationSchedule;
          if (schedule && schedule.enabled === true && schedule.reminderEnabled === true && schedule.nextDueAt) {
            const due = Date.parse(schedule.nextDueAt);
            if (Number.isFinite(due) && due <= Date.now()) {
              const administrations = Array.isArray(record.medicationAdministrations) ? record.medicationAdministrations : [];
              const alreadyRecorded = administrations.some((item) => item.scheduledFor === schedule.nextDueAt && ["given", "skipped"].includes(item.status));
              if (!alreadyRecorded) {
                const eventKey = `health-medication-due-${snakeId}-${healthDocument.id}-${schedule.nextDueAt}`.replace(/[^a-zA-Z0-9_-]/g, "-");
                const medication = String(schedule.medicationName || record.medication || "Medication");
                const dose = String(schedule.dose || record.dosage || "Dose recorded in Tiny Titans");
                const delivery = await sendPush(uid, eventKey, `💊 Medication due — ${snakeName}`, `${medication} · ${dose}`, `/health/${snakeId}`, "medication");
                sent += delivery.sent;
                const followUpMinutes = Number(settings.medicationMissedFollowUpMinutes || 60);
                if (settings.healthReminderFollowUpEnabled !== false && Date.now() - due >= Math.max(5, followUpMinutes) * 60 * 1000) {
                  const followUp = await sendPush(uid, `${eventKey}-followup`, `🟠 Medication not recorded — ${snakeName}`, `${medication} is overdue. Record the dose when administered or intentionally skipped.`, `/health/${snakeId}`, "medication-followup");
                  sent += followUp.sent;
                }
              }
            }
          }

          const followUpDate = String(record.followUpDate || "").trim();
          if (followUpDate && settings.healthReminderFollowUpEnabled !== false) {
            const daysUntil = dateDifference(followUpDate, now.date);
            const leadDays = Number(settings.healthFollowUpLeadDays || 1);
            if (daysUntil <= leadDays && daysUntil >= 0 && timeInWindow("09:00", now.minutes)) {
              const eventKey = `health-followup-${snakeId}-${healthDocument.id}-${followUpDate}`.replace(/[^a-zA-Z0-9_-]/g, "-");
              const title = record.eventType === "Vet Visit" ? `🩺 Vet follow-up — ${snakeName}` : `🩺 Health follow-up — ${snakeName}`;
              const body = daysUntil === 0 ? `${String(record.title || "Health follow-up")} is due today.` : `${String(record.title || "Health follow-up")} is due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`;
              const delivery = await sendPush(uid, eventKey, title, body, `/health/${snakeId}`, "health-followup");
              sent += delivery.sent;
            }
          }
        }
      }
    }
  }
  console.log(`Tiny Titans: unified reminder run complete — evaluated ${evaluated} snakes, sent ${sent} notifications.`);
});
