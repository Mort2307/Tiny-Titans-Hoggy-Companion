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
  /** Legacy husbandry consent retained for migration/backward compatibility. */
  communityHusbandryData: boolean;
  /** Optional at the type boundary so older call-sites can be migrated safely. */
  personalIntelligence?: boolean;
  communityContribution?: boolean;
  communityIntelligence?: boolean;
  communityMessaging?: boolean;
  communityMessagingDeclineReason?: CommunityMessagingDeclineReason | null;
  communityMessagingDeclineReasonDetail?: string | null;
  productUpdates: boolean;
  city?: string;
  country?: string;
};
