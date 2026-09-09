const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
const PUBLIC_CACHE_TTL_MS = 60_000;
let snapshotCache = null;
let snapshotCacheAt = 0;
let feedCache = null;
let feedCacheAt = 0;

function timestampMillis(value) { if (!value) return 0; if (typeof value?.toMillis === 'function') return value.toMillis(); if (typeof value === 'number' && Number.isFinite(value)) return value; const parsed = Date.parse(String(value)); return Number.isFinite(parsed) ? parsed : 0; }
function isoDate(value) { const millis = timestampMillis(value); return millis > 0 ? new Date(millis).toISOString() : new Date().toISOString(); }
function creditMethods(item) { if (Array.isArray(item?.contributorCreditMethods)) return item.contributorCreditMethods; if (item?.contributorCreditMethod) return [item.contributorCreditMethod]; if (item?.creditType) return [item.creditType]; if (item?.creditMode) return [item.creditMode]; return []; }
function publicAttribution(item, fallback = 'Anonymous keeper') { const methods = creditMethods(item); if (methods.includes('anonymous')) return fallback; const parts = []; if (methods.includes('profile')) { const value = String(item?.contributorCreditProfileName || item?.contributorProfileName || '').trim(); if (value) parts.push(value); } if (methods.includes('name') || methods.includes('credited')) { const value = String(item?.contributorCreditName || item?.creditName || item?.contributorDisplayName || '').trim(); if (value) parts.push(value); } if (methods.includes('social')) { const value = String(item?.contributorCreditSocial || item?.creditSocial || '').trim(); if (value) parts.push(value); } return parts.length ? parts.join(' · ') : fallback; }
function contributorKey(item, documentId) { const uid = String(item?.userId || item?.creatorUid || item?.submittedBy || item?.uid || '').trim(); return uid || `anonymous:${documentId}`; }
async function getPublicDocuments() { return Promise.all([db.collection('keeperObservations').where('status', '==', 'approved').get(), db.collection('morphImageSubmissions').get(), db.collectionGroup('morphSubmissions').get(), db.collection('communityContent').where('visibility', '==', 'community').get()]); }
async function getCallerPrivacy(uid) { const snapshot = await db.collection('users').doc(uid).collection('settings').doc('privacy').get(); return snapshot.exists ? snapshot.data() || {} : {}; }
function communityIntelligenceDenied() { return { available: false, reason: 'community-intelligence-disabled', contributors: 0, totalRecords: 0, publicCommunityRecords: 0, behaviourContributions: 0, morphContributions: 0, communityContributions: 0, intelligenceContributions: 0, intelligenceWeightRecords: 0, intelligenceFeedingRecords: 0, intelligenceShedRecords: 0, intelligenceHealthRecords: 0, intelligenceContributingKeepers: 0, generatedAt: new Date().toISOString() }; }
async function calculateConsentEligibleIntelligence() {
  const users = await db.collection('users').get(); const contributingKeepers = new Set(); let weightRecords = 0, feedingRecords = 0, shedRecords = 0, healthRecords = 0;
  await Promise.all(users.docs.map(async (userDoc) => {
    const privacy = (await userDoc.ref.collection('settings').doc('privacy').get()).data() || {};
    if (privacy.communityContribution !== true) return;
    const snakeSnapshot = await userDoc.ref.collection('snakes').get(); let userEligibleRecords = 0;
    await Promise.all(snakeSnapshot.docs.map(async (snakeDoc) => {
      const [weights, feedings, sheds] = await Promise.all([snakeDoc.ref.collection('weights').get(), snakeDoc.ref.collection('feedings').get(), snakeDoc.ref.collection('sheds').get()]);
      const validWeights = weights.docs.filter((item) => !item.data()?.deletedAt).length;
      const validFeedings = feedings.docs.filter((item) => !item.data()?.deletedAt).length;
      const validSheds = sheds.docs.filter((item) => !item.data()?.deletedAt).length;
      const snake = snakeDoc.data() || {};
      const validHealth = Array.isArray(snake.healthHistory) ? snake.healthHistory.filter((item) => !(item && typeof item === 'object' && item.deletedAt)).length : 0;
      weightRecords += validWeights; feedingRecords += validFeedings; shedRecords += validSheds; healthRecords += validHealth; userEligibleRecords += validWeights + validFeedings + validSheds + validHealth;
    }));
    if (userEligibleRecords > 0) contributingKeepers.add(userDoc.id);
  }));
  return { contributingKeepers: contributingKeepers.size, weightRecords, feedingRecords, shedRecords, healthRecords, totalRecords: weightRecords + feedingRecords + shedRecords + healthRecords };
}
async function calculatePublicSnapshot() {
  const [behaviourDocs, morphDocs, morphNameDocs, communityDocs] = await getPublicDocuments(); const intelligence = await calculateConsentEligibleIntelligence(); const contributors = new Set(); let behaviourContributions = 0, morphContributions = 0, communityContributions = 0;
  for (const doc of behaviourDocs.docs) { const item = doc.data() || {}; if (!item.educationalConsent) continue; behaviourContributions += 1; contributors.add(contributorKey(item, doc.id)); }
  for (const doc of morphDocs.docs) { const item = doc.data() || {}; const status = String(item.status || '').toLowerCase(); if (status !== 'approved') continue; if (item.visibility && !['community','public'].includes(String(item.visibility).toLowerCase())) continue; morphContributions += 1; contributors.add(contributorKey(item, doc.id)); }
  for (const doc of morphNameDocs.docs) { const item = doc.data() || {}; const status = String(item.status || '').toLowerCase(); if (status && status !== 'approved') continue; if (item.visibility && !['community','public'].includes(String(item.visibility).toLowerCase())) continue; morphContributions += 1; contributors.add(contributorKey(item, doc.id)); }
  for (const doc of communityDocs.docs) { const item = doc.data() || {}; if (item.moderationStatus !== 'approved') continue; communityContributions += 1; contributors.add(contributorKey(item, doc.id)); }
  const publicCommunityRecords = behaviourContributions + morphContributions + communityContributions; const publicIdentifiedContributors = new Set(Array.from(contributors).filter((key) => !String(key).startsWith('anonymous:'))); const uniqueContributorCount = publicIdentifiedContributors.size + intelligence.contributingKeepers; const anonymousPublicContributors = Array.from(contributors).filter((key) => String(key).startsWith('anonymous:')).length; const totalRecords = publicCommunityRecords + intelligence.totalRecords;
  return { available: true, contributors: uniqueContributorCount + anonymousPublicContributors, totalRecords, publicCommunityRecords, behaviourContributions, morphContributions, communityContributions, intelligenceContributions: intelligence.totalRecords, intelligenceWeightRecords: intelligence.weightRecords, intelligenceFeedingRecords: intelligence.feedingRecords, intelligenceShedRecords: intelligence.shedRecords, intelligenceHealthRecords: intelligence.healthRecords, intelligenceContributingKeepers: intelligence.contributingKeepers, generatedAt: new Date().toISOString() };
}
async function calculatePublicFeed() {
  const feed = []; const [behaviourDocs, morphDocs, morphNameDocs, communityDocs] = await getPublicDocuments();
  for (const doc of behaviourDocs.docs) { const item = doc.data() || {}; if (!item.educationalConsent) continue; feed.push({ id: doc.id, category: String(item.primaryCategory || item.category || 'Behaviour'), title: String(item.title || item.behaviourName || item.observationTitle || 'Behaviour observation'), snippet: String(item.description || item.observation || item.notes || 'Keeper-submitted behaviour observation.').slice(0, 180), contributor: publicAttribution(item), createdAt: isoDate(item.createdAt || item.submittedAt || item.updatedAt), source: 'Behaviour Observatory' }); }
  for (const doc of morphDocs.docs) { const item = doc.data() || {}; const status = String(item.status || '').toLowerCase(); if (status !== 'approved') continue; if (item.visibility && !['community','public'].includes(String(item.visibility).toLowerCase())) continue; feed.push({ id: doc.id, category: 'Morph Library', title: String(item.morphName || item.morphId || item.submittedName || 'Morph evidence'), snippet: String(item.description || item.proofDetails || 'Keeper-submitted Morph Library evidence.').slice(0, 180), contributor: publicAttribution(item), createdAt: isoDate(item.approvedAt || item.reviewedAt || item.submittedAt || item.createdAt), source: 'Morph Library' }); }
  for (const doc of morphNameDocs.docs) { const item = doc.data() || {}; const status = String(item.status || '').toLowerCase(); if (status && status !== 'approved') continue; if (item.visibility && !['community','public'].includes(String(item.visibility).toLowerCase())) continue; feed.push({ id: doc.id, category: 'Morph Library', title: String(item.submittedName || item.morphName || 'Morph contribution'), snippet: String(item.description || item.knownGenetics || 'Keeper-submitted Morph Library contribution.').slice(0, 180), contributor: publicAttribution(item, 'Anonymous keeper'), createdAt: isoDate(item.reviewedAt || item.updatedAt || item.createdAt), source: 'Morph Library' }); }
  for (const doc of communityDocs.docs) { const item = doc.data() || {}; if (item.moderationStatus !== 'approved') continue; feed.push({ id: doc.id, category: String(item.type || 'Community'), title: String(item.title || 'Community contribution'), snippet: String(item.description || 'Community contribution shared with Tiny Titans.').slice(0, 180), contributor: publicAttribution(item, 'Anonymous keeper'), createdAt: isoDate(item.createdAt || item.updatedAt), source: 'Community Hub' }); }
  const intelligence = await calculateConsentEligibleIntelligence();
  if (intelligence.totalRecords > 0) feed.push({ id: 'community-intelligence-aggregate', category: 'Tiny Titans Intelligence', title: `${intelligence.totalRecords} eligible keeper records contributing globally`, snippet: `${intelligence.weightRecords} weight, ${intelligence.feedingRecords} feeding, ${intelligence.shedRecords} shed and ${intelligence.healthRecords} health records are contributing to community intelligence from ${intelligence.contributingKeepers} consenting keepers. Individual records remain private.`, contributor: `${intelligence.contributingKeepers} consenting keepers`, createdAt: new Date().toISOString(), source: 'Community Intelligence' });
  return feed.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 100);
}
exports.getPublicCommunityContributionSnapshotV2 = onCall({ region: 'europe-west2', memory: '512MiB', timeoutSeconds: 120 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const privacy = await getCallerPrivacy(request.auth.uid); if (privacy.communityIntelligence !== true) return communityIntelligenceDenied();
  const now = Date.now(); if (snapshotCache && now - snapshotCacheAt < PUBLIC_CACHE_TTL_MS) return snapshotCache;
  try { snapshotCache = await calculatePublicSnapshot(); snapshotCacheAt = Date.now(); return snapshotCache; } catch (error) { console.error('Public contribution snapshot failed', error); throw new HttpsError('internal', 'Unable to load the community contribution tracker.'); }
});
exports.getPublicCommunityContributionFeedV2 = onCall({ region: 'europe-west2', memory: '512MiB', timeoutSeconds: 120 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const privacy = await getCallerPrivacy(request.auth.uid); if (privacy.communityIntelligence !== true) return { entries: [], generatedAt: new Date().toISOString(), available: false, reason: 'community-intelligence-disabled' };
  const now = Date.now(); if (feedCache && now - feedCacheAt < PUBLIC_CACHE_TTL_MS) return { entries: feedCache, generatedAt: new Date(feedCacheAt).toISOString(), available: true };
  try { feedCache = await calculatePublicFeed(); feedCacheAt = Date.now(); return { entries: feedCache, generatedAt: new Date().toISOString(), available: true }; } catch (error) { console.error('Public contribution feed failed', error); throw new HttpsError('internal', 'Unable to load the public contribution feed.'); }
});
