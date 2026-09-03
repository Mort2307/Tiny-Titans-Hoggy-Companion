const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { NOTIFICATION_ICON, NOTIFICATION_BADGE } = require("./notificationBranding");

const db = getFirestore();
const messaging = getMessaging();
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";
const REMINDER_LIMIT = 500;
const LOCK_MINUTES = 10;

function addCalendarDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getLocalParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function zonedTimeToUtc(dateKey, time, timezone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let index = 0; index < 3; index += 1) {
    const parts = getLocalParts(new Date(guess), timezone);
    const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    guess -= localAsUtc - desired;
  }
  return new Date(guess);
}

function scheduleFor(reminder, occurrenceDate, phase) {
  const leadStart = reminder.leadUpEnabled === true && Number(reminder.leadUpDays) > 0 ? addCalendarDays(occurrenceDate, -Number(reminder.leadUpDays)) : occurrenceDate;
  const date = phase === "lead-up" ? leadStart : occurrenceDate;
  return zonedTimeToUtc(date, String(reminder.time || "09:00"), String(reminder.timezone || "Europe/London")).toISOString();
}

function firstSchedule(reminder) {
  const occurrenceDate = String(reminder.nextOccurrenceDate || reminder.startDate || "").trim();
  const phase = reminder.leadUpEnabled === true && Number(reminder.leadUpDays) > 0 ? "lead-up" : "due";
  return { at: scheduleFor(reminder, occurrenceDate, phase), occurrenceDate, phase };
}

function advanceSchedule(reminder) {
  const occurrenceDate = String(reminder.nextOccurrenceDate || reminder.startDate || "");
  const phase = reminder.nextPhase === "lead-up" && reminder.leadUpEnabled === true && Number(reminder.leadUpDays) > 0 ? "lead-up" : "due";
  if (phase === "lead-up") {
    const leadStart = addCalendarDays(occurrenceDate, -Number(reminder.leadUpDays));
    const currentLeadDate = String(reminder.nextNotificationAt || "").slice(0, 10);
    const nextLeadDate = addCalendarDays(currentLeadDate || leadStart, 1);
    const occurrenceLeadStart = addCalendarDays(occurrenceDate, -Number(reminder.leadUpDays));
    if (nextLeadDate < occurrenceDate) return { occurrenceDate, phase: "lead-up", at: scheduleFor(reminder, occurrenceDate, "lead-up") .replace(/^.*$/, zonedTimeToUtc(nextLeadDate, String(reminder.time || "09:00"), String(reminder.timezone || "Europe/London")).toISOString()) };
    return { occurrenceDate, phase: "due", at: scheduleFor(reminder, occurrenceDate, "due"), _unused: occurrenceLeadStart };
  }
  const nextOccurrenceDate = addCalendarDays(occurrenceDate, Math.max(1, Number(reminder.frequencyDays) || 1));
  const nextPhase = reminder.leadUpEnabled === true && Number(reminder.leadUpDays) > 0 ? "lead-up" : "due";
  return { occurrenceDate: nextOccurrenceDate, phase: nextPhase, at: scheduleFor({ ...reminder, nextOccurrenceDate }, nextOccurrenceDate, nextPhase) };
}

function notificationText(reminder) {
  const title = String(reminder.title || "Tiny Titans reminder").trim() || "Tiny Titans reminder";
  const target = reminder.snakeName ? ` · ${reminder.snakeName}` : "";
  const phase = reminder.nextPhase === "lead-up" ? "coming up" : "due today";
  const body = reminder.nextPhase === "lead-up" ? `${title}${target} is coming up. Your scheduled reminder is in ${Math.max(1, Number(reminder.leadUpDays) || 1)} day${Number(reminder.leadUpDays) === 1 ? "" : "s"}.` : `${title}${target} is due now. Open Tiny Titans when you're ready to take care of it.`;
  return { title: `🔔 ${title}`, body, phase };
}

