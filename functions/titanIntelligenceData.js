const { getFirestore } = require("firebase-admin/firestore");
const { rescueMembership, rescueWorkspaceActive } = require("./titanIntelligenceAccess");
const { buildAnimalIntelligenceSnapshot } = require("./titanIntelligenceAnalysis");

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
  return buildAnimalIntelligenceSnapshot(profile, records);
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