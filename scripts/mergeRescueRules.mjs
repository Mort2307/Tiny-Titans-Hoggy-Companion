import fs from "node:fs";

const path = "firestore.rules";
let rules = fs.readFileSync(path, "utf8");
const marker = "    match /{document=**} { allow read, write: if false; }";
const legacyStart = rules.indexOf("    function rescueWorkspaceAccess()");
const rescueStart = rules.indexOf("    function rescueOrgMember(orgId)");
const end = rules.indexOf(marker);
if (legacyStart < 0 || rescueStart < 0 || end < 0 || end <= rescueStart) throw new Error("Rescue rules merge refused: required Rescue rule boundaries were not found.");

rules = rules.slice(0, legacyStart) + rules.slice(rescueStart);
const start = rules.indexOf("    function rescueOrgMember(orgId)");
const mergeEnd = rules.indexOf(marker);
const block = `    function activeRescueTier(uid) {
      return signedIn() && (
        (exists(/databases/$(database)/documents/paidEntitlements/$(uid)) && get(/databases/$(database)/documents/paidEntitlements/$(uid)).data.get('active', false) == true && get(/databases/$(database)/documents/paidEntitlements/$(uid)).data.get('tier', '') == 'rescue' && get(/databases/$(database)/documents/paidEntitlements/$(uid)).data.get('status', '') in ['active', 'trialing'])
        || (exists(/databases/$(database)/documents/paidTrials/$(uid)) && get(/databases/$(database)/documents/paidTrials/$(uid)).data.get('enabled', false) == true && get(/databases/$(database)/documents/paidTrials/$(uid)).data.get('tier', '') == 'rescue' && get(/databases/$(database)/documents/paidTrials/$(uid)).data.get('expiresAt', null) > request.time)
        || (exists(/databases/$(database)/documents/paidTesterOverrides/$(uid)) && get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('enabled', false) == true && get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('tier', '') == 'rescue' && (!get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('expiresAt', null) || get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('expiresAt', null) > request.time))
      );
    }
    function rescuePilotActive(orgId) {
      return get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data.get('pilotStatus', '') == 'pilot_active' && get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data.get('pilotEndsAt', null) > request.time;
    }
    function rescueWorkspaceEnabled(orgId) {
      let org = get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data;
      return org.get('accountType', 'rescue') == 'rescue' && (ownerAccount() || rescuePilotActive(orgId) || activeRescueTier(request.auth.uid) || activeRescueTier(org.get('ownerUid', '')));
    }
    function rescueOrgMember(orgId) {
      let org = get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data;
      return signedIn() && rescueWorkspaceEnabled(orgId) && (org.get('ownerUid', '') == request.auth.uid || request.auth.uid in org.get('managerUids', []) || request.auth.uid in org.get('staffUids', []) || request.auth.uid in org.get('medicalUids', []) || request.auth.uid in org.get('fosterUids', []) || request.auth.uid in org.get('viewerUids', []));
    }
    function rescueOrgEditor(orgId) {
      let org = get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data;
      return signedIn() && rescueWorkspaceEnabled(orgId) && (org.get('ownerUid', '') == request.auth.uid || request.auth.uid in org.get('managerUids', []) || request.auth.uid in org.get('staffUids', []) || request.auth.uid in org.get('medicalUids', []));
    }
    function rescueWritesEnabled() {
      return !exists(/databases/$(database)/documents/platformControls/rescue) || get(/databases/$(database)/documents/platformControls/rescue).data.get('writesEnabled', true) != false;
    }
    match /rescueOrganisations/{orgId} {
      allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid && request.resource.data.accountType == 'rescue' && (request.resource.data.accountStatus == 'pilot_pending' || (request.resource.data.accountStatus == 'paid_active' && activeRescueTier(request.auth.uid)));
      allow get, list: if signedIn() && (resource.data.ownerUid == request.auth.uid || rescueOrgMember(orgId) || isCreator());
      allow update: if signedIn() && resource.data.ownerUid == request.auth.uid && rescueWorkspaceEnabled(orgId) && request.resource.data.ownerUid == resource.data.ownerUid && request.resource.data.accountType == 'rescue' && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'managerUids', 'staffUids', 'medicalUids', 'fosterUids', 'viewerUids', 'speciesDiscovered', 'staffLimit', 'animalLimit', 'storageMbLimit', 'animalCount', 'updatedAt']) && request.resource.data.managerUids.size() + request.resource.data.staffUids.size() + request.resource.data.medicalUids.size() + request.resource.data.fosterUids.size() + request.resource.data.viewerUids.size() <= request.resource.data.get('staffLimit', 5);
      allow delete: if signedIn() && resource.data.ownerUid == request.auth.uid && (activeRescueTier(request.auth.uid) || ownerAccount());
    }
    match /rescueAnimals/{animalId} {
      allow get: if rescueOrgMember(resource.data.organisationId);
      allow list: if rescueOrgMember(resource.data.organisationId);
      allow create: if rescueWritesEnabled() && signedIn() && request.resource.data.organisationId is string && rescueOrgEditor(request.resource.data.organisationId) && request.resource.data.publicPreview is bool;
      allow update: if rescueWritesEnabled() && rescueOrgEditor(resource.data.organisationId) && request.resource.data.organisationId == resource.data.organisationId && request.resource.data.publicPreview is bool;
      allow delete: if rescueWritesEnabled() && signedIn() && get(/databases/$(database)/documents/rescueOrganisations/$(resource.data.organisationId)).data.ownerUid == request.auth.uid && rescueWorkspaceEnabled(resource.data.organisationId);
    }
    match /rescueAnimalPublic/{animalId} {
      allow get: if resource.data.publicPreview == true;
      allow list: if false;
      allow create: if rescueWritesEnabled() && rescueOrgEditor(request.resource.data.organisationId) && request.resource.data.publicPreview == true && request.resource.data.keys().hasOnly(['organisationId', 'publicPreview', 'name', 'speciesCommonName', 'scientificName', 'sex', 'morphOrColour', 'estimatedAge', 'status', 'intakeDate', 'publicSummary', 'timeline', 'createdAt', 'updatedAt']);
      allow update: if rescueWritesEnabled() && rescueOrgEditor(resource.data.organisationId) && request.resource.data.organisationId == resource.data.organisationId && request.resource.data.publicPreview == true && request.resource.data.keys().hasOnly(['organisationId', 'publicPreview', 'name', 'speciesCommonName', 'scientificName', 'sex', 'morphOrColour', 'estimatedAge', 'status', 'intakeDate', 'publicSummary', 'timeline', 'createdAt', 'updatedAt']);
      allow delete: if rescueWritesEnabled() && rescueOrgEditor(resource.data.organisationId);
    }
`;
if (start < 0 || mergeEnd < 0 || mergeEnd <= start) throw new Error("Rescue rules merge refused: generated Rescue block boundaries were not found.");
rules = rules.slice(0, start) + block + rules.slice(mergeEnd);
fs.writeFileSync(path, rules, "utf8");
console.log("Tiny Titans: Rescue paid-access, pilot, membership, record-write and public-projection rules merged.");
