const { listAnimals, getAnimalProfile, getAnimalRecords, getAnimalIntelligenceSnapshot, getCollectionOverview } = require("./titanIntelligenceData");
const { rescueMembership } = require("./titanIntelligenceAccess");

const declarations = [
  { name: "list_my_animals", description: "List the reptiles this authenticated Tiny Titans account can access. Use this before asking about an animal when the user has not supplied an ID.", parameters: { type: "object", properties: {}, required: [] } },
  { name: "get_collection_overview", description: "Summarise the authenticated keeper's animal collection without exposing photos or unrelated account data.", parameters: { type: "object", properties: {}, required: [] } },
  { name: "get_animal_profile", description: "Retrieve the selected reptile's recorded profile. Use the exact animal ID from list_my_animals.", parameters: { type: "object", properties: { animalId: { type: "string", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_animal_records", description: "Retrieve the selected reptile's recorded weight, feeding, shedding, health and behaviour history. Missing data must remain missing.", parameters: { type: "object", properties: { animalId: { type: "string", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_animal_intelligence_snapshot", description: "Run deterministic analysis over one recorded animal's history, including weight summary, record counts and clearly labelled temporal associations. Never treat associations as proof of causation.", parameters: { type: "object", properties: { animalId: { type: "string", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_workspace_context", description: "Return the current organisation/workspace context available to the authenticated user. This does not expose unrelated private records.", parameters: { type: "object", properties: {}, required: [] } },
];

function getDeclarations() { return [{ functionDeclarations: declarations }]; }

async function executeTool(uid, name, args, workspaceKind) {
  switch (name) {
    case "list_my_animals": return { kind: "user_data", data: await listAnimals(uid) };
    case "get_collection_overview": return { kind: "user_data", data: await getCollectionOverview(uid) };
    case "get_animal_profile": return { kind: "user_data", data: await getAnimalProfile(uid, String(args?.animalId || "")) };
    case "get_animal_records": return { kind: "user_data", data: await getAnimalRecords(uid, String(args?.animalId || "")) };
    case "get_animal_intelligence_snapshot": return { kind: "calculated_data", data: await getAnimalIntelligenceSnapshot(uid, String(args?.animalId || "")) };
    case "get_workspace_context": {
      const membership = await rescueMembership(uid);
      return {
        kind: "workspace_context",
        data: {
          requestedWorkspace: workspaceKind,
          rescue: membership ? { organisationId: membership.organisationId, role: membership.role, name: String(membership.organisation.name || "TinyTitans Rescue") } : null,
        },
      };
    }
    default: throw new Error(`Unknown Titan tool: ${name}`);
  }
}

module.exports = { getDeclarations, executeTool, declarations };