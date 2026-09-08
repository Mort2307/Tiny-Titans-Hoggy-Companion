import { resolveHognoseMorphInput } from "../src/genetics/hognoseMorphResolver.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Hognose morph resolution validation failed: ${message}`);
}

function assertSignature(input: string, expected: string): void {
  const result = resolveHognoseMorphInput(input);
  assert(result.signature === expected, `${input} -> ${result.signature}; expected ${expected}`);
  assert(result.confidence !== "unresolved" && result.confidence !== "limited", `${input} was not fully resolved`);
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

const unresolved = resolveHognoseMorphInput("Albino Frosted Arctic Superconda");
assert(unresolved.confidence === "limited", "Unknown Frosted token must not be silently discarded");
assert(unresolved.notes.some((note) => note.includes("frosted")), "Unresolved Frosted token should be visible to the caller");

const empty = resolveHognoseMorphInput("NotARealMorph");
assert(empty.confidence === "unresolved", "Unknown morph names should remain unresolved");

console.log("Western Hognose morph resolution validation passed.");
