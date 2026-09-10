const crypto = require("node:crypto");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();
const VALID_TIERS = new Set(["free", "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const PAID_TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const ENTITLEMENTS = new Set([
  "advanced_analytics",
  "data_export",
  "seller_profile",
  "marketplace_seller",
  "business_reporting",
  "multi_user",
  "team_permissions",
  "automation",
  "api_access",
  "priority_support",
  "custom_branding",
]);
const TIER_ENTITLEMENTS = {
  free: new Set(["core_tracking", "core_genetics", "core_learning", "core_community"]),
  titan_pro: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "data_export"]),
  titan_seller: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "seller_profile", "marketplace_seller", "data_export"]),
  business_starter: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "reptile_room", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user"]),
  business_plus: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "reptile_room", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "priority_support"]),
  business_advanced: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "reptile_room", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "api_access", "priority_support", "custom_branding"]),
};
function expiryMillis(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}
function entitlementFromUser(data) {
  const tier = VALID_TIERS.has(String(data.subscriptionTier || "")) ? String(data.subscriptionTier) : "free";
  const status = String(data.subscriptionStatus || (tier === "free" ? "free" : "active"));
  const subscriptionActive = PAID_TIERS.has(tier) && ["active", "trialing"].includes(status);
  const override = data.paidTesterOverride || null;
  const overrideTier = VALID_TIERS.has(String(override?.tier || "")) ? String(override.tier) : "free";
  const overrideExpiry = expiryMillis(override?.expiresAt);
  const overrideValid = override?.enabled === true && PAID_TIERS.has(overrideTier) && (overrideExpiry === null || overrideExpiry > Date.now());
  const trial = data.paidTrial || null;
  const trialTier = VALID_TIERS.has(String(trial?.tier || "")) ? String(trial.tier) : "free";
  const trialExpiry = expiryMillis(trial?.expiresAt);
  const trialValid = trial?.enabled === true && PAID_TIERS.has(trialTier) && trialExpiry !== null && trialExpiry > Date.now();
  const effectiveTier = overrideValid ? overrideTier : subscriptionActive ? tier : trialValid ? trialTier : "free";
  const source = overrideValid ? "tester" : subscriptionActive ? "subscription" : trialValid ? "trial" : "free";
  const statusAllowsAccess = effectiveTier === "free" || subscriptionActive || trialValid;
  return { tier, effectiveTier, source, statusAllowsAccess, entitlements: TIER_ENTITLEMENTS[effectiveTier] || TIER_ENTITLEMENTS.free };
}
async function requireEntitlement(uid, entitlement) {
  if (!ENTITLEMENTS.has(entitlement)) throw new HttpsError("invalid-argument", "Unknown paid entitlement.");
  const snapshot = await db.collection("users").doc(uid).get();
  const access = entitlementFromUser(snapshot.exists ? snapshot.data() : {});
  if (!access.statusAllowsAccess || !access.entitlements.has(entitlement)) throw new HttpsError("permission-denied", `This action requires the ${entitlement} paid feature.`);
  return access;
}
function cleanText(value, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function cleanEmail(value) { return cleanText(value, 160).toLowerCase(); }
function cleanBoolean(value) { return value === true; }

exports.getPaidBusinessWorkspace = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const requested = String(request.data?.section || "hub");
  const requirement = { analytics: "advanced_analytics", export: "data_export", seller: "seller_profile", marketplace: "marketplace_seller", business: "business_reporting", team: "multi_user", automation: "automation", support: "priority_support", api: "api_access", branding: "custom_branding" }[requested];
  if (requirement) await requireEntitlement(uid, requirement);
  const ref = db.collection("paidWorkspaces").doc(uid);
  const snapshot = await ref.get();
  const workspace = snapshot.exists ? snapshot.data() : {};
  const apiSnapshot = requested === "api" ? await ref.collection("apiKeys").orderBy("createdAt", "desc").limit(50).get() : null;
  const teamSnapshot = requested === "team" ? await ref.collection("teamMembers").orderBy("createdAt", "desc").limit(100).get() : null;
  const automationSnapshot = requested === "automation" ? await ref.collection("automations").orderBy("updatedAt", "desc").limit(100).get() : null;
  return { success: true, section: requested, workspace, apiKeys: apiSnapshot ? apiSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), secretPreview: undefined })) : [], teamMembers: teamSnapshot ? teamSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) : [], automations: automationSnapshot ? automationSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) : [] };
});

