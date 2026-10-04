const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const CATEGORIES = new Set(["exotics_vet", "veterinary_practice", "rescue", "reptile_shop", "breeder", "supplier"]);
const ANIMAL_GROUPS = new Set(["reptiles", "snakes", "lizards", "turtles_tortoises", "amphibians", "arachnids", "invertebrates", "fish", "birds", "mammals", "exotics"]);
const MAX_PENDING_PER_USER = 5;

function requireAuth(request) {
  const uid = String(request.auth?.uid || "");
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return uid;
}
async function requireModerator(request) {
  const uid = requireAuth(request);
  if (request.auth?.token?.creator === true || request.auth?.token?.admin === true || request.auth?.token?.superAdmin === true) return uid;
  const snapshot = await db.collection("users").doc(uid).get();
  const profile = snapshot.data() || {};
  if (profile.role === "admin" || profile.profileType === "creator") return uid;
  throw new HttpsError("permission-denied", "Creator access is required.");
}
function textValue(value, field, maxLength, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new HttpsError("invalid-argument", field + " is required.");
  if (result.length > maxLength) throw new HttpsError("invalid-argument", field + " is too long.");
  return result;
}
function safeUrl(value) {
  const result = textValue(value, "website", 300);
  if (!result) return "";
  try {
    const url = new URL(result);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported");
    return url.toString();
  } catch {
    throw new HttpsError("invalid-argument", "Website must be a valid http or https URL.");
  }
}
function safeCategory(value) {
  const result = String(value || "").trim();
  if (!CATEGORIES.has(result)) throw new HttpsError("invalid-argument", "Choose a supported service category.");
  return result;
}
function safeGroups(value) {
  const values = Array.isArray(value) ? value.map((item) => String(item || "").trim()) : [];
  const unique = [...new Set(values.filter((item) => ANIMAL_GROUPS.has(item)))];
  if (!unique.length) throw new HttpsError("invalid-argument", "Choose at least one supported animal group.");
  return unique.slice(0, 12);
}
function normaliseEntry(raw) {
  const name = textValue(raw?.name, "name", 120, true);
  const category = safeCategory(raw?.category);
  const animalGroups = safeGroups(raw?.animalGroups);
  const city = textValue(raw?.city, "city", 100, true);
  const region = textValue(raw?.region, "region", 100);
  const postcode = textValue(raw?.postcode, "postcode", 24);
  const countryCode = textValue(raw?.countryCode || "GB", "countryCode", 2, true).toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new HttpsError("invalid-argument", "Country code must use two letters.");
  const line1 = textValue(raw?.line1, "address", 160);
  const phone = textValue(raw?.phone, "phone", 40);
  const email = textValue(raw?.email, "email", 160);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpsError("invalid-argument", "Enter a valid email address.");
  const website = safeUrl(raw?.website);
  const notes = textValue(raw?.notes, "notes", 1200);
  const emergencyCare = raw?.emergencyCare === true;
  const duplicateKey = crypto.createHash("sha256").update([name, postcode, city, countryCode].map((part) => part.toLowerCase()).join("|")).digest("hex");
  return { name, category, animalGroups, line1, city, region, postcode, countryCode, phone, email, website, notes, emergencyCare, duplicateKey };
}
function publicRecord(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    name: String(data.name || ""),
    category: String(data.category || ""),
    animalGroups: Array.isArray(data.animalGroups) ? data.animalGroups : [],
    line1: String(data.line1 || ""),
    city: String(data.city || ""),
    region: String(data.region || ""),
    postcode: String(data.postcode || ""),
    countryCode: String(data.countryCode || ""),
    phone: String(data.phone || ""),
    email: String(data.email || ""),
    website: String(data.website || ""),
    notes: String(data.notes || ""),
    emergencyCare: data.emergencyCare === true,
    verificationStatus: "creator_reviewed",
    verifiedAtMs: Number(data.verifiedAtMs || 0) || null,
    communitySubmissionCount: Number(data.communitySubmissionCount || 1),
  };
}

exports.listVerifiedServices = onCall({ region: "europe-west2" }, async (request) => {
  requireAuth(request);
  const category = String(request.data?.category || "").trim();
  const countryCode = String(request.data?.countryCode || "").trim().toUpperCase();
  if (category && !CATEGORIES.has(category)) throw new HttpsError("invalid-argument", "Unsupported category.");
  const snapshot = await db.collection("serviceDirectory").where("status", "==", "verified").limit(500).get();
  let services = snapshot.docs.map(publicRecord);
  if (category) services = services.filter((item) => item.category === category);
  if (countryCode) services = services.filter((item) => item.countryCode === countryCode);
  services.sort((a, b) => a.name.localeCompare(b.name));
  return { services };
});

exports.submitServiceDirectoryEntry = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireAuth(request);
  const entry = normaliseEntry(request.data?.entry || {});
  const pending = await db.collection("serviceDirectorySubmissions").where("submitterUid", "==", uid).limit(20).get();
  const pendingCount = pending.docs.filter((item) => item.data()?.status === "pending").length;
  if (pendingCount >= MAX_PENDING_PER_USER) throw new HttpsError("resource-exhausted", "You already have five directory suggestions awaiting review.");

  const existing = await db.collection("serviceDirectory").where("duplicateKey", "==", entry.duplicateKey).limit(5).get();
  if (existing.docs.some((item) => item.data()?.status === "verified")) throw new HttpsError("already-exists", "This service already appears to be in the reviewed directory.");

  const nowMs = Date.now();
  const ref = db.collection("serviceDirectorySubmissions").doc();
  await ref.set({
    ...entry,
    submitterUid: uid,
    status: "pending",
    submittedAt: FieldValue.serverTimestamp(),
    submittedAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true, submissionId: ref.id };
});

