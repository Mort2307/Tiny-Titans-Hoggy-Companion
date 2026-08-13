import type { FeedingRecord } from '../types/Feeding';
import { getFeedingAnalytics } from './feedingAnalytics';

export type FeedingReminderStatus = 'due' | 'upcoming' | 'not-due' | 'insufficient-data';

export interface FeedingReminder {
  snakeId: string;
  status: FeedingReminderStatus;
  dueDate: string | null;
  daysUntilDue: number | null;
  message: string;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getFeedingReminder(
  snakeId: string,
  records: FeedingRecord[],
  now: Date = new Date(),
): FeedingReminder {
  const analytics = getFeedingAnalytics(records.filter((record) => record.snakeId === snakeId));

  if (!analytics.lastFeedingDate || !analytics.averageIntervalDays) {
    return {
      snakeId,
      status: 'insufficient-data',
      dueDate: null,
      daysUntilDue: null,
      message: 'Log more successful feedings to establish an individual schedule.',
    };
  }

  const lastFeeding = startOfDay(new Date(analytics.lastFeedingDate));
  const due = new Date(lastFeeding);
  due.setDate(due.getDate() + Math.round(analytics.averageIntervalDays));

  const today = startOfDay(now);
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (daysUntilDue <= 0) {
    return {
      snakeId,
      status: 'due',
      dueDate: due.toISOString(),
      daysUntilDue,
      message: daysUntilDue < 0 ? `Feeding is approximately ${Math.abs(daysUntilDue)} day(s) overdue.` : 'Feeding is due based on the individual history.',
    };
  }

  if (daysUntilDue <= 2) {
    return {
      snakeId,
      status: 'upcoming',
      dueDate: due.toISOString(),
      daysUntilDue,
      message: `Next feeding is approximately ${daysUntilDue} day(s) away.`,
    };
  }

  return {
    snakeId,
    status: 'not-due',
    dueDate: due.toISOString(),
    daysUntilDue,
    message: `Next feeding is approximately ${daysUntilDue} day(s) away.`,
  };
}
