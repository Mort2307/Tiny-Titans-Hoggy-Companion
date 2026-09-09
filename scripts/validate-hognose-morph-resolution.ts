import { resolveHognoseMorphInput } from "../src/genetics/hognoseMorphResolver.ts";
import { fullHognoseMorphTaxonomyByName } from "../src/data/hognoseMorphFullTaxonomy.ts";
import { getHognosePhenotypeGuide, hognosePhenotypeGuideById } from "../src/data/hognosePhenotypeGuide.ts";
import { hognosePhenotypeExtensionsById } from "../src/data/hognosePhenotypeExtensions.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Hognose morph resolution validation failed: ${message}`);
}

function assertSignature(input: string, expected: string): void {
  const result = resolveHognoseMorphInput(input);
  assert(result.signature === expected, `${input} -> ${result.signature}; expected ${expected}`);
  assert(result.confidence !== "unresolved" && result.confidence !== "limited", `${input} was not fully resolved`);
}

function assertTaxonomyFormula(name: string, expected: string): void {
  const entry = fullHognoseMorphTaxonomyByName.get(name.toLowerCase());
  assert(entry, `${name} is missing from the full Western Hognose taxonomy`);
  assert(entry.sourceUrl?.includes("hognose-morphs.com"), `${name} is missing Hognose Morphs provenance`);
  const formula = (entry.components ?? [])
    .map((component) => `${component.morphId}:${component.copies}`)
    .sort()
    .join("|");
  assert(formula === expected, `${name} -> ${formula}; expected ${expected}`);
}

const crystal = resolveHognoseMorphInput("Crystal Diamond SuperConda");
assert(crystal.matchedName === "Crystal Diamond Superconda", "Crystal Diamond SuperConda should resolve to the canonical name");
assertSignature("Crystal Diamond SuperConda", "albino:2|arctic:2|conda:2|lavender:2");
assertSignature("SuperArctic SuperConda Albino Lavender", "albino:2|arctic:2|conda:2|lavender:2");
assertSignature("Arctic Conda Lavender", "arctic:1|conda:1|lavender:2");

const moonstruck = resolveHognoseMorphInput("Moonstruck");
assert(moonstruck.matchedName === "Moonstruck", "Moonstruck should resolve as a named combination");
assert(moonstruck.notes.some((note) => note.includes("Arctic x1")), "Moonstruck should expose its canonical component formula");

const crystalAlias = resolveHognoseMorphInput("Superarctic Coral Superconda");
assert(crystalAlias.matchedName === "Crystal Diamond Superconda", "Crystal Diamond alias should resolve to the canonical name");

// Core input grammar: aliases, case, punctuation, and super forms must resolve
// without silently changing the underlying copy count or locus identity.
assertSignature("ANACONDA", "conda:1");
assertSignature("Conda", "conda:1");
assertSignature("Arctic Anaconda", "arctic:1|conda:1");
assertSignature("ARCTIC + ANACONDA", "arctic:1|conda:1");
assertSignature("Super Arctic", "arctic:2");
assertSignature("Superarctic", "arctic:2");
assertSignature("Super Conda", "conda:2");
assertSignature("Superconda", "conda:2");
assertSignature("Amelanistic", "albino:2");
assertSignature("ALBINO", "albino:2");
assertSignature("Anery", "axanthic:2");
assertSignature("Lav", "lavender:2");
assertSignature("Toffee Belly", "toffeebelly:2");
assertSignature("Swiss Choc", "swiss-chocolate:2");

const unresolved = resolveHognoseMorphInput("Albino Frosted Arctic SuperConda");
assert(unresolved.confidence === "limited", "Unknown Frosted token must not be silently discarded");
assert(unresolved.notes.some((note) => note.includes("frosted")), "Unresolved Frosted token should be visible to the caller");

const empty = resolveHognoseMorphInput("NotARealMorph");
assert(empty.confidence === "unresolved", "Unknown morph names should remain unresolved");

