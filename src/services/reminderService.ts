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

function nextSchedule(input: ReminderInput, occurrenceDate: string, phase: "lead-up" | "due") {
  const leadStart = input.leadUpEnabled && input.leadUpDays > 0 ? addCalendarDays(occurrenceDate, -input.leadUpDays) : occurrenceDate;
  const notificationDate = phase === "lead-up" ? leadStart : occurrenceDate;
  return { occurrenceDate, phase, at: zonedTimeToUtc(notificationDate, input.time, input.timezone).toISOString() };
}

export function defaultReminderInput(kind: ReminderKind, snakeId: string | null = null): ReminderInput {
  const definition = ({ weight: "Weight check", feeding: "Feeding check", shedding: "Shed check", health: "Health check", husbandry: "Husbandry check", custom: "Custom reminder" } as Record<ReminderKind, string>)[kind];
  const now = new Date();
  const startDate = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return { kind, title: definition, description: "", snakeId, snakeName: null, frequencyDays: 7, time: "09:00", startDate, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London", leadUpEnabled: false, leadUpDays: 1, status: "active" };
}

function withSchedule(input: ReminderInput): Omit<Reminder, "id" | "createdAt" | "updatedAt"> {
  const frequencyDays = Math.max(1, Math.min(3650, Math.round(Number(input.frequencyDays) || 1)));
  const leadUpDays = Math.max(1, Math.min(30, Math.round(Number(input.leadUpDays) || 1)));
  const safeInput = { ...input, frequencyDays, leadUpDays };
  const schedule = nextSchedule(safeInput, input.startDate, input.leadUpEnabled && leadUpDays > 0 ? "lead-up" : "due");
  return { ...safeInput, frequencyDays, leadUpDays, nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: schedule.phase, lastNotifiedAt: null, lastCompletedAt: null };
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
  return { id: ref.id, ...next };
}

export async function updateReminder(uid: string, reminderId: string, input: ReminderInput): Promise<void> {
  if (!uid || !reminderId) throw new Error("A valid reminder is required.");
  const next = withSchedule(input);
  await updateDoc(doc(db, "users", uid, "reminders", reminderId), { ...next, updatedAt: serverTimestamp() });
}

export async function setReminderPaused(uid: string, reminder: Reminder, paused: boolean): Promise<void> {
  const ref = doc(db, "users", uid, "reminders", reminder.id);
  if (paused) { await updateDoc(ref, { status: "paused", updatedAt: serverTimestamp() }); return; }
  const input: ReminderInput = { ...reminder, status: "active" };
  const schedule = nextSchedule(input, reminder.nextOccurrenceDate || reminder.startDate, reminder.nextPhase || "due");
  await updateDoc(ref, { status: "active", nextNotificationAt: schedule.at, nextOccurrenceDate: schedule.occurrenceDate, nextPhase: schedule.phase, updatedAt: serverTimestamp() });
}

export async function deleteReminder(uid: string, reminderId: string): Promise<void> {
  if (!uid || !reminderId) throw new Error("A valid reminder is required.");
  await deleteDoc(doc(db, "users", uid, "reminders", reminderId));
}
