import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const record = read("src/types/Breeding.ts");
const events = read("src/types/UniversalBreeding.ts");
const service = read("src/services/universalBreedingService.ts");
const projectService = read("src/services/breedingService.ts");
const workspace = read("src/pages/UniversalBreedingWorkspace.tsx");
const router = read("src/pages/SpeciesSafeBreedingPlanner.tsx");
const calculator = read("src/pages/Calculator.tsx");
const outcomes = read("src/components/BreedingOutcomeDashboard.tsx");
const parentSelector = read("src/components/ParentSelector.tsx");
const speciesPicker = read("src/components/UniversalSpeciesPicker.tsx");
const calculatorStyles = read("src/styles/calculator.css");
const genetics = read("src/genetics/geneticsModel.ts");
const forecast = read("src/genetics/geneticsForecast.ts");
const submission = read("src/pages/SubmitSpecies.tsx");
const marine = read("src/data/species/universalSpeciesSeedMarine.ts");
const care = read("src/data/species/universalSpeciesCare.ts");
const rules = read("firestore.rules");

const checks = [
  ["Species-linked breeding projects", record.includes("speciesId?: string") && record.includes("parentAId?: string")],
  ["All animal groups can use the universal workspace", router.includes("UniversalBreedingWorkspace")],
  ["Actual observed reproduction is stored with canonical species", events.includes("speciesId: string") && events.includes("recordedAt: string")],
  ["Observation saving goes through family permissions", service.includes("requestFamilyMutation") && service.includes('area: "breeding"')],
  ["No unsupported species genetics are copied in", workspace.includes('geneticsStatus === "baseline-only"') && workspace.includes("Offspring probabilities and named genetic combinations are withheld")],
  ["Universal events never automatically invent genetics", workspace.includes("does not establish a genetic inheritance pattern")],
  ["Distinct participant identities enforced", workspace.includes("first.id === second.id")],
  ["Combo-name and probability overview", outcomes.includes("recognisedCombination") && outcomes.includes("formatPercent") && calculator.includes("BreedingOutcomeDashboard")],
  ["Compact results keep full genetics on demand", outcomes.includes("const PREVIEW_LIMIT = 8") && outcomes.includes("View genetics &amp; carrier details") && outcomes.includes("<ResultCard") && outcomes.includes("Show all")],
  ["Saved parents stay visible with optional detailed editing", parentSelector.includes("genetics-parent-advanced") && parentSelector.includes("Genetics &amp; carriers") && calculatorStyles.includes(".genetics-parent-advanced")],
  ["Species search uses a short initial result list", speciesPicker.includes("const PAGE_SIZE = 8") && speciesPicker.includes("Show more species")],
  ["Genetic evidence remains available without cluttering the page", calculator.includes("calculator-evidence") && calculator.includes("calculator-info-strip")],
  ["No invented Wild Type probability without reviewed loci", calculator.includes("const displayedOffspring = hasDocumentedLoci ? result.offspring : [];") && calculator.includes("Genetic forecast unavailable") && calculator.includes("will not show an assumed Wild Type percentage")],
  ["Species context occupies one compact picker on calculator route", read("src/components/Layout/LayoutChrome.tsx").includes('compact={location.pathname === "/calculator"}') && read("src/styles/species-context.css").includes(".tt-species-context--compact")],

  ["Missing parental genetic states fail closed", genetics.includes("both parental genotypes must be explicitly documented") && forecast.includes("Do not publish an exact or partial forecast")],
  ["Image-free species submissions allowed", !submission.includes("Please include at least one useful species photograph")],
  ["New marine species are explicitly provisional", marine.includes("Provisional, taxonomy-first") && marine.includes('"unknown"') && !marine.includes("imageUrl")],
  ["Marine care evidence is non-numeric", care.includes("cnidarian:") && care.includes("echinoderm:") && care.includes("no target ranges are supplied")],
  ["Breeding events have explicit owner/family access rules", rules.includes("match /events/{eventId}") && rules.includes("familyViewPermission(userId, 'breeding')") && rules.includes("breedingFamilyPermission(userId, 'create')")],
  ["Event writes are project and species locked", rules.includes("request.resource.data.get('projectId', '') == projectId") && rules.includes("request.resource.data.get('speciesId', '') == get(/databases/$(database)/documents/users/$(userId)/breedingProjects/$(projectId)).data.get('speciesId', '')")],
  ["Family breeding project edits use the supported edit action", rules.includes("breedingFamilyPermission(userId, 'edit')") && !rules.includes("familyPermission(userId, 'breeding', 'update')")],
  ["Review-mode breeding permissions fail closed", rules.includes("function breedingFamilyPermission") && rules.includes("get('accessMode', 'review')") && rules.includes("get('breeding.' + action, 'verify') == 'allow'")],
  ["Family per-action overrides are honoured", read("src/services/familyPermissionsService.ts").includes('...((data.permissions ?? {}) as Partial<FamilyPermissions>)')],
  ["Project deletion includes nested lifecycle records", projectService.includes("clutchChildren.flat()") && projectService.includes("cycleEvents.docs.map") && projectService.includes("universalEvents.docs.map") && projectService.includes("incubationPlanDoc(owner, projectId, clutch.id)") && projectService.includes("writeBatch(db)")],
  ["Project deletion requires independent confirmation", workspace.includes("deleteRequestedId !== selectedProject.id") && workspace.includes("Confirm permanent deletion") && workspace.includes("This cannot be undone")],
  ["Offspring statistics count entries rather than inventing unique offspring", workspace.includes("offspringRecordCount") && workspace.includes("not unique animals")],
];
const failed = checks.filter(([, valid]) => !valid);
for (const [label, valid] of checks) console.log((valid ? "PASS" : "FAIL") + "  " + label);
if (failed.length) { console.error("Universal breeding & marine expansion contracts failed: " + failed.length); process.exit(1); }
console.log("Universal breeding and provisional marine species contracts passed.");
