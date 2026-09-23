import type { WeightRecord } from "../types/Weight";

export function sortWeightHistory(history: WeightRecord[]): WeightRecord[] {
  return [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function parseWeightDate(value: string): string | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
      ? trimmed
      : null;
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

export function makeWeightRecordId(): string {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `weight-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function daysSinceDate(today: string, date?: string): number | null {
  if (!date) return null;
  return Math.max(
    0,
    Math.floor(
      (new Date(`${today}T00:00:00`).getTime() -
        new Date(`${date}T00:00:00`).getTime()) /
        86400000,
    ),
  );
}
