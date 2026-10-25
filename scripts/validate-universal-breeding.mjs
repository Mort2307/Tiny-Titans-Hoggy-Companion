import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const record = read("src/types/Breeding.ts");
const events = read("src/types/UniversalBreeding.ts");
const service = read("src/services/universalBreedingService.ts");
const workspace = read("src/pages/UniversalBreedingWorkspace.tsx");
const router = read("src/pages/SpeciesSafeBreedingPlanner.tsx");
const calculator = read("src/pages/Calculator.tsx");
const outcomes = read("src/components/BreedingOutcomeDashboard.tsx");
const genetics = read("src/genetics/geneticsModel.ts");
const forecast = read("src/genetics/geneticsForecast.ts");
const submission = read("src/pages/SubmitSpecies.tsx");
const marine = read("src/data/species/universalSpeciesSeedMarine.ts");
const care = read("src/data/species/universalSpeciesCare.ts");

const checks = [
  ["Species-linked breeding projects", record.includes("speciesId?: string") && record.includes("parentAId?: string")],
  ["All animal groups can use the universal workspace", router.includes("UniversalBreedingWorkspace")],
  ["Actual observed reproduction is stored with canonical species", events.includes("speciesId: string") && events.includes("recordedAt: string")],
  ["Observation saving goes through family permissions", service.includes("requestFamilyMutation") && service.includes('area: "breeding"')],
  ["No unsupported species genetics are copied in", workspace.includes('geneticsStatus === "baseline-only"') && workspace.includes("Offspring probabilities and named genetic combinations are withheld")],
  ["Universal events never automatically invent genetics", workspace.includes("does not establish a genetic inheritance pattern")],
  ["Distinct participant identities enforced", workspace.includes("first.id === second.id")],
  ["Combo-name and probability overview", outcomes.includes("recognisedCombination") && outcomes.includes("formatPercent") && calculator.includes("BreedingOutcomeDashboard")],
  ["Missing parental genetic states fail closed", genetics.includes("both parental genotypes must be explicitly documented") && forecast.includes("Do not publish an exact or partial forecast")],
  ["Image-free species submissions allowed", !submission.includes("Please include at least one useful species photograph")],
  ["New marine species are explicitly provisional", marine.includes("Provisional, taxonomy-first") && marine.includes('"unknown"') && !marine.includes("imageUrl")],
  ["Marine care evidence is non-numeric", care.includes("cnidarian:") && care.includes("echinoderm:") && care.includes("no target ranges are supplied")],
];
const failed = checks.filter(([, valid]) => !valid);
for (const [label, valid] of checks) console.log((valid ? "PASS" : "FAIL") + "  " + label);
if (failed.length) { console.error("Universal breeding & marine expansion contracts failed: " + failed.length); process.exit(1); }
console.log("Universal breeding and provisional marine species contracts passed.");
