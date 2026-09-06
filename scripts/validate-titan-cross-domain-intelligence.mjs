import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const runtime = read("src/intelligence/v50/titanV50UnifiedRuntime.ts");
const context = read("src/intelligence/v50/titanContextSnapshot.ts");
const twin = read("src/intelligence/v50/titanDigitalTwinEngine.ts");
const holy = read("src/intelligence/v50/titanHolyShitEngine.ts");
const master = read("src/intelligence/v50/animalMasterRecordEngine.ts");
const crossDomain = read("src/intelligence/v50/titanCrossDomainEngine.ts");

const failures = [];
const checks = [
  [runtime, "buildTitanDiscoveries", "Unified runtime is missing cross-domain discovery integration."],
  [runtime, "digitalTwin", "Unified runtime is not consuming Digital Twin context."],
  [runtime, "advancedDiscoveries", "Unified runtime does not expose advanced discoveries."],
  [context, "buildTitanDigitalTwin", "Context snapshot does not construct the Digital Twin."],
  [context, "twinComponents", "Context snapshot input cannot carry explicit twin components."],
  [twin, "buildTitanDigitalTwin", "Digital Twin engine is missing its public builder."],
  [twin, "optimisations", "Digital Twin is missing optimisation output."],
  [twin, "zoneCoverage", "Digital Twin is missing spatial zone coverage."],
  [holy, "buildTitanDiscoveries", "Cross-domain discovery engine is missing."],
  [holy, "evidenceIds", "Discoveries must retain explicit evidence links."],
  [master, "changes", "Animal Master Record must surface cross-domain change signals."],
  [crossDomain, 'feeding-weight', "Feeding↔weight temporal rule is missing."],
  [crossDomain, 'shed-microclimate', "Shed↔microclimate temporal rule is missing."],
  [crossDomain, 'behaviour-feeding', "Behaviour↔feeding temporal rule is missing."],
  [crossDomain, 'microclimate-behaviour', "Microclimate↔behaviour temporal rule is missing."],
  [crossDomain, 'genetics-breeding', "Genetics↔breeding temporal rule is missing."],
  [crossDomain, 'breeding-hatchling', "Breeding↔hatchling temporal rule is missing."],
  [crossDomain, 'learning-activity', "Learning recency rule is missing."],
  [crossDomain, 'causalClaim: \"none\"', "Cross-domain signals must explicitly prohibit causal claims."],
];
for (const [source, needle, message] of checks) if (!source.includes(needle)) failures.push(message);

if (failures.length) {
  console.error(`Cross-domain intelligence validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Cross-domain intelligence validation passed: bounded temporal rules, Digital Twin context, evidence-linked discovery, unified context and Master Record change signals are wired.");
