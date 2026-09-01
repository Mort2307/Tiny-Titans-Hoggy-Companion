const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Stripe = require("stripe");

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

Object.assign(exports, require("./creatorApproval"));
Object.assign(exports, require("./communityIntelligence"));
Object.assign(exports, require("./publicContributions"));
Object.assign(exports, require("./communityBenchmarks"));
Object.assign(exports, require("./titanGoals"));
const creatorTesterInvitation = require("./creatorTesterInvitation");
Object.assign(exports, {
  getCreatorTesterInvitation: creatorTesterInvitation.getCreatorTesterInvitation,
  acceptCreatorTesterInvitation: creatorTesterInvitation.acceptCreatorTesterInvitation,
  declineCreatorTesterInvitation: creatorTesterInvitation.declineCreatorTesterInvitation,
});

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const PRICE_TIERS = Object.freeze({
  little: { priceId: "price_1U4E9q3zyS86a3ry2Lrikcjq", amount: 5, label: "Little Titan" },
  growing: { priceId: "price_1U4EBp3zyS86a3ryn3HfNU0R", amount: 10, label: "Growing Titan" },
  champion: { priceId: "price_1U4EDE3zyS86a3ryKXVPLEhd", amount: 20, label: "Champion Titan" },
  legendary: { priceId: "price_1U4EDx3zyS86a3ryxlW1Scz8", amount: 40, label: "Legendary Titan" },
  broken: { priceId: "price_1U4EEf3zyS86a3ryLupeschV", amount: 100, label: "You Just Broke Me" },
});
const ALLOWED_ORIGINS = new Set([
  "https://tinytitans-hoggy-companion.web.app",
  "https://tinytitans-hoggy-companion.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
function getAllowedOrigin(request) {
  const origin = request.rawRequest?.headers?.origin || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "https://tinytitans-hoggy-companion.web.app";
}
