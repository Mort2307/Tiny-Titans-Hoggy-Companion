import fs from "node:fs";

const read=(file)=>fs.readFileSync(file,"utf8");
const master=read("src/intelligence/v50/animalMasterRecordEngine.ts");
const confidence=read("src/intelligence/v50/titanDataConfidenceEngine.ts");
const changes=read("src/intelligence/v50/titanChangeDetector.ts");
const cross=read("src/intelligence/v50/titanCrossDomainEngine.ts");
const panel=read("src/components/TitanIntelligence/TitanAnimalMasterRecord.tsx");
const failures=[];
const required=[
 [master,"buildAnimalMasterRecord","Master Record builder is missing."],
 [master,"dataConfidence","Master Record is not connected to evidence confidence."],
 [master,"crossDomainSignals","Master Record is not connected to cross-domain signals."],
 [master,"detectTitanChanges","Master Record is not connected to change detection."],
 [confidence,"calculateTitanDataConfidence","Data confidence engine is missing."],
 [confidence,"evidence quality","Data confidence does not explain what its score means."],
 [changes,"detectTitanChanges","Change detector is missing."],
 [changes,"does not diagnose","Change detector is missing its non-diagnostic boundary."],
 [cross,"detectCrossDomainSignals","Cross-domain engine is missing."],
 [cross,"causalClaim","Cross-domain engine is not explicitly non-causal."],
 [cross,"explainCrossDomainSignal","Cross-domain explanation path is missing."],
 [cross,"buildHolyShitSummary","HOLY SHIT summary path is missing."],
 [panel,"What Tiny Titans sees next","Proactive surface is missing from the Master Record."],
 [panel,"Why am I seeing this?","Cross-domain signals are missing an explanation path."],
];
for(const [source,needle,message] of required)if(!source.toLowerCase().includes(String(needle).toLowerCase()))failures.push(message);
if(failures.length){console.error(`Titan intelligence contract failed with ${failures.length} issue(s):`);failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log("Titan intelligence contract passed: Master Record, evidence confidence, change detection, cross-domain reasoning and proactive explanation boundaries are present.");
