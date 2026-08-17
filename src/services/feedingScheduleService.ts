import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from "../types/Notifications";
import type { FeedingSchedule } from "../types/Snake";

const DEFAULT_INTERVAL_DAYS = 14;
const DEFAULT_PREPARATION_DAYS = DEFAULT_NOTIFICATION_SETTINGS.feedingPreparationDaysBefore;
const DEFAULT_PREPARATION_TIME = DEFAULT_NOTIFICATION_SETTINGS.feedingPreparationTime;

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

function notificationDefaults(value: unknown): Pick<NotificationSettings, "feedingPreparationDaysBefore" | "feedingPreparationTime"> {
  if (!value || typeof value !== "object") return {
    feedingPreparationDaysBefore: DEFAULT_PREPARATION_DAYS,
    feedingPreparationTime: DEFAULT_PREPARATION_TIME,
  };

  const settings = value as Partial<NotificationSettings>;
  return {
    feedingPreparationDaysBefore: normalisePreparationDays(settings.feedingPreparationDaysBefore),
    feedingPreparationTime: normaliseTime(settings.feedingPreparationTime),
  };
}

export function getDefaultNextFeedingDate(referenceDate = new Date().toISOString().slice(0, 10)): string {
  return addDays(referenceDate, DEFAULT_INTERVAL_DAYS);
}

export function normaliseFeedingSchedule(
  value: unknown,
  fallbackDate = new Date().toISOString().slice(0, 10),
  preparationDefaults: Pick<NotificationSettings, "feedingPreparationDaysBefore" | "feedingPreparationTime"> = {
    feedingPreparationDaysBefore: DEFAULT_PREPARATION_DAYS,
    feedingPreparationTime: DEFAULT_PREPARATION_TIME,
  }
): FeedingSchedule {
  if (!value || typeof value !== "object") {
    return {
      enabled: false,
      intervalDays: DEFAULT_INTERVAL_DAYS,
      nextFeedingDate: getDefaultNextFeedingDate(fallbackDate),
      notificationsEnabled: true,
      preparationReminderEnabled: false,
      preparationReminderDaysBefore: preparationDefaults.feedingPreparationDaysBefore,
      preparationReminderTime: preparationDefaults.feedingPreparationTime,
    };
  }

  const raw = value as Partial<FeedingSchedule>;
  const intervalDays = Number(raw.intervalDays);
  return {
    enabled: raw.enabled === true,
    intervalDays: Number.isFinite(intervalDays) && intervalDays >= 1 && intervalDays <= 90 ? Math.round(intervalDays) : DEFAULT_INTERVAL_DAYS,
    nextFeedingDate: typeof raw.nextFeedingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.nextFeedingDate) ? raw.nextFeedingDate : getDefaultNextFeedingDate(fallbackDate),
    notificationsEnabled: raw.notificationsEnabled !== false,
    preparationReminderEnabled: raw.preparationReminderEnabled === true,
    preparationReminderDaysBefore: normalisePreparationDays(raw.preparationReminderDaysBefore, preparationDefaults.feedingPreparationDaysBefore),
    preparationReminderTime: normaliseTime(raw.preparationReminderTime, preparationDefaults.feedingPreparationTime),
  };
}

export async function getFeedingSchedule(uid: string, snakeId: string, fallbackDate?: string): Promise<FeedingSchedule> {
  const [snakeSnapshot, userSnapshot] = await Promise.all([
    getDoc(doc(db, "users", uid, "snakes", snakeId)),
    getDoc(doc(db, "users", uid)),
  ]);
  const preparationDefaults = notificationDefaults(userSnapshot.data()?.notificationSettings);
  return normaliseFeedingSchedule(snakeSnapshot.data()?.feedingSchedule, fallbackDate, preparationDefaults);
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
