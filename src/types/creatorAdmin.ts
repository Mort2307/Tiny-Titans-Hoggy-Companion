import type { GlobalStats } from "../services/creatorService";
export type CreatorUser = {
  uid: string; displayName: string; email: string; role: string; profileType: string; category: string; ageBand: string;
  experienceLevel: string; learningLevel: string; setupComplete: boolean;
  approximateLocation?: { city?: string; country?: string; visibleToCreator?: boolean } | null;
  dataCollectionPreferences?: { approximateLocation?: boolean; analytics?: boolean; productUpdates?: boolean; communityHusbandryData?: boolean; consentVersion?: string };
  lastActiveAt?: { toMillis?: () => number } | string | null; createdAt?: unknown; platform?: string; appVersion?: string;
};
export type CreatorDashboardData = { canonicalStats: GlobalStats; morphPending: number; bugPending: number; feedbackNew: number };
export type CreatorUserInsights = { bands: { today:number; week:number; month:number; cooling:number; inactive:number; unknown:number }; setupComplete:number; locationOn:number; analyticsOn:number; husbandryOn:number; productUpdatesOn:number };
export type CreatorUserActivityBand = { label:string; detail:string };