import fs from "node:fs";

const path = "firestore.rules";
let rules = fs.readFileSync(path, "utf8");
const marker = "    match /{document=**} { allow read, write: if false; }";
const start = rules.indexOf("    function rescueOrgMember(orgId)");
const end = rules.indexOf(marker);
if (start < 0 || end < 0 || end <= start) throw new Error("Rescue rules merge refused: rescue block or default deny marker not found.");

const block = `    function activeRescueTier(uid) {
      return signedIn() && (
        (get(/databases/$(database)/documents/paidEntitlements/$(uid)).data.get('active', false) == true
          && get(/databases/$(database)/documents/paidEntitlements/$(uid)).data.get('tier', '') == 'rescue'
          && get(/databases/$(database)/documents/paidEntitlements/$(uid)).data.get('status', '') in ['active', 'trialing'])
        || (get(/databases/$(database)/documents/paidTrials/$(uid)).data.get('enabled', false) == true
          && get(/databases/$(database)/documents/paidTrials/$(uid)).data.get('tier', '') == 'rescue'
          && get(/databases/$(database)/documents/paidTrials/$(uid)).data.get('expiresAt', null) > request.time)
        || (get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('enabled', false) == true
          && get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('tier', '') == 'rescue'
          && (!get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('expiresAt', null) || get(/databases/$(database)/documents/paidTesterOverrides/$(uid)).data.get('expiresAt', null) > request.time))
      );
    }
    function rescuePilotActive(orgId) {
      return get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data.get('pilotStatus', '') == 'pilot_active'
        && get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data.get('pilotEndsAt', null) > request.time;
    }
    function rescueWorkspaceEnabled(orgId) {
      let org = get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data;
      return org.get('accountType', 'rescue') == 'rescue' && (rescuePilotActive(orgId) || activeRescueTier(request.auth.uid) || activeRescueTier(org.get('ownerUid', '')));
    }
    function rescueOrgMember(orgId) {
      let org = get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data;
      return signedIn() && rescueWorkspaceEnabled(orgId) && (org.get('ownerUid', '') == request.auth.uid || request.auth.uid in org.get('staffUids', []) || request.auth.uid in org.get('medicalUids', []) || request.auth.uid in org.get('fosterUids', []) || request.auth.uid in org.get('viewerUids', []));
    }
    function rescueOrgEditor(orgId) {
      let org = get(/databases/$(database)/documents/rescueOrganisations/$(orgId)).data;
      return signedIn() && rescueWorkspaceEnabled(orgId) && (org.get('ownerUid', '') == request.auth.uid || request.auth.uid in org.get('staffUids', []) || request.auth.uid in org.get('medicalUids', []));
    }
    function rescueWritesEnabled() {
      return get(/databases/$(database)/documents/platformControls/rescue).data.get('writesEnabled', true) != false;
    }
    match /rescueOrganisations/{orgId} {
      allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid && request.resource.data.accountType == 'rescue' && request.resource.data.accountStatus in ['pilot_pending', 'pilot_active', 'pilot_expired', 'pilot_suspended', 'paid_active', 'cancelled'];
      allow get, list: if signedIn() && (resource.data.ownerUid == request.auth.uid || rescueOrgMember(orgId) || isCreator());
      allow update: if signedIn() && rescueOrgMember(orgId) && resource.data.ownerUid == request.auth.uid && request.resource.data.ownerUid == resource.data.ownerUid
        && request.resource.data.accountType == 'rescue'
        && request.resource.data.staffUids.size() + request.resource.data.medicalUids.size() + request.resource.data.fosterUids.size() + request.resource.data.viewerUids.size() <= request.resource.data.get('staffLimit', 5);
      allow delete: if signedIn() && resource.data.ownerUid == request.auth.uid && activeRescueTier(request.auth.uid);
    }
    match /rescueAnimals/{animalId} {
      allow get: if rescueOrgMember(resource.data.organisationId);
      allow list: if rescueOrgMember(resource.data.organisationId);
      allow create: if false;
      allow update: if rescueWritesEnabled() && rescueOrgEditor(resource.data.organisationId) && request.resource.data.organisationId == resource.data.organisationId;
      allow delete: if rescueWritesEnabled() && signedIn() && get(/databases/$(database)/documents/rescueOrganisations/$(resource.data.organisationId)).data.ownerUid == request.auth.uid && rescueWorkspaceEnabled(resource.data.organisationId);
    }
    match /rescueAnimalPublic/{animalId} {
      allow get: if resource.data.publicPreview == true;
      allow list: if false;
      allow create: if false;
      allow update: if false;
      allow delete: if rescueWritesEnabled() && rescueOrgEditor(resource.data.organisationId);
    }
`;

rules = rules.slice(0, start) + block + rules.slice(end);
fs.writeFileSync(path, rules, "utf8");
console.log("Tiny Titans: Rescue paid-access and pilot rules merged.");
