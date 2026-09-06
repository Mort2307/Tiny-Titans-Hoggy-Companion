const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { NOTIFICATION_ICON, NOTIFICATION_BADGE } = require("./notificationBranding");

const db = getFirestore();
const messaging = getMessaging();
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";
const REMINDER_LIMIT = 500;
const FEEDING_RECONCILE_LIMIT = 500;
const LOCK_MINUTES = 10;

function addCalendarDays(dateKey, days) { const date = new Date(`${dateKey}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function getLocalParts(date, timezone) { const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date); return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])); }
function localDateKey(date, timezone) { const parts = getLocalParts(date, timezone); return `${parts.year}-${parts.month}-${parts.day}`; }
function daysBetween(dateA, dateB) { const a = new Date(`${dateA}T00:00:00Z`).getTime(); const b = new Date(`${dateB}T00:00:00Z`).getTime(); return Math.round((b - a) / 86400000); }
function zonedTimeToUtc(dateKey, time, timezone) { const [year, month, day] = dateKey.split("-").map(Number); const [hour, minute] = time.split(":").map(Number); const desired = Date.UTC(year, month - 1, day, hour, minute, 0); let guess = desired; for (let index = 0; index < 3; index += 1) { const parts = getLocalParts(new Date(guess), timezone); const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)); guess -= localAsUtc - desired; } return new Date(guess); }
function scheduleFor(reminder, occurrenceDate, phase, notificationDateOverride) { const leadStart = reminder.leadUpEnabled === true && Number(reminder.leadUpDays) > 0 ? addCalendarDays(occurrenceDate, -Number(reminder.leadUpDays)) : occurrenceDate; const date = notificationDateOverride || (phase === "lead-up" ? leadStart : occurrenceDate); return zonedTimeToUtc(date, String(reminder.time || "09:00"), String(reminder.timezone || "Europe/London")).toISOString(); }

function reconcileFeedingSchedule(reminder, now = new Date()) {
  const frequencyDays = Math.max(1, Number(reminder.frequencyDays) || 1);
  const timezone = String(reminder.timezone || "Europe/London");
  let occurrenceDate = String(reminder.nextOccurrenceDate || reminder.startDate || "");
  if (!occurrenceDate) return null;
  const today = localDateKey(now, timezone);
  while (occurrenceDate < today) occurrenceDate = addCalendarDays(occurrenceDate, frequencyDays);
  return {
    frequencyDays,
    leadUpEnabled: false,
    leadUpDays: 0,
    occurrenceDate,
    phase: "due",
    notificationDate: occurrenceDate,
    at: scheduleFor({ ...reminder, leadUpEnabled: false, leadUpDays: 0 }, occurrenceDate, "due", occurrenceDate),
  };
}

function advanceSchedule(reminder) {
  const occurrenceDate = String(reminder.nextOccurrenceDate || reminder.startDate || "");
  const timezone = String(reminder.timezone || "Europe/London");
  const frequencyDays = Math.max(1, Number(reminder.frequencyDays) || 1);
  if (reminder.kind === "feeding") {
    const nextOccurrenceDate = addCalendarDays(occurrenceDate, frequencyDays);
    return { occurrenceDate: nextOccurrenceDate, phase: "due", at: scheduleFor({ ...reminder, leadUpEnabled: false, leadUpDays: 0 }, nextOccurrenceDate, "due", nextOccurrenceDate) };
  }
  const leadUpDays = Math.max(1, Math.min(30, Number(reminder.leadUpDays) || 1));
  const phase = reminder.nextPhase === "lead-up" && reminder.leadUpEnabled === true && leadUpDays < frequencyDays ? "lead-up" : "due";
  if (phase === "lead-up") {
    const currentLocalDate = localDateKey(new Date(reminder.nextNotificationAt), timezone);
    const nextLocalDate = addCalendarDays(currentLocalDate, 1);
    const leadStartDate = addCalendarDays(occurrenceDate, -leadUpDays);
    if (nextLocalDate < occurrenceDate) { const safeNextDate = nextLocalDate < leadStartDate ? leadStartDate : nextLocalDate; return { occurrenceDate, phase: "lead-up", at: scheduleFor(reminder, occurrenceDate, "lead-up", safeNextDate) }; }
    return { occurrenceDate, phase: "due", at: scheduleFor(reminder, occurrenceDate, "due") };
  }
  const nextOccurrenceDate = addCalendarDays(occurrenceDate, frequencyDays);
  const nextPhase = reminder.leadUpEnabled === true && leadUpDays < frequencyDays ? "lead-up" : "due";
  return { occurrenceDate: nextOccurrenceDate, phase: nextPhase, at: scheduleFor(reminder, nextOccurrenceDate, nextPhase) };
}

function notificationText(reminder) {
  const title = String(reminder.title || "Tiny Titans reminder").trim() || "Tiny Titans reminder";
  const target = reminder.snakeName ? ` · ${reminder.snakeName}` : "";
  if (reminder.nextPhase === "lead-up") {
    const timezone = String(reminder.timezone || "Europe/London"); const currentDate = localDateKey(new Date(reminder.nextNotificationAt), timezone); const occurrenceDate = String(reminder.nextOccurrenceDate || currentDate); const remainingDays = Math.max(1, daysBetween(currentDate, occurrenceDate));
    return { title: `🔔 ${title}`, body: `${title}${target} is coming up. ${remainingDays} day${remainingDays === 1 ? "" : "s"} to go.`, phase: "coming-up" };
  }
  return { title: `🔔 ${title}`, body: `${title}${target} is due today. Open Tiny Titans when you're ready to take care of it.`, phase: "due" };
}

async function claimReminder(ref, nowIso) { const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString(); return db.runTransaction(async (transaction) => { const snapshot = await transaction.get(ref); if (!snapshot.exists) return null; const current = snapshot.data() || {}; if (current.status !== "active") return null; const nextAt = String(current.nextNotificationAt || ""); if (!nextAt || nextAt > nowIso) return null; if (current.lockedUntil && String(current.lockedUntil) > nowIso) return null; transaction.update(ref, { lockedUntil: lockUntil, updatedAt: FieldValue.serverTimestamp() }); return { id: snapshot.id, ...current }; }); }

async function sendReminderPush(uid, reminderId, reminder) {
  const userRef = db.collection("users").doc(uid); const userSnapshot = await userRef.get(); const settings = userSnapshot.data()?.notificationSettings || {}; if (settings.enabled !== true) return { sent: 0, invalid: 0, skipped: "disabled" };
  const tokensSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get(); const tokenDocs = tokensSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0); const text = notificationText(reminder); if (!tokenDocs.length) return { sent: 0, invalid: 0, skipped: "no-device", text };
  const eventKey = `reminder-${reminderId}-${String(reminder.nextOccurrenceDate)}-${String(reminder.nextPhase || "due")}`.replace(/[^a-zA-Z0-9_-]/g, "-"); const eventRef = userRef.collection("notificationEvents").doc(eventKey); const existing = await eventRef.get(); if (existing.exists) return { sent: 0, invalid: 0, duplicate: true, text };
  const url = reminder.kind === "weight" && reminder.snakeId ? `/weights/${reminder.snakeId}` : reminder.kind === "feeding" && reminder.snakeId ? `/feeding/${reminder.snakeId}` : reminder.kind === "shedding" && reminder.snakeId ? `/shedding/${reminder.snakeId}` : reminder.kind === "health" && reminder.snakeId ? `/health/${reminder.snakeId}` : reminder.kind === "husbandry" && reminder.snakeId ? `/husbandry/${reminder.snakeId}` : "/reminders";
  await eventRef.set({ type: "reminder", reminderId, phase: reminder.nextPhase || "due", title: text.title, body: text.body, url, read: false, createdAt: FieldValue.serverTimestamp() });
  let sent = 0; let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) { const batch = tokenDocs.slice(index, index + 500); const response = await messaging.sendEachForMulticast({ tokens: batch.map((item) => item.data().token), notification: { title: text.title, body: text.body }, data: { title: text.title, body: text.body, eventKey, url, notificationType: "reminder", reminderId }, webpush: { fcmOptions: { link: `${PUBLIC_ORIGIN}${url}` }, notification: { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE, tag: eventKey } } }); sent += response.successCount; invalid += response.failureCount; await Promise.all(response.responses.map(async (result, responseIndex) => { const code = result.error?.code || ""; if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete(); })); }
  await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, sentAt: FieldValue.serverTimestamp() }, { merge: true }); return { sent, invalid, text };
}

