const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const PAID_TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const DAY_MS = 86400000;
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function millis(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}
function tierName(tier) { return ({ titan_pro: "Titan Pro", titan_seller: "Titan Seller", business_starter: "Business Starter", business_plus: "Business Plus", business_advanced: "Business Advanced" })[tier] || tier; }
function eventId(uid, kind, expiresAt) { return `paid-trial-${kind}-${uid}-${expiresAt}`; }
async function ownerUid() {
  const { getAuth } = require("firebase-admin/auth");
  return (await getAuth().getUserByEmail(OWNER_EMAIL)).uid;
}
async function recordOwnerEvent({ id, title, body, targetUid, targetName, tier, kind }) {
  const uid = await ownerUid();
  const ref = db.collection("users").doc(uid).collection("notificationEvents").doc(id);
  try {
    await ref.create({ eventType: "paid-tier-activation", kind: "paid-trial-lifecycle", activationKind: kind, source: "trial-lifecycle", targetUid, targetName, tier, tierName: tierName(tier), title, body, url: "/creator?tool=paid-tiers", read: false, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    if (error?.code === 6 || error?.code === "already-exists") return false;
    throw error;
  }
  return true;
}

exports.processPaidTrialLifecycle = onSchedule({ schedule: "every day 03:20", timeZone: "Europe/London", region: "europe-west2" }, async () => {
  const snapshot = await db.collection("users").where("paidTrial.enabled", "==", true).get();
  const now = Date.now();
  let checked = 0; let expired = 0; let warned = 0;
  for (const document of snapshot.docs) {
    checked += 1;
    const data = document.data() || {};
    const trial = data.paidTrial || {};
    const tier = String(trial.tier || "");
    if (!PAID_TIERS.has(tier)) continue;
    const expiresAt = millis(trial.expiresAt);
    if (expiresAt === null) continue;
    const targetName = String(data.displayName || data.name || data.email || "A Tiny Titans user");
    if (expiresAt <= now) {
      await document.ref.set({ paidTrial: { ...trial, enabled: false, expiredAt: FieldValue.serverTimestamp() }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await recordOwnerEvent({ id: eventId(document.id, "expired", expiresAt), title: "⌛ Paid trial expired", body: `${targetName}'s ${tierName(tier)} trial has expired and paid access has ended unless another entitlement applies.`, targetUid: document.id, targetName, tier, kind: "trial-expired" });
      expired += 1;
      continue;
    }
    const remaining = expiresAt - now;
    if (remaining <= 3 * DAY_MS && remaining > 2 * DAY_MS) {
      await recordOwnerEvent({ id: eventId(document.id, "warning-3d", expiresAt), title: "⏰ Paid trial ending soon", body: `${targetName}'s ${tierName(tier)} trial expires in about 3 days.`, targetUid: document.id, targetName, tier, kind: "trial-ending-3d" });
      warned += 1;
    }
  }
  console.log("Tiny Titans paid trial lifecycle", { checked, expired, warned });
});
