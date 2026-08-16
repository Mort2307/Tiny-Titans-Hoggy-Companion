import { collection, deleteDoc, doc, getDocs, query, setDoc, where, Timestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import type { ReminderRecord } from "../types/Notifications";

export const DEFAULT_NOTIFICATION_SETTINGS = {
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

export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function localDateTime(date: string, time: string): Date {
  const result = new Date(`${date}T${time}:00`);
  if (Number.isNaN(result.getTime())) throw new Error("Invalid reminder date or time.");
  return result;
}

function shiftDate(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function reminderId(sequenceId: string, stage: string): string {
  return `${sequenceId}-${stage}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildFeedingReminderSequence(input: {
  uid: string;
  snakeId: string;
  snakeName: string;
  feedingDate: string;
  feedingTime: string;
  preparationReminderTime?: string;
  timezone?: string;
  tMinus2Enabled?: boolean;
  tMinus1Enabled?: boolean;
  feedingDayEnabled?: boolean;
}): ReminderRecord[] {
  const timezone = input.timezone || getLocalTimezone();
  const sequenceId = `feeding-${input.snakeId}-${input.feedingDate}`;
  const preparationTime = input.preparationReminderTime || input.feedingTime;
  const records: ReminderRecord[] = [];

  if (input.tMinus2Enabled !== false) {
    const date = shiftDate(input.feedingDate, -2);
    records.push({ id: reminderId(sequenceId, "t-2"), uid: input.uid, type: "feeding", stage: "t-2", status: "scheduled", snakeId: input.snakeId, snakeName: input.snakeName, title: `🐍 ${input.snakeName} feeding in 2 days`, body: `${input.snakeName}'s feeding day is in 2 days. Make sure you have the correct feed in stock and ready.`, deepLink: `/feeding/${input.snakeId}`, scheduledFor: Timestamp.fromDate(localDateTime(date, preparationTime)), timezone, sequenceId, sequenceDate: input.feedingDate, sequenceOffsetDays: -2, respectQuietHours: true });
  }
  if (input.tMinus1Enabled !== false) {
    const date = shiftDate(input.feedingDate, -1);
    records.push({ id: reminderId(sequenceId, "t-1"), uid: input.uid, type: "feeding", stage: "t-1", status: "scheduled", snakeId: input.snakeId, snakeName: input.snakeName, title: `🐍 ${input.snakeName} feeding tomorrow`, body: `${input.snakeName}'s feeding is tomorrow. Make sure the feed is thoroughly defrosted and kept chilled safely until use.`, deepLink: `/feeding/${input.snakeId}`, scheduledFor: Timestamp.fromDate(localDateTime(date, preparationTime)), timezone, sequenceId, sequenceDate: input.feedingDate, sequenceOffsetDays: -1, respectQuietHours: true });
  }
  if (input.feedingDayEnabled !== false) {
    records.push({ id: reminderId(sequenceId, "day"), uid: input.uid, type: "feeding", stage: "day", status: "scheduled", snakeId: input.snakeId, snakeName: input.snakeName, title: `🐍 ${input.snakeName} feeding day`, body: `Today is ${input.snakeName}'s feeding day. Your chosen feeding time is ${input.feedingTime}. Warm the feed appropriately before offering: approximately 35–37°C (95–98.6°F).`, deepLink: `/feeding/${input.snakeId}`, scheduledFor: Timestamp.fromDate(localDateTime(input.feedingDate, input.feedingTime)), timezone, sequenceId, sequenceDate: input.feedingDate, sequenceOffsetDays: 0, respectQuietHours: true });
  }
  return records;
}

export async function replaceFeedingReminderSequence(uid: string, input: Parameters<typeof buildFeedingReminderSequence>[0]): Promise<void> {
  const reminders = collection(db, "users", uid, "reminders");
  const existing = await getDocs(query(reminders, where("type", "==", "feeding"), where("snakeId", "==", input.snakeId), where("status", "in", ["scheduled", "failed"])));
  await Promise.all(existing.docs.map((item) => deleteDoc(item.ref)));
  const sequence = buildFeedingReminderSequence(input);
  await Promise.all(sequence.map((item) => setDoc(doc(reminders, item.id), { ...item, scheduledFor: item.scheduledFor, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })));
}

export async function cancelReminderSequence(uid: string, sequenceId: string): Promise<void> {
  const reminders = collection(db, "users", uid, "reminders");
  const existing = await getDocs(query(reminders, where("sequenceId", "==", sequenceId), where("status", "==", "scheduled")));
  await Promise.all(existing.docs.map((item) => deleteDoc(item.ref)));
}

export async function markReminderCompleted(uid: string, reminderId: string): Promise<void> {
  await setDoc(doc(db, "users", uid, "reminders", reminderId), { status: "completed", completedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
}
