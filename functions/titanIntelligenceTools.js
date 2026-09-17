const DECLARATIONS = [
  { name: "list_my_animals", description: "List the reptiles this authenticated Tiny Titans account can access in Personal, Business or Seller workspace context. Use this before asking about an animal when the user has not supplied an ID.", parameters: { type: "OBJECT", properties: {}, required: [] } },
  { name: "get_collection_overview", description: "Summarise the authenticated keeper's accessible animal collection without exposing photos or unrelated account data. In Business or Seller workspaces this represents the account-owned animal register used by that workspace.", parameters: { type: "OBJECT", properties: {}, required: [] } },
  { name: "get_animal_profile", description: "Retrieve an account-owned reptile's recorded profile. Use the exact animal ID from list_my_animals.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_animal_records", description: "Retrieve an account-owned reptile's recorded weight, feeding, shedding, health and behaviour history. Missing data must remain missing.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "get_animal_intelligence_snapshot", description: "Run deterministic analysis over one account-owned reptile's history, including weight summary, record counts and clearly labelled temporal associations. Never treat associations as proof of causation.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Tiny Titans animal ID." } }, required: ["animalId"] } },
  { name: "list_workspace_animals", description: "List animals held by the active Rescue workspace. Use this for Rescue questions instead of the personal animal register.", parameters: { type: "OBJECT", properties: {}, required: [] } },
  { name: "get_workspace_overview", description: "Summarise the active Rescue workspace animal register, including status and species counts visible to the authenticated Rescue role.", parameters: { type: "OBJECT", properties: {}, required: [] } },
  { name: "get_workspace_animal_profile", description: "Retrieve an animal from the active Rescue workspace by exact Rescue animal ID. Do not substitute a personal animal with the same or similar name.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Rescue animal ID." } }, required: ["animalId"] } },
  { name: "get_workspace_animal_records", description: "Retrieve the active Rescue animal's records permitted to the authenticated Rescue role, including care, timeline, reminders, transfers, foster and documents. Medical/private records remain filtered by role.", parameters: { type: "OBJECT", properties: { animalId: { type: "STRING", description: "Rescue animal ID." } }, required: ["animalId"] } },
  { name: "get_workspace_context", description: "Return the current organisation/workspace context available to the authenticated user. This does not expose unrelated private records.", parameters: { type: "OBJECT", properties: {}, required: [] } },
];

function getDeclarations() {
  return [{ functionDeclarations: DECLARATIONS }];
}

async function executeTool(uid, name, args, workspaceKind) {
  const {
    listAnimals,
    getAnimalProfile,
    getAnimalRecords,
    getAnimalIntelligenceSnapshot,
    getCollectionOverview,
    listRescueAnimals,
    getRescueAnimalProfile,
    getRescueAnimalRecords,
    getRescueCollectionOverview,
  } = require("./titanIntelligenceData");
  const { rescueMembership } = require("./titanIntelligenceAccess");
  const accountRecordWorkspace = ["personal", "business", "seller"].includes(workspaceKind);
  switch (name) {
    case "list_my_animals":
      return accountRecordWorkspace
        ? { kind: "user_data", data: await listAnimals(uid) }
        : { kind: "workspace_context", data: { message: "Use list_workspace_animals for Rescue workspace questions. Personal animal records are not substituted into Rescue context.", workspaceKind } };
    case "get_collection_overview":
      return accountRecordWorkspace
        ? { kind: "user_data", data: await getCollectionOverview(uid) }
        : { kind: "workspace_context", data: { message: "Use get_workspace_overview for Rescue workspace questions. Personal collection data is not substituted into Rescue context.", workspaceKind } };
    case "get_animal_profile":
      return accountRecordWorkspace
        ? { kind: "user_data", data: await getAnimalProfile(uid, String(args?.animalId || "")) }
        : { kind: "workspace_context", data: { message: "Use get_workspace_animal_profile for Rescue workspace questions. Personal animal records are not substituted into Rescue context.", workspaceKind } };
    case "get_animal_records":
      return accountRecordWorkspace
        ? { kind: "user_data", data: await getAnimalRecords(uid, String(args?.animalId || "")) }
        : { kind: "workspace_context", data: { message: "Use get_workspace_animal_records for Rescue workspace questions. Personal animal records are not substituted into Rescue context.", workspaceKind } };
    case "get_animal_intelligence_snapshot":
      return accountRecordWorkspace
        ? { kind: "calculated_data", data: await getAnimalIntelligenceSnapshot(uid, String(args?.animalId || "")) }
        : { kind: "workspace_context", data: { message: "Use Rescue workspace tools for Rescue analysis. Personal animal analysis is not substituted into Rescue context.", workspaceKind } };
    case "list_workspace_animals":
      return workspaceKind === "rescue"
        ? { kind: "user_data", data: await listRescueAnimals(uid) }
        : { kind: "workspace_context", data: { message: "This tool is restricted to the active Rescue workspace.", workspaceKind } };
    case "get_workspace_overview":
      return workspaceKind === "rescue"
        ? { kind: "calculated_data", data: await getRescueCollectionOverview(uid) }
        : { kind: "workspace_context", data: { message: "This tool is restricted to the active Rescue workspace.", workspaceKind } };
    case "get_workspace_animal_profile":
      return workspaceKind === "rescue"
        ? { kind: "user_data", data: await getRescueAnimalProfile(uid, String(args?.animalId || "")) }
        : { kind: "workspace_context", data: { message: "This tool is restricted to the active Rescue workspace.", workspaceKind } };
    case "get_workspace_animal_records":
      return workspaceKind === "rescue"
        ? { kind: "user_data", data: await getRescueAnimalRecords(uid, String(args?.animalId || "")) }
        : { kind: "workspace_context", data: { message: "This tool is restricted to the active Rescue workspace.", workspaceKind } };
    case "get_workspace_context": {
      const membership = await rescueMembership(uid);
      return {
        kind: "workspace_context",
        data: {
          requestedWorkspace: workspaceKind,
          rescue: membership ? {
            organisationId: membership.organisationId,
            role: membership.role,
            name: String(membership.organisation.name || "TinyTitans Rescue"),
          } : null,
        },
      };
    }
    default: throw new Error(`Unknown Titan tool: ${name}`);
  }
}

module.exports = { getDeclarations, executeTool, declarations: DECLARATIONS };