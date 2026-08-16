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
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  feedingPreparationEnabled: true,
  feedingPreparationDaysBefore: 2,
  feedingPreparationTime: "08:00",
};
