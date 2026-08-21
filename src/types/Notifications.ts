export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export type NotificationEventType =
  | "marketplace-enquiry"
  | "marketplace-reply"
  | "marketplace-reservation-request"
  | "marketplace-reservation-accepted"
  | "marketplace-reservation-declined"
  | "marketplace-payment-arranged"
  | "marketplace-completed"
  | "community-reply"
  | "community-mention"
  | "featured-approved"
  | "featured-declined"
  | "project-enquiry"
  | "mentor-response"
  | "moderation-action"
  | "feeding"
  | "feeding-preparation"
  | "weight"
  | "health-followup"
  | "medication"
  | "medication-followup"
  | "family"
  | "notification-bot-probe";

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
  marketplaceNotificationsEnabled?: boolean;
  communityNotificationsEnabled?: boolean;
  featuredNotificationsEnabled?: boolean;
  projectNotificationsEnabled?: boolean;
  mentorNotificationsEnabled?: boolean;
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
  marketplaceNotificationsEnabled: true,
  communityNotificationsEnabled: true,
  featuredNotificationsEnabled: true,
  projectNotificationsEnabled: true,
  mentorNotificationsEnabled: true,
};
