const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const USAGE_LIMITS = Object.freeze({ titan_pro: 60, titan_seller: 60, business_starter: 120, business_plus: 240, business_advanced: 400, rescue: 600 });

function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function consumeTitanUsage(uid, tier) {
  const limit = USAGE_LIMITS[tier] || 0;
  if (!limit) return { used: 0, limit: 0, remaining: 0 };
  const ref = db.collection("titanUsage").doc(`${uid}_${periodKey()}`);
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? Number(snapshot.data()?.count || 0) : 0;
    if (current >= limit) return { blocked: true, used: current, limit, remaining: 0 };
    const next = current + 1;
    transaction.set(ref, { uid, period: periodKey(), tier, count: next, lastUsedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { blocked: false, used: next, limit, remaining: limit - next };
  });
  if (result.blocked) {
    const error = new Error(`This month's Titan Intelligence allowance has been reached for ${tier}.`);
    error.code = "usage-exhausted";
    throw error;
  }
  return result;
}

function getUsageLimit(tier) { return USAGE_LIMITS[tier] || 0; }
module.exports = { consumeTitanUsage, getUsageLimit, periodKey, USAGE_LIMITS };