exports.listServiceDirectorySubmissions = onCall({ region: "europe-west2" }, async (request) => {
  await requireModerator(request);
  const status = String(request.data?.status || "pending");
  if (!["pending", "approved", "rejected"].includes(status)) throw new HttpsError("invalid-argument", "Unsupported review status.");
  const snapshot = await db.collection("serviceDirectorySubmissions").where("status", "==", status).limit(200).get();
  const submissions = snapshot.docs.map((item) => {
    const data = item.data() || {};
    return {
      id: item.id,
      name: String(data.name || ""),
      category: String(data.category || ""),
      animalGroups: Array.isArray(data.animalGroups) ? data.animalGroups : [],
      line1: String(data.line1 || ""),
      city: String(data.city || ""),
      region: String(data.region || ""),
      postcode: String(data.postcode || ""),
      countryCode: String(data.countryCode || ""),
      phone: String(data.phone || ""),
      email: String(data.email || ""),
      website: String(data.website || ""),
      notes: String(data.notes || ""),
      emergencyCare: data.emergencyCare === true,
      submittedAtMs: Number(data.submittedAtMs || 0) || null,
      status: String(data.status || ""),
    };
  }).sort((a, b) => Number(a.submittedAtMs || 0) - Number(b.submittedAtMs || 0));
  return { submissions };
});

exports.reviewServiceDirectorySubmission = onCall({ region: "europe-west2" }, async (request) => {
  const moderatorUid = await requireModerator(request);
  const submissionId = textValue(request.data?.submissionId, "submissionId", 100, true);
  const decision = String(request.data?.decision || "").trim();
  if (!["approve", "reject"].includes(decision)) throw new HttpsError("invalid-argument", "Decision must be approve or reject.");
  const reviewNote = textValue(request.data?.reviewNote, "reviewNote", 800);
  const ref = db.collection("serviceDirectorySubmissions").doc(submissionId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Directory submission was not found.");
  const data = snapshot.data() || {};
  if (data.status !== "pending") throw new HttpsError("failed-precondition", "This submission has already been reviewed.");

  const nowMs = Date.now();
  if (decision === "reject") {
    const batch = db.batch();
    batch.set(ref, {
      status: "rejected",
      reviewNote,
      reviewedByUid: moderatorUid,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db.collection("serviceDirectoryAudit").doc(), {
      action: "reject",
      submissionId,
      serviceId: null,
      moderatorUid,
      submitterUid: String(data.submitterUid || ""),
      reviewNote,
      createdAt: FieldValue.serverTimestamp(),
    });
    const submitterUid = String(data.submitterUid || "");
    if (submitterUid) {
      batch.set(db.collection("users").doc(submitterUid).collection("notificationEvents").doc(`service-directory-review-${submissionId}`), {
        type: "service-directory-review",
        title: "Service suggestion reviewed",
        body: `${String(data.name || "Your service suggestion")} was reviewed but was not published.`,
        url: "/services",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
    return { success: true, decision: "rejected" };
  }

  const duplicate = await db.collection("serviceDirectory").where("duplicateKey", "==", String(data.duplicateKey || "")).limit(5).get();
  const existingVerified = duplicate.docs.find((item) => item.data()?.status === "verified");
  const batch = db.batch();
  let serviceId = "";
  if (existingVerified) {
    const existingRef = existingVerified.ref;
    serviceId = existingRef.id;
    batch.set(existingRef, {
      communitySubmissionCount: FieldValue.increment(1),
      lastConfirmedAt: FieldValue.serverTimestamp(),
      lastConfirmedAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } else {
    const serviceRef = db.collection("serviceDirectory").doc();
    serviceId = serviceRef.id;
    const entry = normaliseEntry(data);
    batch.set(serviceRef, {
      ...entry,
      status: "verified",
      verificationMethod: "creator_review",
      verifiedByUid: moderatorUid,
      verifiedAt: FieldValue.serverTimestamp(),
      verifiedAtMs: nowMs,
      communitySubmissionCount: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  batch.set(ref, {
    status: "approved",
    serviceId,
    reviewNote,
    reviewedByUid: moderatorUid,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(db.collection("serviceDirectoryAudit").doc(), {
    action: "approve",
    submissionId,
    serviceId,
    moderatorUid,
    submitterUid: String(data.submitterUid || ""),
    reviewNote,
    createdAt: FieldValue.serverTimestamp(),
  });
  const submitterUid = String(data.submitterUid || "");
  if (submitterUid) {
    batch.set(db.collection("users").doc(submitterUid).collection("notificationEvents").doc(`service-directory-review-${submissionId}`), {
      type: "service-directory-review",
      title: "Service suggestion published",
      body: `${String(data.name || "Your service suggestion")} has been reviewed and published in Tiny Titans Services.`,
      url: "/services",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  return { success: true, decision: "approved", serviceId };
});
