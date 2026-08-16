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

// No preparation reminder is assumed until the keeper enables it and chooses
// their preferred timing. The timing fields are retained as a safe editable
// default for the settings UI and existing records.
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  feedingPreparationEnabled: false,
  feedingPreparationDaysBefore: 0,
  feedingPreparationTime: "08:00",
};
