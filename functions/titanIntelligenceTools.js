const DECLARATIONS = [
  { name: "list_my_animals", description: "List the reptiles this authenticated Tiny Titans account can access. Use this before asking about an animal when the user has not supplied an ID.", parameters: { type: "OBJECT", properties: {}, required: [] } },
  { name: "get_collection_overview", description: "Summarise the authenticated keeper's animal collection without exposing photos or unrelated account data.", parameters: { type: "OBJECT", properties: {}, required: [] } },
  { name: "get_animal_profile", description: "Retrieve the selected reptile's recorded profile. Use the exact animal ID from list_my_animals.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_animal_records", description: "Retrieve the selected reptile's recorded weight, feeding, shedding, health and behaviour history. Missing data must remain missing.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_animal_intelligence_snapshot", description: "Run deterministic analysis over one recorded animal's history, including weight summary, record counts and clearly labelled temporal associations. Never treat associations as proof of causation.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_workspace_context", description: "Return the current organisation/workspace context available to the authenticated user. This does not expose unrelated private records.", parameters: { type: "OBJECT", properties: {}, required: [] } },
];

function getDeclarations() {
  return [{ functionDeclarations: DECLARATIONS }];
}

async function executeTool(uid, name, args, workspaceKind) {
  const { listAnimals, getAnimalProfile, getAnimalRecords, getAnimalIntelligenceSnapshot, getCollectionOverview } = require("./titanIntelligenceData");
  const { rescueMembership } = require("./titanIntelligenceAccess");
  switch (name) {
    case "list_my_animals": return workspaceKind === "personal" ? { kind: "user_data", data: await listAnimals(uid) } : { kind: "workspace_context", data: { message: "This workspace does not yet expose its animal register through the personal-animal tool. Do not substitute personal animals.", workspaceKind } };
    case "get_collection_overview": return workspaceKind === "personal" ? { kind: "user_data", data: await getCollectionOverview(uid) } : { kind: "workspace_context", data: { message: "This workspace does not yet expose a collection overview through the personal-animal tool. Do not substitute personal animals.", workspaceKind } };
    case "get_animal_profile": return workspaceKind === "personal" ? { kind: "user_data", data: await getAnimalProfile(uid, String(args?.animalId || "")) } : { kind: "workspace_context", data: { message: "This workspace does not yet expose personal animal records. Do not substitute data from another workspace.", workspaceKind } };
    case "get_animal_records": return workspaceKind === "personal" ? { kind: "user_data", data: await getAnimalRecords(uid, String(args?.animalId || "")) } : { kind: "workspace_context", data: { message: "This workspace does not yet expose personal animal records. Do not substitute data from another workspace.", workspaceKind } };
    case "get_animal_intelligence_snapshot": return workspaceKind === "personal" ? { kind: "calculated_data", data: await getAnimalIntelligenceSnapshot(uid, String(args?.animalId || "")) } : { kind: "workspace_context", data: { message: "This workspace does not yet expose personal animal analysis. Do not substitute data from another workspace.", workspaceKind } };
    case "get_workspace_context": {
      const membership = await rescueMembership(uid);
      return { kind: "workspace_context", data: { requestedWorkspace: workspaceKind, rescue: membership ? { organisationId: membership.organisationId, role: membership.role, name: String(membership.organisation.name || "TinyTitans Rescue") } : null } };
    }
    default: throw new Error(`Unknown Titan tool: ${name}`);
  }
}

module.exports = { getDeclarations, executeTool, declarations: DECLARATIONS };