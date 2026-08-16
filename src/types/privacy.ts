export const PRIVACY_CONSENT_VERSION = "2026-08-16-v1";

export type PrivacyPreferences = {
  consentVersion: string;
  consentUpdatedAt?: unknown;
  communityLocation: boolean;
  anonymousAnalytics: boolean;
  productUpdates: boolean;
  city?: string;
  country?: string;
};

export type CommunityLocationAggregate = {
  country: string;
  city: string;
  users: number;
};
