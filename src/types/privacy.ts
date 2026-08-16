export const PRIVACY_CONSENT_VERSION = "2026-08-16-v2";

export type PrivacyPreferences = {
  consentVersion: string;
  consentUpdatedAt?: unknown;
  communityLocation: boolean;
  anonymousAnalytics: boolean;
  productUpdates: boolean;
  city?: string;
  country?: string;
  approxLat?: number;
  approxLng?: number;
};

export type CommunityLocationAggregate = {
  country: string;
  city: string;
  users: number;
  approxLat?: number;
  approxLng?: number;
};
