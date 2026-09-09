export type CommunityMessagingDeclineReason =
  | "dont-want-messages"
  | "privacy-concern"
  | "dont-understand"
  | "dont-trust-messaging"
  | "other";

export type PrivacyPreferences = {
  consentVersion: string;
  consentUpdatedAt?: unknown;
  communityLocation: boolean;
  anonymousAnalytics: boolean;
  communityHusbandryData: boolean;
  communityMessaging: boolean;
  communityMessagingDeclineReason?: CommunityMessagingDeclineReason | null;
  communityMessagingDeclineReasonDetail?: string | null;
  productUpdates: boolean;
  city?: string;
  country?: string;
};
