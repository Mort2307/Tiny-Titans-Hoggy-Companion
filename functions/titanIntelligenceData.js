const { getFirestore } = require("firebase-admin/firestore");
const { rescueMembership, rescueWorkspaceActive } = require("./titanIntelligenceAccess");

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
  const [universalSnapshot, legacySnapshot] = await Promise.all([
    db.collection("users").doc(ownerUid).collection("animals").get(),
    db.collection("users").doc(ownerUid).collection("snakes").get(),
  ]);

  const universal = universalSnapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: `animal:${doc.id}`,
      recordId: doc.id,
      recordSource: "universal",
      name: String(data.name || "Unnamed animal"),
      species: String(data.speciesCommonName || data.scientificName || "Species awaiting identification"),
      scientificName: data.scientificName ? String(data.scientificName) : undefined,
      animalGroup: data.animalGroup ? String(data.animalGroup) : undefined,
      morph: data.morphOrColour ? String(data.morphOrColour) : undefined,
      sex: data.sex ? String(data.sex) : undefined,
      status: data.status ? String(data.status) : undefined,
    };
  });

  const legacy = legacySnapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: `snake:${doc.id}`,
      recordId: doc.id,
      recordSource: "legacy-snake",
      name: String(data.name || "Unnamed animal"),
      species: String(data.species || data.speciesName || "Species awaiting identification"),
      scientificName: data.universalScientificName ? String(data.universalScientificName) : undefined,
      animalGroup: "reptile",
      morph: data.morph ? String(data.morph) : undefined,
      sex: data.sex ? String(data.sex) : undefined,
      status: data.status ? String(data.status) : undefined,
    };
  });

  return [...universal, ...legacy].sort((a, b) => a.name.localeCompare(b.name));
}

function parseAnimalToolId(animalId) {
  const raw = String(animalId || "").trim();
  if (raw.startsWith("animal:")) return { source: "universal", id: raw.slice(7) };
  if (raw.startsWith("snake:")) return { source: "legacy-snake", id: raw.slice(6) };
  return { source: "auto", id: raw };
}

