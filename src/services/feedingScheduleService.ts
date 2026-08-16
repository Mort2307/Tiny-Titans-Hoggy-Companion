import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { FeedingSchedule } from "../types/Snake";

const DEFAULT_INTERVAL_DAYS = 14;
const DEFAULT_PREPARATION_DAYS = 2;
const DEFAULT_PREPARATION_TIME = "08:00";

function addDays(dateString: string, days: number): string {
  const base = new Date(`${dateString}T00:00:00Z`);
  const date = Number.isNaN(base.getTime()) ? new Date() : base;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normaliseTime(value: unknown, fallback = DEFAULT_PREPARATION_TIME): string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function normalisePreparationDays(value: unknown, fallback = DEFAULT_PREPARATION_DAYS): number {
  const days = Number(value);
  return Number.isFinite(days) && days >= 0 && days <= 30 ? Math.round(days) : fallback;
}

export function getDefaultNextFeedingDate(referenceDate = new Date().toISOString().slice(0, 10)): string {
  return addDays(referenceDate, DEFAULT_INTERVAL_DAYS);
}

export function normaliseFeedingSchedule(value: unknown, fallbackDate = new Date().toISOString().slice(0, 10)): FeedingSchedule {
  if (!value || typeof value !== "object") {
    return {
      enabled: false,
      intervalDays: DEFAULT_INTERVAL_DAYS,
      nextFeedingDate: getDefaultNextFeedingDate(fallbackDate),
      notificationsEnabled: true,
      preparationReminderEnabled: true,
      preparationReminderDaysBefore: DEFAULT_PREPARATION_DAYS,
      preparationReminderTime: DEFAULT_PREPARATION_TIME,
    };
  }

  const raw = value as Partial<FeedingSchedule>;
  const intervalDays = Number(raw.intervalDays);
  return {
    enabled: raw.enabled === true,
    intervalDays: Number.isFinite(intervalDays) && intervalDays >= 1 && intervalDays <= 90 ? Math.round(intervalDays) : DEFAULT_INTERVAL_DAYS,
    nextFeedingDate: typeof raw.nextFeedingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.nextFeedingDate) ? raw.nextFeedingDate : getDefaultNextFeedingDate(fallbackDate),
    notificationsEnabled: raw.notificationsEnabled !== false,
    preparationReminderEnabled: raw.preparationReminderEnabled !== false,
    preparationReminderDaysBefore: normalisePreparationDays(raw.preparationReminderDaysBefore),
    preparationReminderTime: normaliseTime(raw.preparationReminderTime),
  };
}

export async function getFeedingSchedule(uid: string, snakeId: string, fallbackDate?: string): Promise<FeedingSchedule> {
  const snapshot = await getDoc(doc(db, "users", uid, "snakes", snakeId));
  return normaliseFeedingSchedule(snapshot.data()?.feedingSchedule, fallbackDate);
}

export async function saveFeedingSchedule(uid: string, snakeId: string, schedule: FeedingSchedule): Promise<FeedingSchedule> {
  const next = normaliseFeedingSchedule(schedule);
  await setDoc(doc(db, "users", uid, "snakes", snakeId), { feedingSchedule: next }, { merge: true });
  return next;
}

export async function advanceFeedingScheduleAfterFeed(uid: string, snakeId: string, feedingDate: string): Promise<FeedingSchedule | null> {
  const snapshot = await getDoc(doc(db, "users", uid, "snakes", snakeId));
  const existing = snapshot.data()?.feedingSchedule;
  if (!existing) return null;
  const schedule = normaliseFeedingSchedule(existing, feedingDate);
  if (!schedule.enabled) return schedule;
  let nextDate = schedule.nextFeedingDate;
  while (nextDate <= feedingDate) nextDate = addDays(nextDate, schedule.intervalDays);
  return saveFeedingSchedule(uid, snakeId, { ...schedule, nextFeedingDate: nextDate });
}
