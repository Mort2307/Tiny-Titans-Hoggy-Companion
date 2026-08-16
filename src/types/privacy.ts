export type PrivacyPreferences = {
  consentVersion: string;
  consentUpdatedAt?: unknown;
  communityLocation: boolean;
  anonymousAnalytics: boolean;
  productUpdates: boolean;
  city?: string;
  country?: string;
};