// Source-reconciliation gates: these are currently accessible source-listed entries
// whose formulas were checked against their live Hognose Morphs source pages.
assertTaxonomyFormula("Gaverth Green Lemon Ghost", "gaverth-green:1|lemon-ghost:1");
assertTaxonomyFormula("Lavender Oxide", "evans-hypo:2|lavender:2|sable:2");
assertTaxonomyFormula("Toffee Frosted", "caramel:2|evans-hypo:2|toffeebelly:2");
assertTaxonomyFormula("Lemon Ghost Albino Arctic Anaconda", "albino:2|arctic:1|conda:1|lemon-ghost:1");
assertTaxonomyFormula("Paint Maker Anaconda", "conda:1|lemon-ghost:1|toffeebelly:2");
assertTaxonomyFormula("Cinnamon Lemon Ghost Extreme Red Anaconda", "cinnamon:1|conda:1|extreme-red:1|lemon-ghost:1");
assertTaxonomyFormula("Extreme Red Tomato Lemon Ghost Anaconda", "albino:2|cinnamon:1|conda:1|extreme-red:1|lemon-ghost:1");
assertTaxonomyFormula("Sunburst Cinnamon Anaconda", "albino:2|cinnamon:1|conda:1|sable:2");
assertTaxonomyFormula("Sunburst Cinnamon Arctic Anaconda", "albino:2|arctic:1|cinnamon:1|conda:1|sable:2");
assertTaxonomyFormula("Sable Cinnamon Anaconda", "cinnamon:1|conda:1|sable:2");
assertTaxonomyFormula("Pastel Toffeeglow Chocolate Superconda", "albino:2|conda:2|pastel:1|swiss-chocolate:2|toffeebelly:2");
assertTaxonomyFormula("Pink Pastel Maitai Arctic Anaconda", "arctic:1|conda:1|pink-pastel-albino:2|sable:2|toffeebelly:2");

// Visual identification intelligence gates for core guides.
for (const id of [
  "arctic", "super-arctic", "conda", "super-conda", "albino", "axanthic", "lavender", "caramel",
  "evans-hypo", "leucistic", "pink-pastel-albino", "pistachio", "sable", "swiss-chocolate", "toffeebelly",
  "cinnamon", "skullface", "pastel", "lemon-ghost", "symphony", "extreme-red", "woma", "granite",
  "granite-jungle", "jaguar", "jungle", "purple-line", "green-line", "yellow-line", "shadow", "tiger",
  "twinspot", "watermelon",
]) {
  const guide = hognosePhenotypeGuideById[id];
  assert(guide, `${id} has no phenotype guide`);
  assert(guide.visualDescription.length > 40, `${id} visual description is too thin`);
  assert(guide.identificationMarkers.length > 0, `${id} has no identification markers`);
  assert(guide.differentiators.length > 0, `${id} has no differentiators`);
  assert(guide.identificationCaveat.includes("not proof of genotype"), `${id} is missing the visual-vs-genetic safety rail`);
}

// Extension guides must also be real, usable phenotype knowledge rather than dead records.
for (const id of [
  "antarctic", "super-antarctic", "desert", "dutch-hypo", "true-hypo", "savannah", "phoenix-red",
  "raging-red", "spider", "yellow-glow", "green-phase", "citrus", "mocha", "orange-albino", "rbe-pastel", "gaverth-green",
]) {
  const guide = hognosePhenotypeExtensionsById[id];
  assert(guide, `${id} has no extension phenotype guide`);
  assert(guide.visualDescription.length > 40, `${id} extension visual description is too thin`);
  assert(guide.identificationMarkers.length > 0, `${id} extension has no identification markers`);
  assert(guide.identificationCaveat.includes("not as proof of genotype"), `${id} extension is missing the visual-vs-genetic safety rail`);
}

const arctic = getHognosePhenotypeGuide("arctic");
assert(arctic.differentiators.some((item) => /Super Arctic/i.test(item)), "Arctic guide must explicitly distinguish Super Arctic");

const superArctic = getHognosePhenotypeGuide("super-arctic");
assert(superArctic.differentiators.some((item) => /two copies/i.test(item)), "Super Arctic guide must state its two-copy distinction");

const conda = getHognosePhenotypeGuide("conda");
assert(conda.differentiators.some((item) => /Super Conda/i.test(item)), "Conda guide must explicitly distinguish Super Conda");

const superConda = getHognosePhenotypeGuide("super-conda");
assert(superConda.differentiators.some((item) => /almost entirely/i.test(item)), "Super Conda guide must describe extreme pattern reduction");

const combination = fullHognoseMorphTaxonomyByName.get("platinum");
assert(combination?.components?.length, "Platinum should have components for phenotype composition");
const composed = getHognosePhenotypeGuide("platinum", combination?.components);
assert(composed.visualDescription.includes("combined expression"), "Combination phenotype guide should compose component intelligence");

console.log("Western Hognose morph + phenotype identification validation passed.");
