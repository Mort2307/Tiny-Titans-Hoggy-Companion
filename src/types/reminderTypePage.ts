export type ReminderSnakeOption = { id: string; name: string };
export type WaterChangeLog = { id: string; date?: string; snakeName?: string | null };
export type ReminderPageDefinition = (typeof import("./Reminder").REMINDER_DEFINITIONS)[number];
