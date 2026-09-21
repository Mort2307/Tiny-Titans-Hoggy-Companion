import type { ReminderInput, ReminderKind } from "../types/Reminder";
import { REMINDER_DEFINITIONS } from "../types/Reminder";
import type { ReminderSnakeOption } from "../types/reminderTypePage";

export const REMINDER_DEFINITION_MAP = new Map(REMINDER_DEFINITIONS.map((item) => [item.kind, item]));

export function localReminderDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function buildReminderInput(
  kind: ReminderKind,
  snakeId: string | null,
  snakes: ReminderSnakeOption[],
): ReminderInput {
  const base = (REMINDER_DEFINITION_MAP.get(kind) && requireDefinition(kind)) || null;
  return {
    ...base,
    snakeName: snakes.find((snake) => snake.id === snakeId)?.name ?? null,
  };
}

function requireDefinition(kind: ReminderKind): ReminderInput {
  const definition = REMINDER_DEFINITION_MAP.get(kind);
  if (!definition) throw new Error("Unknown reminder type.");
  return {
    kind,
    title: definition.defaultTitle,
    description: definition.description,
    snakeId: null,
    snakeName: null,
    frequencyDays: 7,
    time: "09:00",
    startDate: localReminderDateKey(),
    timezone: "Europe/London",
    leadUpEnabled: kind !== "feeding",
    leadUpDays: kind === "feeding" ? 0 : 1,
    status: "active",
  };
}

export function formatReminderNext(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

export function formatReminderDateKey(value: string | undefined): string {
  if (!value) return "Unknown date";
  const date = new Date(value + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(date);
}
