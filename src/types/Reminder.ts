export type ReminderKind = "weight" | "feeding" | "shedding" | "health" | "husbandry" | "custom";
export type ReminderStatus = "active" | "paused";
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

export const REMINDER_DEFINITIONS: Array<{ kind: ReminderKind; icon: string; label: string; description: string; defaultTitle: string }> = [
  { kind: "weight", icon: "⚖️", label: "Weight", description: "Keep growth records consistent without relying on memory.", defaultTitle: "Weight check" },
  { kind: "feeding", icon: "🍽️", label: "Feeding", description: "Create a recurring keeper reminder around your feeding routine.", defaultTitle: "Feeding check" },
  { kind: "shedding", icon: "🐍", label: "Shedding", description: "Keep shed-cycle checks and routine shed observations on schedule.", defaultTitle: "Shed check" },
  { kind: "health", icon: "🩺", label: "Health", description: "Remember routine health, treatment or vet follow-ups.", defaultTitle: "Health check" },
  { kind: "husbandry", icon: "🌡️", label: "Husbandry", description: "Create recurring enclosure and husbandry checks.", defaultTitle: "Husbandry check" },
  { kind: "custom", icon: "📌", label: "Custom", description: "Write your own recurring keeper reminder.", defaultTitle: "Custom reminder" },
];
