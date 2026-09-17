const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();
const adminAuth = getAuth();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const PAID_TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced", "rescue"]);
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const ROLES = ["manager", "staff", "medical", "foster", "viewer"];
const ROLE_FIELDS = Object.freeze({ manager: "managerUids", staff: "staffUids", medical: "medicalUids", foster: "fosterUids", viewer: "viewerUids" });

function millis(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function activeExpiry(value) {
  const time = millis(value);
  return time !== null && time > Date.now();
}

async function isOwner(uid) {
  try {
    const user = await adminAuth.getUser(uid);
    return String(user.email || "").trim().toLowerCase() === OWNER_EMAIL;
  } catch {
    return false;
  }
}

async function rescueMembership(uid) {
  const owned = await db.collection("rescueOrganisations").where("ownerUid", "==", uid).limit(1).get();
  if (!owned.empty) return { organisation: owned.docs[0].data() || {}, organisationId: owned.docs[0].id, role: "owner" };
  for (const role of ROLES) {
    const snapshot = await db.collection("rescueOrganisations").where(ROLE_FIELDS[role], "array-contains", uid).limit(1).get();
    if (!snapshot.empty) return { organisation: snapshot.docs[0].data() || {}, organisationId: snapshot.docs[0].id, role };
  }
  return null;
}

function rescueWorkspaceActive(org) {
  if (!org || String(org.accountType || "rescue") !== "rescue") return false;
  if (String(org.accountStatus || "") === "paid_active") return true;
  return String(org.pilotStatus || "") === "pilot_active" && activeExpiry(org.pilotEndsAt);
}

async function resolveTitanAccess(uid, workspaceKind = "personal") {
  if (!uid) return { allowed: false, effectiveTier: "free", source: "free", workspaceKind };
  if (await isOwner(uid)) return { allowed: true, effectiveTier: "business_advanced", source: "owner", workspaceKind };

  const [userSnapshot, entitlementSnapshot, trialSnapshot, overrideSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("paidEntitlements").doc(uid).get(),
    db.collection("paidTrials").doc(uid).get(),
    db.collection("paidTesterOverrides").doc(uid).get(),
  ]);
  const user = userSnapshot.exists ? userSnapshot.data() || {} : {};
  const entitlement = entitlementSnapshot.exists ? entitlementSnapshot.data() || {} : {};
  const trial = trialSnapshot.exists ? trialSnapshot.data() || {} : {};
  const override = overrideSnapshot.exists ? overrideSnapshot.data() || {} : {};
  const actualTier = PAID_TIERS.has(String(entitlement.tier || user.subscriptionTier || "")) ? String(entitlement.tier || user.subscriptionTier) : "free";
  const actualStatus = String(entitlement.status || user.subscriptionStatus || "free");
  const subscriptionActive = actualTier !== "free" && ACTIVE_STATUSES.has(actualStatus);
  const overrideActive = override.enabled === true && PAID_TIERS.has(String(override.tier || "")) && (!override.expiresAt || activeExpiry(override.expiresAt));
  const trialActive = trial.enabled === true && PAID_TIERS.has(String(trial.tier || "")) && String(trial.tier) !== "free" && activeExpiry(trial.expiresAt);

  if (overrideActive) return { allowed: true, effectiveTier: String(override.tier), source: "tester", workspaceKind, actualTier };
  if (subscriptionActive) return { allowed: true, effectiveTier: actualTier, source: "subscription", workspaceKind, actualTier };
  if (trialActive) return { allowed: true, effectiveTier: String(trial.tier), source: "trial", workspaceKind, actualTier };

  if (workspaceKind === "rescue") {
    const membership = await rescueMembership(uid);
    if (membership && rescueWorkspaceActive(membership.organisation)) {
      return { allowed: true, effectiveTier: "rescue", source: "rescue_workspace", workspaceKind, rescueRole: membership.role, organisationId: membership.organisationId };
    }
  }

  return { allowed: false, effectiveTier: "free", source: "free", workspaceKind, actualTier };
}

module.exports = { resolveTitanAccess, rescueMembership, rescueWorkspaceActive };