async function reconcileActiveFeedingReminders(now) {
  const snapshot = await db.collectionGroup("reminders").where("kind", "==", "feeding").limit(FEEDING_RECONCILE_LIMIT).get();
  let reconciled = 0;
  for (const document of snapshot.docs) {
    const data = document.data() || {};
    if (data.status !== "active") continue;
    const schedule = reconcileFeedingSchedule(data, now);
    if (!schedule) continue;
    const storedOccurrence = String(data.nextOccurrenceDate || data.startDate || "");
    const storedPhase = String(data.nextPhase || "");
    const storedAt = String(data.nextNotificationAt || "");
    const needsUpdate = storedOccurrence !== schedule.occurrenceDate || storedPhase !== schedule.phase || storedAt !== schedule.at || Number(data.leadUpDays) !== schedule.leadUpDays || data.leadUpEnabled !== schedule.leadUpEnabled;
    if (!needsUpdate) continue;
    await document.ref.update({ frequencyDays: schedule.frequencyDays, leadUpEnabled: false, leadUpDays: 0, nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: "due", lockedUntil: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
    reconciled += 1;
  }
  return { matched: snapshot.size, reconciled };
}

exports.runRecurringReminderEngine = onSchedule({ schedule: "*/15 * * * *", timeZone: "UTC", region: "europe-west2", memory: "512MiB", timeoutSeconds: 300 }, async () => {
  const now = new Date(); const nowIso = now.toISOString();
  const reconciliation = await reconcileActiveFeedingReminders(now);
  const snapshot = await db.collectionGroup("reminders").where("nextNotificationAt", "<=", nowIso).limit(REMINDER_LIMIT).get();
  let processed = 0; let sent = 0; let failed = 0;
  for (const document of snapshot.docs) {
    const data = document.data() || {}; if (data.status !== "active") continue;
    const segments = document.ref.path.split("/"); const usersIndex = segments.indexOf("users"); const uid = usersIndex >= 0 ? segments[usersIndex + 1] : ""; if (!uid) continue;
    const claimed = await claimReminder(document.ref, nowIso); if (!claimed) continue; processed += 1;
    try { const result = await sendReminderPush(uid, document.id, claimed); sent += result.sent || 0; const next = advanceSchedule(claimed); await document.ref.update({ nextNotificationAt: next.at, nextOccurrenceDate: next.occurrenceDate, nextPhase: next.phase, lastNotifiedAt: nowIso, lockedUntil: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), lastDeliveryStatus: result.skipped || (result.sent > 0 ? "sent" : "no-delivery") }); }
    catch (error) { failed += 1; console.error("Tiny Titans: recurring reminder failed", { path: document.ref.path, error }); await document.ref.update({ lockedUntil: FieldValue.delete(), lastDeliveryStatus: "failed", lastDeliveryError: error?.message || "Reminder delivery failed.", updatedAt: FieldValue.serverTimestamp() }); }
  }
  console.log("Tiny Titans reminder engine run", { matched: snapshot.size, processed, sent, failed, feedingReconciliation: reconciliation });
});
