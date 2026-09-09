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
  /** Personal advanced intelligence. Independent from community contribution. */
  personalIntelligence: boolean;
  /** Optional contribution of eligible husbandry records to aggregate community intelligence. */
  communityContribution: boolean;
  /** Optional access to aggregate community intelligence. */
  communityIntelligence: boolean;
  /** Optional ability to participate in community comments/messaging. */
  communityMessaging: boolean;
  communityMessagingDeclineReason?: CommunityMessagingDeclineReason | null;
  communityMessagingDeclineReasonDetail?: string | null;
  productUpdates: boolean;
  city?: string;
  country?: string;
};