async function claimReminder(ref, data, nowIso) {
  const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const current = snapshot.data() || {};
    if (current.status !== "active") return null;
    const nextAt = String(current.nextNotificationAt || "");
    if (!nextAt || nextAt > nowIso) return null;
    if (current.lockedUntil && String(current.lockedUntil) > nowIso) return null;
    transaction.update(ref, { lockedUntil: lockUntil, updatedAt: FieldValue.serverTimestamp() });
    return { id: snapshot.id, ...current };
  });
}

async function sendReminderPush(uid, reminderId, reminder) {
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();
  const settings = userSnapshot.data()?.notificationSettings || {};
  if (settings.enabled !== true) return { sent: 0, invalid: 0, skipped: "disabled" };
  const tokensSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokensSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  const text = notificationText(reminder);
  if (!tokenDocs.length) return { sent: 0, invalid: 0, skipped: "no-device", text };
  const eventKey = `reminder-${reminderId}-${String(reminder.nextOccurrenceDate)}-${String(reminder.nextPhase || "due")}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  const existing = await eventRef.get();
  if (existing.exists) return { sent: 0, invalid: 0, duplicate: true, text };
  const url = reminder.kind === "weight" && reminder.snakeId ? `/weights/${reminder.snakeId}` : reminder.kind === "feeding" && reminder.snakeId ? `/feeding/${reminder.snakeId}` : reminder.kind === "shedding" && reminder.snakeId ? `/shedding/${reminder.snakeId}` : reminder.kind === "health" && reminder.snakeId ? `/health/${reminder.snakeId}` : "/reminders";
  await eventRef.set({ type: "reminder", reminderId, phase: reminder.nextPhase || "due", title: text.title, body: text.body, url, read: false, createdAt: FieldValue.serverTimestamp() });
  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.data().token),
      notification: { title: text.title, body: text.body },
      data: { title: text.title, body: text.body, eventKey, url, notificationType: "reminder", reminderId },
      webpush: { fcmOptions: { link: `${PUBLIC_ORIGIN}${url}` }, notification: { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE, tag: eventKey } },
    });
    sent += response.successCount;
    invalid += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete();
    }));
  }
  await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, sentAt: FieldValue.serverTimestamp() }, { merge: true });
  return { sent, invalid, text };
}

exports.runRecurringReminderEngine = onSchedule({ schedule: "*/15 * * * *", timeZone: "UTC", region: "europe-west2", memory: "512MiB", timeoutSeconds: 300 }, async () => {
  const nowIso = new Date().toISOString();
  const snapshot = await db.collectionGroup("reminders").where("nextNotificationAt", "<=", nowIso).limit(REMINDER_LIMIT).get();
  let processed = 0;
  let sent = 0;
  let failed = 0;
  for (const document of snapshot.docs) {
    const data = document.data() || {};
    if (data.status !== "active") continue;
    const segments = document.ref.path.split("/");
    const usersIndex = segments.indexOf("users");
    const uid = usersIndex >= 0 ? segments[usersIndex + 1] : "";
    if (!uid) continue;
    const claimed = await claimReminder(document.ref, data, nowIso);
    if (!claimed) continue;
    processed += 1;
    try {
      const result = await sendReminderPush(uid, document.id, claimed);
      sent += result.sent || 0;
      const next = advanceSchedule(claimed);
      await document.ref.update({ nextNotificationAt: next.at, nextOccurrenceDate: next.occurrenceDate, nextPhase: next.phase, lastNotifiedAt: nowIso, lockedUntil: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), lastDeliveryStatus: result.skipped || (result.sent > 0 ? "sent" : "no-delivery") });
    } catch (error) {
      failed += 1;
      console.error("Tiny Titans: recurring reminder failed", { path: document.ref.path, error });
      await document.ref.update({ lockedUntil: FieldValue.delete(), lastDeliveryStatus: "failed", lastDeliveryError: error?.message || "Reminder delivery failed.", updatedAt: FieldValue.serverTimestamp() });
    }
  }
  console.log("Tiny Titans reminder engine run", { matched: snapshot.size, processed, sent, failed });
});
