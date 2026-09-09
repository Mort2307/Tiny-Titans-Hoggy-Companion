import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { PrivacyPreferences } from '../types/privacy';
import { syncCommunityLocationMembership } from './communityLocationSyncService';

export const PRIVACY_CONSENT_VERSION = '2026-09-09-intelligence-permissions-v6';
const DEFAULT_PRIVACY: PrivacyPreferences = {
  consentVersion: '', communityLocation: false, anonymousAnalytics: false, communityHusbandryData: false,
  personalIntelligence: false, communityContribution: false, communityIntelligence: false, communityMessaging: false,
  communityMessagingDeclineReason: null, communityMessagingDeclineReasonDetail: null, productUpdates: false,
};
type LegacyPreferences = { approximateLocation?: unknown; analytics?: unknown; communityHusbandryData?: unknown; productUpdates?: unknown; consentVersion?: unknown; personalIntelligence?: unknown; communityContribution?: unknown; communityIntelligence?: unknown; communityMessaging?: unknown };
const bool = (value: unknown) => value === true;
function preferCanonical(data: Record<string, unknown>, key: keyof PrivacyPreferences, legacyValue: unknown, fallback = false) {
  return Object.prototype.hasOwnProperty.call(data, key) ? bool(data[key]) : (typeof legacyValue === 'boolean' ? legacyValue : fallback);
}

export async function getPrivacyPreferences(uid: string): Promise<PrivacyPreferences> {
  if (!uid) throw new Error('Privacy preferences require an authenticated user.');
  const privacyRef = doc(db, 'users', uid, 'settings', 'privacy');
  const [snapshot, userSnapshot] = await Promise.all([getDoc(privacyRef), getDoc(doc(db, 'users', uid))]);
  const legacy = (userSnapshot.data()?.dataCollectionPreferences ?? {}) as LegacyPreferences;
  if (!snapshot.exists()) {
    const contribution = bool(legacy.communityContribution) || bool(legacy.communityHusbandryData);
    return {
      ...DEFAULT_PRIVACY,
      communityLocation: bool(legacy.approximateLocation),
      anonymousAnalytics: bool(legacy.analytics),
      communityHusbandryData: contribution,
      personalIntelligence: bool(legacy.personalIntelligence) || bool(legacy.communityHusbandryData),
      communityContribution: contribution,
      communityIntelligence: typeof legacy.communityIntelligence === 'boolean' ? bool(legacy.communityIntelligence) : contribution,
      communityMessaging: bool(legacy.communityMessaging),
      productUpdates: bool(legacy.productUpdates),
      consentVersion: typeof legacy.consentVersion === 'string' ? legacy.consentVersion : '',
    };
  }
  const data = snapshot.data() as Record<string, unknown>;
  const contribution = preferCanonical(data, 'communityContribution', legacy.communityContribution ?? legacy.communityHusbandryData);
  return {
    ...DEFAULT_PRIVACY,
    ...data,
    communityLocation: preferCanonical(data, 'communityLocation', legacy.approximateLocation),
    anonymousAnalytics: preferCanonical(data, 'anonymousAnalytics', legacy.analytics),
    communityHusbandryData: contribution,
    personalIntelligence: preferCanonical(data, 'personalIntelligence', legacy.personalIntelligence ?? legacy.communityHusbandryData),
    communityContribution: contribution,
    communityIntelligence: preferCanonical(data, 'communityIntelligence', legacy.communityIntelligence ?? contribution),
    communityMessaging: preferCanonical(data, 'communityMessaging', legacy.communityMessaging),
    communityMessagingDeclineReason: typeof data.communityMessagingDeclineReason === 'string' ? data.communityMessagingDeclineReason as PrivacyPreferences['communityMessagingDeclineReason'] : null,
    communityMessagingDeclineReasonDetail: typeof data.communityMessagingDeclineReasonDetail === 'string' ? data.communityMessagingDeclineReasonDetail.slice(0, 300) : null,
    consentVersion: typeof data.consentVersion === 'string' ? data.consentVersion : '',
    productUpdates: preferCanonical(data, 'productUpdates', legacy.productUpdates),
  };
}

export type PrivacyPreferenceUpdate = Omit<PrivacyPreferences, 'consentVersion' | 'consentUpdatedAt'>;
export async function savePrivacyPreferences(uid: string, next: PrivacyPreferenceUpdate): Promise<void> {
  if (!uid) throw new Error('Privacy preferences require an authenticated user.');
  const personalIntelligence = typeof next.personalIntelligence === 'boolean' ? next.personalIntelligence : next.communityHusbandryData === true;
  const communityContribution = typeof next.communityContribution === 'boolean' ? next.communityContribution : next.communityHusbandryData === true;
  const communityIntelligence = typeof next.communityIntelligence === 'boolean' ? next.communityIntelligence : next.communityHusbandryData === true;
  const communityMessaging = next.communityMessaging === true;
  const sanitized: PrivacyPreferenceUpdate = {
    ...next,
    personalIntelligence,
    communityContribution,
    communityIntelligence,
    communityMessaging,
    communityMessagingDeclineReason: communityMessaging ? null : (next.communityMessagingDeclineReason ?? null),
    communityMessagingDeclineReasonDetail: communityMessaging ? null : (next.communityMessagingDeclineReasonDetail ?? null),
    communityHusbandryData: communityContribution,
  };
  const timestamp = serverTimestamp();
  await setDoc(doc(db, 'users', uid, 'settings', 'privacy'), { ...sanitized, consentVersion: PRIVACY_CONSENT_VERSION, consentUpdatedAt: timestamp }, { merge: true });
  await setDoc(doc(db, 'users', uid), { dataCollectionPreferences: { approximateLocation: sanitized.communityLocation, analytics: sanitized.anonymousAnalytics, communityHusbandryData: sanitized.communityContribution, personalIntelligence: sanitized.personalIntelligence, communityContribution: sanitized.communityContribution, communityIntelligence: sanitized.communityIntelligence, communityMessaging: sanitized.communityMessaging, productUpdates: sanitized.productUpdates, consentVersion: PRIVACY_CONSENT_VERSION, consentUpdatedAt: timestamp }, updatedAt: timestamp }, { merge: true });
  await syncCommunityLocationMembership();
}

export async function clearCommunityLocation(uid: string): Promise<void> {
  if (!uid) throw new Error('Privacy preferences require an authenticated user.');
  await Promise.all([
    setDoc(doc(db, 'users', uid, 'settings', 'privacy'), { communityLocation: false, city: null, country: null, consentVersion: PRIVACY_CONSENT_VERSION, consentUpdatedAt: serverTimestamp() }, { merge: true }),
    updateDoc(doc(db, 'users', uid), { approximateLocation: null, updatedAt: serverTimestamp() }),
  ]);
  await syncCommunityLocationMembership();
}