exports.savePaidBusinessWorkspace = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const section = String(request.data?.section || "");
  const payload = request.data?.payload && typeof request.data.payload === "object" ? request.data.payload : {};
  const requirement = { seller: "seller_profile", marketplace: "marketplace_seller", business: "business_reporting", branding: "custom_branding" }[section];
  if (!requirement) throw new HttpsError("invalid-argument", "This workspace section is not directly editable.");
  await requireEntitlement(uid, requirement);
  const safePayload = {};
  if (section === "seller") safePayload.sellerProfile = { businessName: cleanText(payload.businessName, 120), displayName: cleanText(payload.displayName, 120), bio: cleanText(payload.bio, 1000), location: cleanText(payload.location, 160), website: cleanText(payload.website, 240), contactEmail: cleanEmail(payload.contactEmail), acceptingEnquiries: cleanBoolean(payload.acceptingEnquiries) };
  if (section === "marketplace") safePayload.marketplace = { enabled: cleanBoolean(payload.enabled), currency: cleanText(payload.currency, 8).toUpperCase() || "GBP", showLocation: cleanBoolean(payload.showLocation), showContactEmail: cleanBoolean(payload.showContactEmail), sellerNote: cleanText(payload.sellerNote, 700) };
  if (section === "business") {
    const reports = Array.isArray(payload.enabledReports) ? payload.enabledReports : String(payload.enabledReports || "").split(",");
    safePayload.business = { businessName: cleanText(payload.businessName, 120), reportingStartDay: cleanText(payload.reportingStartDay, 16) || "monday", reportingTimezone: cleanText(payload.reportingTimezone, 80) || "Europe/London", enabledReports: reports.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20) };
  }
  if (section === "branding") safePayload.branding = { displayName: cleanText(payload.displayName, 120), accentHex: /^#[0-9a-fA-F]{6}$/.test(String(payload.accentHex || "")) ? String(payload.accentHex) : "#8fd1b6", tagline: cleanText(payload.tagline, 180), footerText: cleanText(payload.footerText, 180) };
  await db.collection("paidWorkspaces").doc(uid).set({ ...safePayload, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { success: true, section, saved: safePayload };
});

exports.upsertPaidTeamMember = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const access = await requireEntitlement(uid, "multi_user");
  const canManageRoles = access.entitlements.has("team_permissions");
  const payload = request.data?.payload && typeof request.data.payload === "object" ? request.data.payload : {};
  const id = cleanText(payload.id, 120); const email = cleanEmail(payload.email); const displayName = cleanText(payload.displayName, 120); const role = cleanText(payload.role, 40) || "member";
  if (!email || !email.includes("@")) throw new HttpsError("invalid-argument", "A valid team member email is required.");
  if (!canManageRoles && role !== "member") throw new HttpsError("permission-denied", "Your tier does not include team role management.");
  const data = { email, displayName, role, status: "invited", updatedAt: FieldValue.serverTimestamp() };
  const collection = db.collection("paidWorkspaces").doc(uid).collection("teamMembers"); const ref = id ? collection.doc(id) : collection.doc();
  const existing = await ref.get(); if (!existing.exists) data.createdAt = FieldValue.serverTimestamp();
  await ref.set(data, { merge: true }); return { success: true, id: ref.id, member: data };
});

exports.removePaidTeamMember = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await requireEntitlement(request.auth.uid, "multi_user");
  const id = cleanText(request.data?.id, 120); if (!id) throw new HttpsError("invalid-argument", "A team member ID is required.");
  await db.collection("paidWorkspaces").doc(request.auth.uid).collection("teamMembers").doc(id).delete(); return { success: true, id };
});

exports.upsertPaidAutomation = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid; await requireEntitlement(uid, "automation");
  const payload = request.data?.payload && typeof request.data.payload === "object" ? request.data.payload : {};
  const id = cleanText(payload.id, 120); const name = cleanText(payload.name, 120); const trigger = cleanText(payload.trigger, 80); const action = cleanText(payload.action, 80);
  if (!name || !trigger || !action) throw new HttpsError("invalid-argument", "Automation name, trigger and action are required.");
  const data = { name, trigger, action, enabled: cleanBoolean(payload.enabled), updatedAt: FieldValue.serverTimestamp() };
  const collection = db.collection("paidWorkspaces").doc(uid).collection("automations"); const ref = id ? collection.doc(id) : collection.doc(); const existing = await ref.get(); if (!existing.exists) data.createdAt = FieldValue.serverTimestamp(); await ref.set(data, { merge: true }); return { success: true, id: ref.id };
});

exports.removePaidAutomation = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await requireEntitlement(request.auth.uid, "automation"); const id = cleanText(request.data?.id, 120); if (!id) throw new HttpsError("invalid-argument", "An automation ID is required.");
  await db.collection("paidWorkspaces").doc(request.auth.uid).collection("automations").doc(id).delete(); return { success: true, id };
});

exports.createPaidApiKey = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); const uid = request.auth.uid; await requireEntitlement(uid, "api_access");
  const name = cleanText(request.data?.name, 80) || "Tiny Titans API key"; const rawSecret = `tt_live_${crypto.randomBytes(24).toString("base64url")}`; const hash = crypto.createHash("sha256").update(rawSecret).digest("hex"); const prefix = rawSecret.slice(0, 14);
  const ref = db.collection("paidWorkspaces").doc(uid).collection("apiKeys").doc(); await ref.set({ name, prefix, secretHash: hash, createdAt: FieldValue.serverTimestamp(), revoked: false }); await db.collection("creatorAudit").add({ actorUid: uid, targetUid: uid, action: "create_paid_api_key", createdAt: FieldValue.serverTimestamp() }); return { success: true, id: ref.id, name, secret: rawSecret };
});

exports.revokePaidApiKey = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); const uid = request.auth.uid; await requireEntitlement(uid, "api_access"); const id = cleanText(request.data?.id, 120); if (!id) throw new HttpsError("invalid-argument", "An API key ID is required.");
  await db.collection("paidWorkspaces").doc(uid).collection("apiKeys").doc(id).set({ revoked: true, revokedAt: FieldValue.serverTimestamp() }, { merge: true }); return { success: true, id };
});
