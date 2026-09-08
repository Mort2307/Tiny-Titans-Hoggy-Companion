import { resolveHognoseMorphInput } from "../src/genetics/hognoseMorphResolver.ts";
import { fullHognoseMorphTaxonomyByName } from "../src/data/hognoseMorphFullTaxonomy.ts";

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

const unresolved = resolveHognoseMorphInput("Albino Frosted Arctic SuperConda");
assert(unresolved.confidence === "limited", "Unknown Frosted token must not be silently discarded");
assert(unresolved.notes.some((note) => note.includes("frosted")), "Unresolved Frosted token should be visible to the caller");

const empty = resolveHognoseMorphInput("NotARealMorph");
assert(empty.confidence === "unresolved", "Unknown morph names should remain unresolved");

// Source-reconciliation gates: these are currently accessible source-listed entries
// that were missing from the previous taxonomy snapshot.
assertTaxonomyFormula("Gaverth Green Lemon Ghost", "gaverth-green:1|lemon-ghost:1");
assertTaxonomyFormula("Lavender Oxide", "evans-hypo:2|lavender:2|sable:2");
assertTaxonomyFormula("Sunburst Cinnamon Anaconda", "albino:2|conda:1|cinnamon:1|sable:2");
assertTaxonomyFormula("Sunburst Cinnamon Arctic Anaconda", "albino:2|arctic:1|conda:1|cinnamon:1|sable:2");
assertTaxonomyFormula("Sable Cinnamon Anaconda", "conda:1|cinnamon:1|sable:2");
assertTaxonomyFormula("Pastel Toffeeglow Chocolate Superconda", "albino:2|conda:2|pastel:1|swiss-chocolate:2|toffeebelly:2");
assertTaxonomyFormula("Pink Pastel Maitai Arctic Anaconda", "arctic:1|conda:1|pink-pastel-albino:2|sable:2|toffeebelly:2");

console.log("Western Hognose morph resolution validation passed.");
