export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export type NotificationSettings = {
  enabled: boolean;
  feedingPreparationEnabled: boolean;
  feedingPreparationDaysBefore: number;
  feedingPreparationTime: string;
  feedingRemindersEnabled: boolean;
  weightRemindersEnabled: boolean;
  weightReminderTime: string;
  healthRemindersEnabled: boolean;
  healthReminderFollowUpEnabled: boolean;
  medicationMissedFollowUpMinutes: number;
  healthFollowUpLeadDays: number;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  feedingPreparationEnabled: false,
  feedingPreparationDaysBefore: 0,
  feedingPreparationTime: "08:00",
  feedingRemindersEnabled: true,
  weightRemindersEnabled: true,
  weightReminderTime: "09:00",
  healthRemindersEnabled: true,
  healthReminderFollowUpEnabled: true,
  medicationMissedFollowUpMinutes: 60,
  healthFollowUpLeadDays: 1,
};
