export type PrivacyPreferences = {
  consentVersion: string;
  consentUpdatedAt?: unknown;
  communityLocation: boolean;
  anonymousAnalytics: boolean;
  communityHusbandryData: boolean;
  productUpdates: boolean;
  city?: string;
  country?: string;
};
