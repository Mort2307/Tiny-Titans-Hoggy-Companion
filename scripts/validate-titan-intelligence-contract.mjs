import fs from "node:fs";

const read=(file)=>fs.readFileSync(file,"utf8");
const master=read("src/intelligence/v50/animalMasterRecordEngine.ts");
const confidence=read("src/intelligence/v50/titanDataConfidenceEngine.ts");
const changes=read("src/intelligence/v50/titanChangeDetector.ts");
const cross=read("src/intelligence/v50/titanCrossDomainEngine.ts");
const panel=read("src/components/TitanIntelligence/TitanAnimalMasterRecord.tsx");
const askTitan=read("src/components/TitanIntelligence/AskTitan.tsx");
const workspaceHook=read("src/intelligence/askTitan/useTitanWorkspaceKind.ts");
const chatContracts=read("src/intelligence/askTitan/titanChatContracts.ts");
const data=read("functions/titanIntelligenceData.js");
const tools=read("functions/titanIntelligenceTools.js");
const access=read("functions/titanIntelligenceAccess.js");
const model=read("functions/titanIntelligenceModel.js");
const titan=read("functions/titanIntelligence.js");
const goals=read("functions/titanGoals.js");
const failures=[];
const required=[
 [master,"buildAnimalMasterRecord","Master Record builder is missing."],
 [master,"dataConfidence","Master Record is not connected to evidence confidence."],
 [master,"crossDomainSignals","Master Record is not connected to cross-domain signals."],
 [master,"detectTitanChanges","Master Record is not connected to change detection."],
 [confidence,"calculateTitanDataConfidence","Data confidence engine is missing."],
 [confidence,"evidence quality","Data confidence does not explain what its score means."],
 [changes,"detectTitanChanges","Change detector is missing."],
 [changes,"not a diagnosis","Change detector is missing its non-diagnostic boundary."],
 [cross,"detectCrossDomainSignals","Cross-domain engine is missing."],
 [cross,"causalClaim","Cross-domain engine is not explicitly non-causal."],
 [cross,"explainCrossDomainSignal","Cross-domain explanation path is missing."],
 [cross,"buildHolyShitSummary","HOLY SHIT summary path is missing."],
 [panel,"What Tiny Titans sees next","Proactive surface is missing from the Master Record."],
 [panel,"Why am I seeing this?","Cross-domain signals are missing an explanation path."],
 [askTitan,"useTitanWorkspaceKind","Ask Titan does not follow the active workspace context."],
 [askTitan,"useTitanChat","Ask Titan chat wiring is missing."],
 [workspaceHook,"productId === \"rescue\"","Rescue workspace mapping is missing."],
 [workspaceHook,"productId === \"titan_seller\"","Seller workspace mapping is missing."],
 [chatContracts,"TitanWorkspaceKind","Titan chat workspace contract is missing."],
 [data,"listRescueAnimals","Rescue animal retrieval is missing."],
 [data,"getRescueAnimalRecords","Rescue record retrieval is missing."],
 [data,"getRescueCollectionOverview","Rescue intelligence overview is missing."],
 [data,"rescueAnimals","Rescue collection boundary is missing."],
 [data,"Medical/private records are omitted from lower-privilege views","Rescue visibility boundary is missing."],
 [tools,"get_workspace_animal_records","Rescue workspace tool declaration is missing."],
 [tools,"Personal animal records are not substituted into Rescue context","Cross-workspace data isolation is missing."],
 [access,"workspaceKind === \"rescue\"","Rescue access boundary is missing."],
 [access,"effectiveTier: \"rescue\"","Rescue access does not resolve to the Rescue tier."],
 [model,"mode: \"VALIDATED\"","Gemini tool-calling mode is not hardened for server-side tool circulation."],
 [model,"includeServerSideToolInvocations: true","Gemini server-side tool context circulation is missing."],
 [titan,"consumeTitanUsage","Titan usage enforcement is missing."],
 [titan,"executeTool","Titan function-tool execution is missing."],
 [titan,"buildTitanProvenance","Titan provenance construction is missing."],
 [titan,"workspaceKind","Titan workspace context is not carried through the callable."],
 [goals,"./titanIntelligence","Titan Intelligence callable is not exposed through the functions index."],
];
for(const [source,needle,message] of required)if(!source.toLowerCase().includes(String(needle).toLowerCase()))failures.push(message);
if(failures.length){console.error(`Titan intelligence contract failed with ${failures.length} issue(s):`);failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log("Titan intelligence contract passed: V50 intelligence, Ask Titan, workspace context, Rescue data boundaries, Gemini tool circulation, usage controls and provenance are present.");