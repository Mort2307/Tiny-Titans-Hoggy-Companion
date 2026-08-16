export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export type NotificationSettings = {
  enabled: boolean;
  feedingPreparationEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  feedingPreparationEnabled: true,
};
