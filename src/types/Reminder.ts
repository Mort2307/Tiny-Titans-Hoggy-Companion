import type { TinyTitansIconName } from "./tinyTitansIcon";

export type ReminderKind = "weight" | "feeding" | "shedding" | "health" | "husbandry" | "water-change" | "custom";
export type ReminderStatus = "active" | "paused" | "completed";
export type ReminderPhase = "lead-up" | "due";

export type Reminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  description?: string;
  snakeId?: string | null;
  snakeName?: string | null;
  frequencyDays: number;
  time: string;
  startDate: string;
  timezone: string;
  leadUpEnabled: boolean;
  leadUpDays: number;
  status: ReminderStatus;
  scheduleType?: "recurring" | "once";
  oneTime?: boolean;
  nextNotificationAt: string;
  nextOccurrenceDate: string;
  nextPhase: ReminderPhase;
  lastNotifiedAt?: string | null;
  lastCompletedAt?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ReminderInput = Omit<Reminder, "id" | "nextNotificationAt" | "nextOccurrenceDate" | "nextPhase" | "createdAt" | "updatedAt" | "lastNotifiedAt" | "lastCompletedAt"> & {
  id?: string;
};

export const REMINDER_DEFINITIONS: Array<{ kind: ReminderKind; icon: TinyTitansIconName; label: string; description: string; defaultTitle: string }> = [
  { kind: "weight", icon: "weight", label: "Weight", description: "Keep growth records consistent without relying on memory.", defaultTitle: "Weight check" },
  { kind: "feeding", icon: "feeding", label: "Feeding", description: "Create a recurring keeper reminder around your feeding routine.", defaultTitle: "Feeding check" },
  { kind: "shedding", icon: "shed", label: "Shedding", description: "Keep shed-cycle checks and routine shed observations on schedule.", defaultTitle: "Shed check" },
  { kind: "health", icon: "vet", label: "Health", description: "Remember routine health, treatment or vet follow-ups.", defaultTitle: "Health check" },
  { kind: "husbandry", icon: "husbandry", label: "Husbandry", description: "Create recurring enclosure and husbandry checks.", defaultTitle: "Husbandry check" },
  { kind: "water-change", icon: "water", label: "Water Change", description: "Keep fresh-water refreshes and dish hygiene on a schedule you control.", defaultTitle: "Water change" },
  { kind: "custom", icon: "pin", label: "Custom", description: "Write your own recurring keeper reminder.", defaultTitle: "Custom reminder" },
];
