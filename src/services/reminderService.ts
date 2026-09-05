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

export function feedingReminderSchedule(input: Pick<ReminderInput, "kind" | "frequencyDays" | "startDate" | "time" | "timezone">, now = new Date()) {
  const frequencyDays = Math.max(1, Math.min(3650, Math.round(Number(input.frequencyDays) || 1)));
  const timezone = input.timezone || "Europe/London";
  let occurrenceDate = input.startDate;
  if (!occurrenceDate) return null;
  const today = localDateKey(now, timezone);
  while (occurrenceDate < today) occurrenceDate = addCalendarDays(occurrenceDate, frequencyDays);
  const dueToday = occurrenceDate === today;
  const leadStart = addCalendarDays(occurrenceDate, -(frequencyDays - 1));
  const notificationDate = today >= leadStart ? today : leadStart;
  return { occurrenceDate, phase: dueToday ? "due" as const : "lead-up" as const, notificationDate, at: zonedTimeToUtc(notificationDate, input.time || "09:00", timezone).toISOString(), leadUpEnabled: frequencyDays > 1, leadUpDays: Math.max(0, frequencyDays - 1) };
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
  const leadUpEnabled = input.kind === "feeding" ? Boolean(feedingSchedule?.leadUpEnabled) : Boolean(input.leadUpEnabled) && frequencyDays > 1;
  const leadUpDays = input.kind === "feeding" ? Math.max(0, frequencyDays - 1) : Math.min(Math.max(1, Math.round(Number(input.leadUpDays) || 1)), Math.min(30, frequencyDays - 1));
  const safeInput = { ...input, frequencyDays, leadUpEnabled, leadUpDays };
  if (input.kind === "feeding" && feedingSchedule) {
    return { ...safeInput, nextNotificationAt: feedingSchedule.at, nextOccurrenceDate: feedingSchedule.occurrenceDate, nextPhase: feedingSchedule.phase, lastNotifiedAt: null, lastCompletedAt: null };
  }
  const schedule = nextSchedule(safeInput, input.startDate, leadUpEnabled ? "lead-up" : "due");
  return { ...safeInput, frequencyDays, leadUpEnabled, leadUpDays, nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: schedule.phase, lastNotifiedAt: null, lastCompletedAt: null };
}

export async function listReminders(uid: string): Promise<Reminder[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(remindersCollection(uid), orderBy("nextNotificationAt", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Reminder, "id">) }));
}

export async function createReminder(uid: string, input: ReminderInput): Promise<Reminder> {
  if (!uid) throw new Error("You must be signed in to create a reminder.");
  const ref = doc(remindersCollection(uid));
  const next = withSchedule(input);
  await setDoc(ref, { ...next, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await handOffLegacyStream(uid, input.kind);
  return { id: ref.id, ...next };
}

export async function updateReminder(uid: string, reminderId: string, input: ReminderInput): Promise<void> {
  if (!uid || !reminderId) throw new Error("A valid reminder is required.");
  const next = withSchedule(input);
  await updateDoc(doc(db, "users", uid, "reminders", reminderId), { ...next, updatedAt: serverTimestamp() });
  await handOffLegacyStream(uid, input.kind);
}

export async function setReminderPaused(uid: string, reminder: Reminder, paused: boolean): Promise<void> {
  const ref = doc(db, "users", uid, "reminders", reminder.id);
  if (paused) { await updateDoc(ref, { status: "paused", lockedUntil: null, updatedAt: serverTimestamp() }); return; }
  if (reminder.kind === "feeding") {
    const schedule = feedingReminderSchedule({ ...reminder, kind: "feeding" });
    if (!schedule) throw new Error("This feeding reminder has no due date.");
    await updateDoc(ref, { status: "active", frequencyDays: Math.max(1, Math.min(3650, Math.round(Number(reminder.frequencyDays) || 1))), leadUpEnabled: schedule.leadUpEnabled, leadUpDays: schedule.leadUpDays, nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: schedule.phase, lockedUntil: null, updatedAt: serverTimestamp() });
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
