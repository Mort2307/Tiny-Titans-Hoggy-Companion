import type { ParentRecord } from "../intelligence/v50/geneticsJourneyEngine";
import type { Snake } from "../types/Snake";

export function recordDate(value: unknown): string | number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : "";
  }
  return "";
}

export function recordNumber(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function snakeRecords(snake: Snake) {
  const structural = snake as Snake & Record<string, unknown>;
  return {
    weights: (snake.weightHistory ?? []).map((item) => { const entry = item as Record<string, unknown>; return { date: recordDate(entry.date ?? entry.recordedAt), grams: recordNumber(entry.weight ?? entry.grams) }; }).filter((item) => item.grams > 0),
    feedings: (snake.feedingHistory ?? []).map((item) => { const entry = item as Record<string, unknown>; return { date: recordDate(entry.date ?? entry.fedAt), label: String(entry.food ?? entry.type ?? "Feeding recorded") }; }),
    sheds: (snake.shedHistory ?? []).map((item) => { const entry = item as Record<string, unknown>; return { date: recordDate(entry.date ?? entry.shedDate), label: String(entry.status ?? "Shed recorded") }; }),
    behaviour: ((structural.behaviourHistory as unknown[]) ?? []).map((item) => { const entry = item as Record<string, unknown>; return { date: recordDate(entry.date), category: String(entry.category ?? ""), label: String(entry.label ?? entry.behaviour ?? "") }; }),
    health: (snake.healthHistory ?? []).map((item) => { const entry = item as Record<string, unknown>; return { date: recordDate(entry.date), label: String(entry.title ?? "Health record") }; }),
  };
}

export function buildFamilyRecords(snakes: readonly Snake[]): ParentRecord[] {
  return snakes.map((snake) => {
    const structural = snake as Snake & Record<string, unknown>;
    const parentIds = Array.isArray(structural.parentIds) ? structural.parentIds.filter((value): value is string => typeof value === "string" && Boolean(value)) : [];
    const motherId = typeof structural.motherId === "string" ? structural.motherId : undefined;
    const fatherId = typeof structural.fatherId === "string" ? structural.fatherId : undefined;
    return { id: snake.id, name: snake.name, genes: [], parentIds: [...parentIds, ...[motherId, fatherId].filter((value): value is string => Boolean(value))] };
  }).map((record) => ({ ...record, parentIds: [...new Set(record.parentIds)] }));
}

export function birthDateFor(snake: Snake): number | undefined {
  const structural = snake as Snake & Record<string, unknown>;
  const raw = structural.hatchDate ?? structural.birthDate ?? structural.dateOfBirth;
  const date = recordDate(raw);
  const millis = typeof date === "number" ? date : Date.parse(String(date));
  return Number.isFinite(millis) && millis > 0 ? millis : undefined;
}