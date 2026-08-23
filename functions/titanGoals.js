const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

exports.getTitanSupportStats = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to view the Titan Fund.");
  try {
    const statsSnapshot = await db.collection("supporterStats").doc("global").get();
    if (statsSnapshot.exists) {
      const data = statsSnapshot.data() || {};
      const totalSupporters = Number(data.totalSupporters || 0);
      const totalReceivedGbp = Number(data.totalReceivedGbp || 0);
      if (Number.isFinite(totalSupporters) && Number.isFinite(totalReceivedGbp)) {
        return { totalSupporters, totalReceivedGbp, updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null };
      }
    }

    // Safe fallback for older installs where supporterStats/global has not yet been created.
    const supportersSnapshot = await db.collection("supporters").where("status", "==", "active").get();
    const totalReceivedGbp = supportersSnapshot.docs.reduce((sum, supporter) => sum + Number(supporter.data().amountGbp || 0), 0);
    return { totalSupporters: supportersSnapshot.size, totalReceivedGbp, updatedAt: null };
  } catch (error) {
    console.error("Titan Fund stats lookup failed", error);
    throw new HttpsError("internal", "The live Titan Fund could not be loaded right now.");
  }
});
