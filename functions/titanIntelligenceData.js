const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();
const TRACKERS = ["weights", "feedings", "sheds", "health", "behaviours"];

function serialise(value, depth = 0) {
  if (depth > 3) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 600 ? `${value.slice(0, 600)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "object" && typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString();
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => serialise(item, depth + 1));
  if (typeof value === "object") {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === "photo" || key === "photoUrl" || key === "imageUrl") continue;
      output[key] = serialise(child, depth + 1);
    }
    return output;
  }
  return String(value);
}

async function resolveDataOwnerUid(uid) {
  const profile = await db.collection("users").doc(uid).get();
  const familyId = profile.exists ? profile.data()?.familyId : null;
  if (!familyId) return uid;
  const family = await db.collection("families").doc(String(familyId)).get();
  return family.exists && family.data()?.ownerUid ? String(family.data().ownerUid) : uid;
}

async function listAnimals(uid) {
  const ownerUid = await resolveDataOwnerUid(uid);
  const snapshot = await db.collection("users").doc(ownerUid).collection("snakes").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      name: String(data.name || "Unnamed animal"),
      species: String(data.species || data.speciesName || "Unknown species"),
      morph: data.morph ? String(data.morph) : undefined,
      sex: data.sex ? String(data.sex) : undefined,
      status: data.status ? String(data.status) : undefined,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function getAnimalProfile(uid, animalId) {
  const ownerUid = await resolveDataOwnerUid(uid);
  const snapshot = await db.collection("users").doc(ownerUid).collection("snakes").doc(animalId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    name: String(data.name || "Unnamed animal"),
    species: String(data.species || data.speciesName || "Unknown species"),
    morph: data.morph ? String(data.morph) : undefined,
    sex: data.sex ? String(data.sex) : undefined,
    birthDate: serialise(data.birthDate),
    acquisitionDate: serialise(data.acquisitionDate),
    status: data.status ? String(data.status) : undefined,
    notes: data.notes ? String(data.notes).slice(0, 1200) : undefined,
  };
}

async function getAnimalRecords(uid, animalId) {
  const ownerUid = await resolveDataOwnerUid(uid);
  const base = db.collection("users").doc(ownerUid).collection("snakes").doc(animalId);
  const snapshots = await Promise.all(TRACKERS.map((name) => base.collection(name).get()));
  const records = {};
  snapshots.forEach((snapshot, index) => {
    records[TRACKERS[index]] = snapshot.docs.slice(0, 100).map((doc) => ({ id: doc.id, ...serialise(doc.data()) }));
  });
  return records;
}

async function getAnimalIntelligenceSnapshot(uid, animalId) {
  const profile = await getAnimalProfile(uid, animalId);
  if (!profile) return null;
  const records = await getAnimalRecords(uid, animalId);
  const weights = (records.weights || [])
    .map((item) => ({ date: Date.parse(String(item.date || item.recordedAt || item.createdAt || "")), grams: Number(item.grams ?? item.weightGrams ?? item.weight ?? NaN) }))
    .filter((item) => Number.isFinite(item.date) && Number.isFinite(item.grams) && item.grams > 0)
    .sort((a, b) => a.date - b.date);
  const feedings = records.feedings || [];
  const sheds = records.sheds || [];
  const behaviours = records.behaviours || [];
  const health = records.health || [];
  const refusals = feedings.filter((item) => /refus|declin|ignore|not\s*(eat|interested)|reject/i.test(JSON.stringify(item))).length;
  const firstWeight = weights[0]?.grams;
  const currentWeight = weights.at(-1)?.grams;
  const changeGrams = Number.isFinite(firstWeight) && Number.isFinite(currentWeight) ? Number((currentWeight - firstWeight).toFixed(2)) : undefined;
  let feedRefusalAroundShed = undefined;
  if (refusals > 0 && sheds.length > 0) {
    const shedDates = sheds.map((item) => Date.parse(String(item.date || item.recordedAt || item.createdAt || ""))).filter(Number.isFinite);
    const refusalDates = feedings.filter((item) => /refus|declin|ignore|not\s*(eat|interested)|reject/i.test(JSON.stringify(item))).map((item) => Date.parse(String(item.date || item.recordedAt || item.createdAt || ""))).filter(Number.isFinite);
    let matches = 0;
    for (const refusalDate of refusalDates) if (shedDates.some((shedDate) => Math.abs(refusalDate - shedDate) <= 7 * 86400000)) matches += 1;
    feedRefusalAroundShed = { refusalCount: refusalDates.length, withinSevenDaysOfShed: matches, interpretation: "Temporal overlap only; this does not establish that shedding caused feeding refusal." };
  }
  const sampleCount = weights.length;
  return {
    profile,
    recordCounts: { weights: weights.length, feedings: feedings.length, sheds: sheds.length, behaviours: behaviours.length, health: health.length },
    weightSummary: { sampleCount, firstWeight, currentWeight, changeGrams, confidence: sampleCount >= 6 ? "High" : sampleCount >= 3 ? "Moderate" : "More data needed" },
    feedingSummary: { total: feedings.length, refusals },
    possibleTemporalAssociations: feedRefusalAroundShed ? [feedRefusalAroundShed] : [],
    dataLimitations: ["Only recorded Tiny Titans data was analysed.", "Missing records are not treated as negative evidence.", "Temporal associations are not treated as causation."],
  };
}

async function getCollectionOverview(uid) {
  const animals = await listAnimals(uid);
  return {
    animalCount: animals.length,
    species: [...new Set(animals.map((animal) => animal.species).filter(Boolean))],
    morphsRecorded: [...new Set(animals.map((animal) => animal.morph).filter(Boolean))],
    animals,
  };
}

module.exports = { resolveDataOwnerUid, listAnimals, getAnimalProfile, getAnimalRecords, getAnimalIntelligenceSnapshot, getCollectionOverview };