const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

function normaliseSocialUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let parsed;
  try { parsed = new URL(raw); } catch { throw new HttpsError("invalid-argument", "Please enter a valid social media link."); }
  if (parsed.protocol !== "https:") throw new HttpsError("invalid-argument", "Social media links must use HTTPS.");
  return raw;
}

async function getAccountDisplayName(uid) {
  const profile = await db.collection("users").doc(uid).get();
  const data = profile.data() || {};
  return String(data.displayName || "").trim();
}

exports.getTitanWallRecognition = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Please sign in first.");
  const uid = request.auth.uid;
  const wallDoc = await db.collection("supporterWall").doc(uid).get();
  const wall = wallDoc.exists ? wallDoc.data() : {};
  const supporterDoc = await db.collection("supporters").doc(uid).get();
  const supporter = supporterDoc.exists ? supporterDoc.data() : {};
  const suggestedName = await getAccountDisplayName(uid);
  if (!supporterDoc.exists || supporter.status !== "active") return { isTitan: false, needsChoice: false, visibility: null, displayName: suggestedName, socialUrl: "" };
  const visibility = wall.visibility === "named" || wall.visibility === "anonymous" ? wall.visibility : null;
  const needsChoice = visibility === null || wall.recognitionStatus === "pending";
  const displayName = needsChoice && (!wall.displayName || wall.displayName === "Anonymous Titan") ? suggestedName : String(wall.displayName || suggestedName || "");
  return {
    isTitan: true,
    needsChoice,
    visibility,
    displayName,
    suggestedName,
    socialUrl: String(wall.socialUrl || ""),
    tierLabel: String(supporter.tierLabel || wall.tierLabel || "Titan Supporter"),
  };
});

exports.setTitanWallRecognition = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Please sign in first.");
  const uid = request.auth.uid;
  const visibility = String(request.data?.visibility || "");
  if (visibility !== "named" && visibility !== "anonymous") throw new HttpsError("invalid-argument", "Choose whether to show your name or remain anonymous.");
  const supporterDoc = await db.collection("supporters").doc(uid).get();
  if (!supporterDoc.exists || supporterDoc.data()?.status !== "active") throw new HttpsError("failed-precondition", "You need an active Titan support record before choosing Wall recognition.");
  const supporter = supporterDoc.data() || {};
  const suggestedName = await getAccountDisplayName(uid);
  const suppliedName = String(request.data?.displayName || "").trim();
  const displayName = visibility === "named" ? suppliedName || suggestedName : "Anonymous Titan";
  if (visibility === "named" && !displayName) throw new HttpsError("invalid-argument", "Please enter the name you would like shown on the Wall of Titans.");
  const socialUrl = normaliseSocialUrl(request.data?.socialUrl);
  await db.collection("supporterWall").doc(uid).set({ uid, displayName, socialUrl, visibility, recognitionStatus: "chosen", tierLabel: String(supporter.tierLabel || "Titan Supporter"), amountGbp: Number(supporter.amountGbp || 0), supportedAt: supporter.lastPaymentAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { saved: true, visibility, displayName, socialUrl };
});

Object.assign(exports, require("./featureVoting"));
