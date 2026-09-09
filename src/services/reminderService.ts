import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { Reminder, ReminderInput, ReminderKind } from "../types/Reminder";

function remindersCollection(uid: string) { return collection(db, "users", uid, "reminders"); }

function addCalendarDays(dateKey: string, days: number): string {
  const value = new Date(`${dateKey}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function localDateKey(date: Date, timezone: string): string {
  const parts = localParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zonedTimeToUtc(dateKey: string, time: string, timezone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let index = 0; index < 3; index += 1) {
    const parts = localParts(new Date(guess), timezone);
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    guess -= asUtc - desired;
  }
  return new Date(guess);
}

function nextSchedule(input: ReminderInput, occurrenceDate: string, phase: "lead-up" | "due", notificationDateOverride?: string) {
  const leadStart = input.leadUpEnabled && input.leadUpDays > 0 ? addCalendarDays(occurrenceDate, -input.leadUpDays) : occurrenceDate;
  const notificationDate = notificationDateOverride || (phase === "lead-up" ? leadStart : occurrenceDate);
  return { occurrenceDate, phase, at: zonedTimeToUtc(notificationDate, input.time, input.timezone).toISOString() };
}

function normaliseRecurringReminder(reminder: Reminder, now: Date): Reminder {
  if (reminder.status !== "active") return reminder;

  const frequencyDays = Math.max(1, Math.min(3650, Math.round(Number(reminder.frequencyDays) || 1)));
  const timezone = reminder.timezone || "Europe/London";
  const input: ReminderInput = {
    ...reminder,
    frequencyDays,
    timezone,
    status: "active",
    leadUpEnabled: reminder.kind === "feeding" ? false : Boolean(reminder.leadUpEnabled) && frequencyDays > 1,
    leadUpDays: reminder.kind === "feeding" ? 0 : Math.min(Math.max(1, Math.round(Number(reminder.leadUpDays) || 1)), Math.min(30, frequencyDays - 1)),
  };

  let occurrenceDate = reminder.nextOccurrenceDate || reminder.startDate;
  let phase: "lead-up" | "due" = reminder.nextPhase || "due";
  if (!occurrenceDate) return reminder;

  const today = localDateKey(now, timezone);

  // A reminder due today remains visible as today's due/overdue item until it
  // is completed. Older missed occurrences are rolled forward to the next cycle.
  if (occurrenceDate === today && phase === "due") {
    const schedule = nextSchedule(input, occurrenceDate, phase);
    return { ...reminder, ...input, nextOccurrenceDate: occurrenceDate, nextPhase: phase, nextNotificationAt: schedule.at };
  }

  for (let guard = 0; guard < 10000; guard += 1) {
    const schedule = nextSchedule(input, occurrenceDate, phase);
    if (occurrenceDate === today && phase === "due") {
      return { ...reminder, ...input, nextOccurrenceDate: occurrenceDate, nextPhase: phase, nextNotificationAt: schedule.at };
    }
    if (occurrenceDate > today && schedule.at && new Date(schedule.at).getTime() > now.getTime()) {
      return { ...reminder, ...input, nextOccurrenceDate: occurrenceDate, nextPhase: phase, nextNotificationAt: schedule.at };
    }
    if (occurrenceDate === today && phase === "lead-up") {
      phase = "due";
      continue;
    }
    occurrenceDate = addCalendarDays(occurrenceDate, frequencyDays);
    phase = input.leadUpEnabled ? "lead-up" : "due";
  }

  return reminder;
}

export function feedingReminderSchedule(input: Pick<ReminderInput, "kind" | "frequencyDays" | "startDate" | "time" | "timezone">, now = new Date()) {
  const frequencyDays = Math.max(1, Math.min(3650, Math.round(Number(input.frequencyDays) || 1)));
  const timezone = input.timezone || "Europe/London";
  let occurrenceDate = input.startDate;
  if (!occurrenceDate) return null;
  const today = localDateKey(now, timezone);
  while (occurrenceDate < today) occurrenceDate = addCalendarDays(occurrenceDate, frequencyDays);
  return {
    occurrenceDate,
    phase: occurrenceDate === today ? "due" as const : "due" as const,
    notificationDate: occurrenceDate,
    at: zonedTimeToUtc(occurrenceDate, input.time || "09:00", timezone).toISOString(),
    leadUpEnabled: false,
    leadUpDays: 0,
  };
}

function legacyFlagFor(kind: ReminderKind): string | null {
  return ({ weight: "weightRemindersEnabled", feeding: "feedingRemindersEnabled", shedding: "shedRemindersEnabled", health: "healthRemindersEnabled", husbandry: null, custom: null } as Record<ReminderKind, string | null>)[kind];
}

async function handOffLegacyStream(uid: string, kind: ReminderKind) {
  const field = legacyFlagFor(kind);
  if (!field) return;
  await setDoc(doc(db, "users", uid), { notificationSettings: { [field]: false }, updatedAt: serverTimestamp() }, { merge: true });
}

export function defaultReminderInput(kind: ReminderKind, snakeId: string | null = null): ReminderInput {
  const definition = ({ weight: "Weight check", feeding: "Feeding check", shedding: "Shed check", health: "Health check", husbandry: "Husbandry check", custom: "Custom reminder" } as Record<ReminderKind, string>)[kind];
  const now = new Date();
  const startDate = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const requestedSnakeId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("snakeId") : null;
  const selectedSnakeId = snakeId ?? requestedSnakeId;
  return { kind, title: definition, description: "", snakeId: selectedSnakeId, snakeName: null, frequencyDays: 7, time: "09:00", startDate, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London", leadUpEnabled: false, leadUpDays: 1, status: "active" };
}

function withSchedule(input: ReminderInput): Omit<Reminder, "id" | "createdAt" | "updatedAt"> {
  const frequencyDays = Math.max(1, Math.min(3650, Math.round(Number(input.frequencyDays) || 1)));
  const feedingSchedule = input.kind === "feeding" ? feedingReminderSchedule({ ...input, frequencyDays }) : null;
  const leadUpEnabled = input.kind === "feeding" ? false : Boolean(input.leadUpEnabled) && frequencyDays > 1;
  const leadUpDays = input.kind === "feeding" ? 0 : Math.min(Math.max(1, Math.round(Number(input.leadUpDays) || 1)), Math.min(30, frequencyDays - 1));
  const safeInput = { ...input, frequencyDays, leadUpEnabled, leadUpDays };
  if (input.kind === "feeding" && feedingSchedule) {
    return { ...safeInput, nextNotificationAt: feedingSchedule.at, nextOccurrenceDate: feedingSchedule.occurrenceDate, nextPhase: "due", lastNotifiedAt: null, lastCompletedAt: null };
  }
  const schedule = nextSchedule(safeInput, input.startDate, leadUpEnabled ? "lead-up" : "due");
  return { ...safeInput, frequencyDays, leadUpEnabled, leadUpDays, nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: schedule.phase, lastNotifiedAt: null, lastCompletedAt: null };
}

export async function listReminders(uid: string): Promise<Reminder[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(remindersCollection(uid), orderBy("nextNotificationAt", "asc")));
  const now = new Date();
  return snapshot.docs
    .map((item) => ({ id: item.id, ...(item.data() as Omit<Reminder, "id">) }))
    .map((reminder) => normaliseRecurringReminder(reminder, now))
    .sort((a, b) => new Date(a.nextNotificationAt).getTime() - new Date(b.nextNotificationAt).getTime());
}

export async function getNextActiveFeedingReminder(uid: string, snakeId: string): Promise<Reminder | null> {
  if (!uid || !snakeId) return null;
  const reminders = await listReminders(uid);
  return reminders.find((reminder) => reminder.kind === "feeding" && reminder.status === "active" && reminder.snakeId === snakeId) ?? null;
}

export async function getFeedingReminderConfirmation(uid: string, snakeId: string): Promise<{ snakeName: string; nextDate: string; daysUntil: number; message: string; url: string } | null> {
  const reminder = await getNextActiveFeedingReminder(uid, snakeId);
  if (!reminder?.nextOccurrenceDate) return null;
  const timezone = reminder.timezone || "Europe/London";
  const today = localDateKey(new Date(), timezone);
  const nextDate = reminder.nextOccurrenceDate;
  const daysUntil = Math.round((new Date(`${nextDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
  const [year, month, day] = nextDate.split("-");
  const formattedDate = `${day}/${month}/${year}`;
  const dayLabel = daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
  return {
    snakeName: reminder.snakeName || "your snake",
    nextDate,
    daysUntil,
    message: `Your feed reminder is ${dayLabel} — ${formattedDate}.`,
    url: `/reminders/feeding?snakeId=${encodeURIComponent(snakeId)}`,
  };
}

export async function reanchorFeedingRemindersAfterFeed(uid: string, snakeId: string): Promise<void> {
  if (!uid || !snakeId) return;
  const [reminders, feedingsSnapshot] = await Promise.all([
    listReminders(uid),
    getDocs(query(collection(db, "users", uid, "snakes", snakeId, "feedings"), orderBy("date", "desc"))),
  ]);
  const latest = feedingsSnapshot.docs.map((item) => item.data().date).find((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (!latest) return;
  const matching = reminders.filter((reminder) => reminder.kind === "feeding" && reminder.status === "active" && reminder.snakeId === snakeId);
  await Promise.all(matching.map((reminder) => {
    const frequencyDays = Math.max(1, Math.min(3650, Math.round(Number(reminder.frequencyDays) || 1)));
    const nextDate = addCalendarDays(latest, frequencyDays);
    const at = zonedTimeToUtc(nextDate, reminder.time || "09:00", reminder.timezone || "Europe/London").toISOString();
    return updateDoc(doc(db, "users", uid, "reminders", reminder.id), { nextNotificationAt: at, nextOccurrenceDate: nextDate, nextPhase: "due", leadUpEnabled: false, leadUpDays: 0, lockedUntil: null, updatedAt: serverTimestamp() });
  }));
}

export async function createReminder(uid: string, input: ReminderInput): Promise<Reminder> {
  if (!uid) throw new Error("You must be signed in to create a reminder.");
  const ref = doc(remindersCollection(uid));
  const next = withSchedule(input);
  await setDoc(ref, { ...next, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await handOffLegacyStream(uid, input.kind);
  if (input.kind === "feeding" && input.snakeId) await reanchorFeedingRemindersAfterFeed(uid, input.snakeId);
  return { id: ref.id, ...next };
}

export async function updateReminder(uid: string, reminderId: string, input: ReminderInput): Promise<void> {
  if (!uid || !reminderId) throw new Error("A valid reminder is required.");
  const next = withSchedule(input);
  await updateDoc(doc(db, "users", uid, "reminders", reminderId), { ...next, updatedAt: serverTimestamp() });
  await handOffLegacyStream(uid, input.kind);
  if (input.kind === "feeding" && input.snakeId) await reanchorFeedingRemindersAfterFeed(uid, input.snakeId);
}

export async function setReminderPaused(uid: string, reminder: Reminder, paused: boolean): Promise<void> {
  const ref = doc(db, "users", uid, "reminders", reminder.id);
  if (paused) { await updateDoc(ref, { status: "paused", lockedUntil: null, updatedAt: serverTimestamp() }); return; }
  if (reminder.kind === "feeding") {
    const schedule = feedingReminderSchedule({ ...reminder, kind: "feeding" });
    if (!schedule) throw new Error("This feeding reminder has no due date.");
    await updateDoc(ref, { status: "active", frequencyDays: Math.max(1, Math.min(3650, Math.round(Number(reminder.frequencyDays) || 1))), leadUpEnabled: false, leadUpDays: 0, nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: "due", lockedUntil: null, updatedAt: serverTimestamp() });
    return;
  }
  const input: ReminderInput = { ...reminder, status: "active", leadUpEnabled: reminder.leadUpEnabled && reminder.frequencyDays > 1 };
  let occurrenceDate = reminder.nextOccurrenceDate || reminder.startDate;
  let phase = reminder.nextPhase || "due";
  let schedule = nextSchedule(input, occurrenceDate, phase);
  if (new Date(schedule.at).getTime() <= Date.now()) {
    occurrenceDate = addCalendarDays(occurrenceDate, Math.max(1, reminder.frequencyDays));
    phase = input.leadUpEnabled ? "lead-up" : "due";
    schedule = nextSchedule(input, occurrenceDate, phase);
  }
  await updateDoc(ref, { status: "active", nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: schedule.phase, lockedUntil: null, updatedAt: serverTimestamp() });
}

export async function deleteReminder(uid: string, reminderId: string): Promise<void> {
  if (!uid || !reminderId) throw new Error("A valid reminder is required.");
  await deleteDoc(doc(db, "users", uid, "reminders", reminderId));
}
