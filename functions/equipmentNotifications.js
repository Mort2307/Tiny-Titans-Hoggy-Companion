const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";
const NOTIFICATION_ICON = `${PUBLIC_ORIGIN}/favicon.svg`;
const NOTIFICATION_BADGE = `${PUBLIC_ORIGIN}/favicon.svg`;

function londonDate() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function dateDifference(target, current) {
  return Math.round((new Date(`${target}T00:00:00Z`).getTime() - new Date(`${current}T00:00:00Z`).getTime()) / 86400000);
}
function publicUrl(path) {
  const clean = String(path || "/").startsWith("/") ? String(path || "/") : `/${String(path || "/")}`;
  return `${PUBLIC_ORIGIN}${clean}`;
}
async function sendEquipmentPush(uid, eventKey, title, body, url) {
  const userRef = db.collection("users").doc(uid);
  const profile = await userRef.get();
  const settings = profile.data()?.notificationSettings || {};
  if (settings.enabled !== true) return 0;
  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  if ((await eventRef.get()).exists) return 0;
  const tokens = (await userRef.collection("notificationTokens").where("enabled", "==", true).get()).docs.filter((doc) => typeof doc.data().token === "string" && doc.data().token);
  await eventRef.set({ type: "equipment-replacement", status: tokens.length ? "sending" : "no-delivery", title, body, url, read: false, createdAt: FieldValue.serverTimestamp() });
  if (!tokens.length) return 0;
  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((doc) => doc.data().token),
      notification: { title, body },
      data: { title, body, eventKey, url, notificationType: "equipment-replacement" },
      webpush: { notification: { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE }, fcmOptions: { link: publicUrl(url) } },
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
exports.sendEquipmentReplacementNotifications = onSchedule({ schedule: "15 9 * * *", timeZone: "Europe/London", region: "europe-west2", memory: "512MiB", timeoutSeconds: 300 }, async () => {
  const today = londonDate();
  let sent = 0;
  const users = await db.collection("users").get();
  for (const userDocument of users.docs) {
    const uid = userDocument.id;
    const settings = userDocument.data()?.notificationSettings || {};
    if (settings.enabled !== true) continue;
    const snakes = await userDocument.ref.collection("snakes").get();
    for (const snakeDocument of snakes.docs) {
      const snake = snakeDocument.data();
      const snakeName = String(snake.name || "your snake");
      const items = snake.enclosure?.equipmentMaintenance;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || item.replacementNotificationsEnabled !== true) continue;
        const baseDate = String(item.lastReplacedDate || item.installedDate || "");
        const interval = Number(item.serviceIntervalDays || 0);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate) || !Number.isFinite(interval) || interval <= 0) continue;
        const dueDate = addDays(baseDate, Math.round(interval));
        const daysRemaining = dateDifference(dueDate, today);
        const leadDays = Math.max(0, Math.min(365, Number(item.reminderLeadDays || 0)));
        const notifyLead = daysRemaining === leadDays && leadDays > 0;
        const notifyDue = daysRemaining === 0;
        const notifyOverdue = daysRemaining === -1;
        if (!notifyLead && !notifyDue && !notifyOverdue) continue;
        const kind = String(item.kind || "Equipment");
        const name = String(item.name || kind);
        const eventKey = `equipment-replacement-${snakeDocument.id}-${String(item.id || name).replace(/[^a-zA-Z0-9_-]/g, "-")}-${dueDate}-${daysRemaining}`;
        const title = notifyDue ? `🔧 Equipment replacement due — ${snakeName}` : notifyOverdue ? `⚠️ Equipment replacement overdue — ${snakeName}` : `🔔 Equipment replacement coming up — ${snakeName}`;
        const body = notifyDue ? `${name} (${kind}) is due for replacement today.` : notifyOverdue ? `${name} (${kind}) was due for replacement yesterday.` : `${name} (${kind}) is due for replacement in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`;
        sent += await sendEquipmentPush(uid, eventKey, title, body, `/snakes/${snakeDocument.id}/enclosure`);
      }
    }
  }
  console.log(`Tiny Titans: equipment replacement notification run complete — sent ${sent} notifications.`);
});
