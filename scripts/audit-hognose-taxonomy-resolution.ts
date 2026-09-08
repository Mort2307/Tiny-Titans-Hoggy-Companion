import { resolveHognoseMorphInput } from "../src/genetics/hognoseMorphResolver.ts";
import {
  fullHognoseMorphTaxonomy,
  fullHognoseMorphTaxonomyByName,
} from "../src/data/hognoseMorphFullTaxonomy.ts";

type AuditEntry = {
  name: string;
  confidence: string;
  matchedName?: string;
  signature: string;
  componentCount: number;
  taxonomyComponentCount: number;
  taxonomyHasComponents: boolean;
  source: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Hognose taxonomy resolution audit failed: ${message}`);
}

const combinations = fullHognoseMorphTaxonomy.filter((entry) => entry.kind === "Combination");
const audits: AuditEntry[] = combinations.map((entry) => {
  const resolved = resolveHognoseMorphInput(entry.name);
  const taxonomyEntry = fullHognoseMorphTaxonomyByName.get(entry.name.toLowerCase());
  return {
    name: entry.name,
    confidence: resolved.confidence,
    matchedName: resolved.matchedName,
    signature: resolved.signature,
    componentCount: resolved.components.length,
    taxonomyComponentCount: taxonomyEntry?.components?.length ?? 0,
    taxonomyHasComponents: Boolean(taxonomyEntry?.components?.length),
    source: taxonomyEntry?.sourceLabel ?? "unknown",
  };
});

assert(combinations.length > 0, "no Hognose combination records were found");
assert(audits.length === combinations.length, "audit count does not match combination count");

const high = audits.filter((item) => item.confidence === "high");
const moderate = audits.filter((item) => item.confidence === "moderate");
const limited = audits.filter((item) => item.confidence === "limited");
const unresolved = audits.filter((item) => item.confidence === "unresolved");
const noTaxonomyComponents = audits.filter((item) => !item.taxonomyHasComponents);
const resolverOnly = audits.filter((item) => item.componentCount > 0 && !item.taxonomyHasComponents);
const sourceBacked = fullHognoseMorphTaxonomy.filter(
  (entry) => entry.kind === "Combination" && entry.sourceUrl?.includes("hognose-morphs.com"),
).length;

const duplicateNames = [...new Set(
  fullHognoseMorphTaxonomy.map((entry) => entry.name.trim().toLowerCase()),
)].filter((name) => fullHognoseMorphTaxonomy.filter((entry) => entry.name.trim().toLowerCase() === name).length > 1);

console.log(`Western Hognose taxonomy resolution audit: ${audits.length} combinations`);
console.log(`  high: ${high.length}`);
console.log(`  moderate: ${moderate.length}`);
console.log(`  limited: ${limited.length}`);
console.log(`  unresolved: ${unresolved.length}`);
console.log(`  source-backed combinations: ${sourceBacked}`);
console.log(`  combinations without taxonomy components: ${noTaxonomyComponents.length}`);
console.log(`  resolver-resolved but taxonomy componentless: ${resolverOnly.length}`);
console.log(`  duplicate taxonomy identities: ${duplicateNames.length}`);

const print = (title: string, entries: AuditEntry[]) => {
  if (!entries.length) return;
  console.log(`\n${title} (${entries.length})`);
  for (const item of entries) {
    const matched = item.matchedName && item.matchedName !== item.name ? ` -> ${item.matchedName}` : "";
    const formula = item.signature || "<none>";
    console.log(`  - ${item.name}${matched} [${item.confidence}] ${formula}`);
  }
};

print("LIMITED RESOLUTION — review tokens before treating as complete", limited);
print("UNRESOLVED RESOLUTION — no genetic interpretation should be inferred", unresolved);
print("RESOLVER-RESOLVED BUT TAXONOMY COMPONENTLESS — likely data wiring gap", resolverOnly);

if (duplicateNames.length) {
  console.log("\nDUPLICATE TAXONOMY IDENTITIES");
  for (const name of duplicateNames) {
    const matches = fullHognoseMorphTaxonomy.filter((entry) => entry.name.trim().toLowerCase() === name);
    console.log(`  - ${name}: ${matches.map((entry) => entry.geneId).join(", ")}`);
  }
}

console.log("\nWestern Hognose taxonomy resolution audit passed.");
