import type { WeekStartDay } from "../context/EasyNavContext";

export type TitanWeekRange = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  label: string;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentTitanWeek(reference: Date = new Date(), weekStartDay: WeekStartDay = 0): TitanWeekRange {
  const today = startOfLocalDay(reference);
  const currentDay = today.getDay();
  const offset = (currentDay - weekStartDay + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const format = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });
  return {
    start,
    end,
    startKey: toKey(start),
    endKey: toKey(end),
    label: `${format.format(start)} – ${format.format(end)}`,
  };
}

export function isDateInTitanWeek(dateValue: string | undefined, range: TitanWeekRange): boolean {
  if (!dateValue) return false;
  const key = dateValue.slice(0, 10);
  return key >= range.startKey && key <= range.endKey;
}

export function getRecordCountForWeek<T extends { date: string }>(records: T[] | undefined, range: TitanWeekRange): number {
  return records?.reduce((count, record) => count + (isDateInTitanWeek(record.date, range) ? 1 : 0), 0) ?? 0;
}