async function getAnimalProfile(uid, animalId) {
  const ownerUid = await resolveDataOwnerUid(uid);
  const target = parseAnimalToolId(animalId);

  if (target.source === "universal" || target.source === "auto") {
    const snapshot = await db.collection("users").doc(ownerUid).collection("animals").doc(target.id).get();
    if (snapshot.exists) {
      const data = snapshot.data() || {};
      return {
        id: `animal:${snapshot.id}`,
        recordId: snapshot.id,
        recordSource: "universal",
        name: String(data.name || "Unnamed animal"),
        species: String(data.speciesCommonName || data.scientificName || "Species awaiting identification"),
        scientificName: data.scientificName ? String(data.scientificName) : undefined,
        animalGroup: data.animalGroup ? String(data.animalGroup) : undefined,
        morph: data.morphOrColour ? String(data.morphOrColour) : undefined,
        sex: data.sex ? String(data.sex) : undefined,
        birthDate: serialise(data.hatchOrBirthDate),
        acquisitionDate: serialise(data.acquisitionDate),
        status: data.status ? String(data.status) : undefined,
        notes: data.notes ? String(data.notes).slice(0, 1200) : undefined,
        tags: Array.isArray(data.tags) ? data.tags.slice(0, 30) : [],
      };
    }
    if (target.source === "universal") return null;
  }

  const snapshot = await db.collection("users").doc(ownerUid).collection("snakes").doc(target.id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return {
    id: `snake:${snapshot.id}`,
    recordId: snapshot.id,
    recordSource: "legacy-snake",
    name: String(data.name || "Unnamed animal"),
    species: String(data.species || data.speciesName || "Species awaiting identification"),
    scientificName: data.universalScientificName ? String(data.universalScientificName) : undefined,
    animalGroup: "reptile",
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
  const target = parseAnimalToolId(animalId);

  if (target.source === "universal") {
    const snapshot = await db.collection("users").doc(ownerUid).collection("animals").doc(target.id).get();
    if (!snapshot.exists) return null;
    return { weights: [], feedings: [], sheds: [], health: [], behaviours: [], dataSource: "universal-animal-record", note: "The universal animal record exists; detailed tracker history is only available where a linked tracker service has recorded it." };
  }

  if (target.source === "auto") {
    const universalSnapshot = await db.collection("users").doc(ownerUid).collection("animals").doc(target.id).get();
    if (universalSnapshot.exists) {
      return { weights: [], feedings: [], sheds: [], health: [], behaviours: [], dataSource: "universal-animal-record", note: "The universal animal record exists; detailed tracker history is only available where a linked tracker service has recorded it." };
    }
  }

  const base = db.collection("users").doc(ownerUid).collection("snakes").doc(target.id);
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
  const records = await getAnimalRecords(uid, animalId);\n  if (!records) return null;
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

async function requireRescueContext(uid) {
  const membership = await rescueMembership(uid);
  if (!membership) throw new Error("You are not a member of a Tiny Titans Rescue workspace.");
  if (!rescueWorkspaceActive(membership.organisation)) throw new Error("The Rescue workspace is not currently active.");
  return membership;
}

const ROLE_VISIBILITY = Object.freeze({ owner: "medical", manager: "medical", medical: "medical", staff: "staff", foster: "public", viewer: "public" });
const VISIBILITY_RANK = Object.freeze({ public: 0, staff: 1, medical: 2 });
function roleVisibility(role) { return ROLE_VISIBILITY[role] || "public"; }
function canSeeVisibility(role, visibility) { return VISIBILITY_RANK[visibility || "public"] <= VISIBILITY_RANK[roleVisibility(role)]; }
function filterVisibility(items, role) { return (Array.isArray(items) ? items : []).filter((item) => canSeeVisibility(role, String(item?.visibility || "public"))); }
function serialiseItems(items) { return Array.isArray(items) ? items.map((item) => serialise(item)) : []; }

function sanitiseRescueAnimal(animal, role, fullHistory = false) {
  const output = {
    id: animal.id,
    organisationId: String(animal.organisationId || ""),
    name: String(animal.name || "Rescue animal"),
    previousName: animal.previousName ? String(animal.previousName) : undefined,
    previousIdentifier: animal.previousIdentifier ? String(animal.previousIdentifier) : undefined,
    speciesCommonName: String(animal.speciesCommonName || "Species awaiting identification"),
    scientificName: String(animal.scientificName || ""),
    sex: String(animal.sex || "Unknown"),
    morphOrColour: String(animal.morphOrColour || ""),
    estimatedAge: String(animal.estimatedAge || ""),
    estimatedDob: animal.estimatedDob ? String(animal.estimatedDob) : undefined,
    status: String(animal.status || "in_care"),
    intakeDate: String(animal.intakeDate || ""),
    enclosure: String(animal.enclosure || ""),
    publicSummary: String(animal.publicSummary || ""),
    husbandrySummary: String(animal.husbandrySummary || ""),
    createdAt: String(animal.createdAt || ""),
    updatedAt: String(animal.updatedAt || ""),
  };
  const privileged = ["owner", "manager", "medical"].includes(role);
  const operational = ["owner", "manager", "medical", "staff"].includes(role);
  if (operational) {
    output.microchipNumber = animal.microchipNumber ? String(animal.microchipNumber) : undefined;
    output.secondaryIdentifier = animal.secondaryIdentifier ? String(animal.secondaryIdentifier) : undefined;
    output.lifecycle = serialiseItems(filterVisibility(animal.lifecycle, role));
    output.locations = serialiseItems(filterVisibility(animal.locations, role));
    output.quarantine = ["owner", "manager", "medical", "staff"].includes(role) && animal.quarantine ? serialise(animal.quarantine) : undefined;
    if (privileged && animal.intakeRecord) output.intakeRecord = serialise(animal.intakeRecord);
    if (privileged && animal.privateNotes) output.privateNotes = String(animal.privateNotes).slice(0, 1600);
  }
  if (fullHistory) {
    output.timeline = serialiseItems(filterVisibility(animal.timeline, role).slice(0, 160));
    output.careRecords = serialiseItems(filterVisibility(animal.careRecords, role).slice(0, 160));
    output.transfers = serialiseItems(filterVisibility(animal.transfers, role).slice(0, 80));
    output.fosterPlacements = serialiseItems(filterVisibility(animal.fosterPlacements, role).slice(0, 80));
    output.documents = serialiseItems(filterVisibility(animal.documents, role).slice(0, 80));
    output.reminders = serialiseItems(Array.isArray(animal.reminders) ? animal.reminders.slice(0, 80) : []);
  }
  return output;
}

async function rescueAnimalSnapshot(uid, animalId) {
  const membership = await requireRescueContext(uid);
  const snapshot = await db.collection("rescueAnimals").doc(String(animalId)).get();
  if (!snapshot.exists) return { membership, animal: null };
  const animal = snapshot.data() || {};
  if (String(animal.organisationId || "") !== membership.organisationId) throw new Error("That animal does not belong to the active Rescue workspace.");
  return { membership, animal: { id: snapshot.id, ...animal } };
}

async function listRescueAnimals(uid) {
  const membership = await requireRescueContext(uid);
  const snapshot = await db.collection("rescueAnimals").where("organisationId", "==", membership.organisationId).get();
  return snapshot.docs
    .map((doc) => sanitiseRescueAnimal({ id: doc.id, ...doc.data() }, membership.role, false))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function getRescueAnimalProfile(uid, animalId) {
  const { membership, animal } = await rescueAnimalSnapshot(uid, animalId);
  return animal ? sanitiseRescueAnimal(animal, membership.role, false) : null;
}

async function getRescueAnimalRecords(uid, animalId) {
  const { membership, animal } = await rescueAnimalSnapshot(uid, animalId);
  if (!animal) return null;
  const profile = sanitiseRescueAnimal(animal, membership.role, false);
  const recordView = sanitiseRescueAnimal(animal, membership.role, true);
  return {
    profile,
    role: membership.role,
    organisationId: membership.organisationId,
    timeline: recordView.timeline || [],
    careRecords: recordView.careRecords || [],
    reminders: recordView.reminders || [],
    transfers: recordView.transfers || [],
    fosterPlacements: recordView.fosterPlacements || [],
    documents: recordView.documents || [],
    recordCounts: {
      timeline: (recordView.timeline || []).length,
      careRecords: (recordView.careRecords || []).length,
      reminders: (recordView.reminders || []).length,
      transfers: (recordView.transfers || []).length,
      fosterPlacements: (recordView.fosterPlacements || []).length,
      documents: (recordView.documents || []).length,
    },
    visibility: roleVisibility(membership.role),
    dataLimitations: ["Only records visible to this Rescue role are included.", "Medical/private records are omitted from lower-privilege views.", "Missing records are not treated as evidence that an event did not occur."],
  };
}

async function getRescueCollectionOverview(uid) {
  const membership = await requireRescueContext(uid);
  const animals = await listRescueAnimals(uid);
  const statusCounts = animals.reduce((counts, animal) => {
    const status = String(animal.status || "in_care");
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  return {
    organisationId: membership.organisationId,
    organisationName: String(membership.organisation.name || "Tiny Titans Rescue"),
    role: membership.role,
    animalCount: animals.length,
    statusCounts,
    species: [...new Set(animals.map((animal) => animal.speciesCommonName).filter(Boolean))],
    animals,
  };
}

module.exports = {
  resolveDataOwnerUid,
  listAnimals,
  getAnimalProfile,
  getAnimalRecords,
  getAnimalIntelligenceSnapshot,
  getCollectionOverview,
  listRescueAnimals,
  getRescueAnimalProfile,
  getRescueAnimalRecords,
  getRescueCollectionOverview,
};