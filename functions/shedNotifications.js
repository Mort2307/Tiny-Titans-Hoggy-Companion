const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

function londonNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, minutes: Number(value.hour) * 60 + Number(value.minute) };
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

async function sendShedPush(uid, eventKey, title, body, url) {
  const userRef = db.collection("users").doc(uid);
  const profile = await userRef.get();
  const settings = profile.data()?.notificationSettings || {};
  if (settings.enabled !== true || settings.shedRemindersEnabled === false) return 0;

  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  if ((await eventRef.get()).exists) return 0;

  const tokenSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  if (!tokenDocs.length) {
    await eventRef.set({ type: "shed", status: "no-delivery", title, body, url, read: false, createdAt: FieldValue.serverTimestamp() });
    return 0;
  }

  await eventRef.set({ type: "shed", status: "sending", title, body, url, read: false, createdAt: FieldValue.serverTimestamp() });
  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.data().token),
      notification: { title, body },
      data: { title, body, eventKey, url, notificationType: "shed" },
      webpush: { fcmOptions: { link: url } },
    });
    sent += response.successCount;
    invalid += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete();
    }));
  }
  await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, sentAt: FieldValue.serverTimestamp() }, { merge: true });
  return sent;
}

exports.sendShedCycleReminderNotifications = onSchedule({ schedule: "*/5 * * * *", timeZone: "Europe/London", region: "europe-west2", memory: "256MiB", timeoutSeconds: 180 }, async () => {
  const now = londonNow();
  const users = await db.collection("users").get();
  let evaluated = 0;
  let sent = 0;

  for (const userDocument of users.docs) {
    const uid = userDocument.id;
    const settings = userDocument.data().notificationSettings || {};
    if (settings.enabled !== true || settings.shedRemindersEnabled === false) continue;

    const reminderDays = Number.isFinite(Number(settings.shedReminderDays)) ? Math.max(1, Math.min(30, Math.round(Number(settings.shedReminderDays)))) : 3;
    const reminderTime = String(settings.shedReminderTime || "09:00");
    if (!timeInWindow(reminderTime, now.minutes)) continue;

    const snakes = await userDocument.ref.collection("snakes").get();
    for (const snakeDocument of snakes.docs) {
      evaluated += 1;
      const snake = snakeDocument.data();
      const snakeName = String(snake.name || "your snake");
      const shedHistory = Array.isArray(snake.shedHistory) ? snake.shedHistory : [];
      const active = shedHistory.find((record) => record && record.currentStage && record.currentStage !== "Complete" && !record.completedAt && !record.deletedAt);
      if (!active) continue;

      const started = String(active.cycleStartedAt || active.date || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(started)) continue;
      const activeDays = dateDifference(now.date, started) * -1;
      if (activeDays < reminderDays) continue;

      const stage = String(active.currentStage || "Blue");
      const stageLabel = stage === "Clear" ? "Clear phase" : "Blue phase";
      const eventKey = `shed-checkin-${snakeDocument.id}-${started}-${now.date}`;
      const title = `🐍 Shed cycle check-in — ${snakeName}`;
      const body = `${snakeName} has been in an active shedding cycle for ${activeDays} day${activeDays === 1 ? "" : "s"} (${stageLabel}). Have a look and record the next stage when ready.`;
      sent += await sendShedPush(uid, eventKey, title, body, `/shedding/${snakeDocument.id}`);
    }
  }

  console.log(`Tiny Titans: shed reminder run complete — evaluated ${evaluated} snakes, sent ${sent} notifications.`);
});
