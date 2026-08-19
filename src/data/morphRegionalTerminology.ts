import type { MasterMorphDefinition } from "./masterMorphDatabase";

export type MorphRegion = "global" | "uk" | "usa" | "europe" | "australia" | "all";
export type MorphNameStatus = "preferred" | "synonym" | "regional" | "historical" | "breeder" | "unverified";
export type RegionalMorphName = { name: string; region: Exclude<MorphRegion, "all">; status: MorphNameStatus; confidence: "high" | "medium" | "low"; note?: string; };
export type RegionalMorphRecord = { canonicalId: string; names: RegionalMorphName[] };

export const REGIONAL_MORPH_TERMINOLOGY: RegionalMorphRecord[] = [
  { canonicalId: "albino", names: [{ name: "Albino", region: "global", status: "preferred", confidence: "high" }, { name: "Albino", region: "uk", status: "preferred", confidence: "high" }, { name: "Albino", region: "usa", status: "preferred", confidence: "high" }, { name: "Albino", region: "europe", status: "preferred", confidence: "high" }, { name: "Albino", region: "australia", status: "preferred", confidence: "high" }, { name: "Amel", region: "global", status: "synonym", confidence: "high" }, { name: "Amelanistic", region: "global", status: "synonym", confidence: "high" }] },
  { canonicalId: "arctic", names: [{ name: "Arctic", region: "global", status: "preferred", confidence: "high" }, { name: "Arctic", region: "uk", status: "preferred", confidence: "high" }, { name: "Arctic", region: "usa", status: "preferred", confidence: "high" }, { name: "Arctic", region: "europe", status: "preferred", confidence: "high" }, { name: "Arctic", region: "australia", status: "preferred", confidence: "high" }, { name: "JMG Axanthic", region: "usa", status: "historical", confidence: "high", note: "MorphMarket lists JMG Axanthic as an alias for Arctic; retained for search and education." }] },
  { canonicalId: "super-arctic", names: [{ name: "Super Arctic", region: "global", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "uk", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "usa", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "europe", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "australia", status: "preferred", confidence: "high" }, { name: "Super JMG Axanthic", region: "usa", status: "historical", confidence: "medium" }] },
  { canonicalId: "conda", names: [{ name: "Conda", region: "global", status: "preferred", confidence: "high" }, { name: "Anaconda", region: "uk", status: "regional", confidence: "high", note: "UK-facing hobby terminology; underlying identity remains Conda." }, { name: "Conda", region: "usa", status: "preferred", confidence: "high" }, { name: "Anaconda", region: "usa", status: "synonym", confidence: "high" }, { name: "Anaconda", region: "europe", status: "preferred", confidence: "high" }, { name: "Anaconda", region: "australia", status: "preferred", confidence: "high" }] },
  { canonicalId: "super-conda", names: [{ name: "Super Conda", region: "global", status: "preferred", confidence: "high" }, { name: "Superconda", region: "uk", status: "synonym", confidence: "high" }, { name: "Super Conda", region: "usa", status: "preferred", confidence: "high" }, { name: "Superconda", region: "europe", status: "preferred", confidence: "high" }, { name: "Superconda", region: "australia", status: "preferred", confidence: "high" }, { name: "Super Anaconda", region: "global", status: "synonym", confidence: "high" }] },
  { canonicalId: "axanthic", names: [{ name: "Axanthic", region: "global", status: "preferred", confidence: "high" }, { name: "Axanthic", region: "uk", status: "preferred", confidence: "high" }, { name: "Axanthic", region: "usa", status: "preferred", confidence: "high" }, { name: "Axanthic", region: "europe", status: "preferred", confidence: "high" }, { name: "Axanthic", region: "australia", status: "preferred", confidence: "high" }, { name: "Anery", region: "usa", status: "unverified", confidence: "low", note: "Retained as a search candidate only; do not silently merge into Axanthic." }, { name: "Anerythristic", region: "usa", status: "unverified", confidence: "low", note: "Search candidate only; requires lineage/source verification before canonical resolution." }] },
  { canonicalId: "lavender", names: [{ name: "Lavender", region: "global", status: "preferred", confidence: "high" }, { name: "Lavender", region: "uk", status: "preferred", confidence: "high" }, { name: "Lavender", region: "usa", status: "preferred", confidence: "high" }, { name: "Lavender", region: "europe", status: "preferred", confidence: "high" }, { name: "Lavender", region: "australia", status: "preferred", confidence: "high" }, { name: "Lav", region: "global", status: "synonym", confidence: "high" }] },
  { canonicalId: "toffeebelly", names: [{ name: "Toffeebelly", region: "global", status: "preferred", confidence: "high" }, { name: "Toffee Belly", region: "uk", status: "synonym", confidence: "high" }, { name: "Toffee Belly", region: "usa", status: "synonym", confidence: "high" }, { name: "Toffee Belly", region: "europe", status: "synonym", confidence: "high" }, { name: "Toffee Belly", region: "australia", status: "synonym", confidence: "high" }] },
  { canonicalId: "normal", names: [{ name: "Normal", region: "global", status: "preferred", confidence: "high" }, { name: "Wild Type", region: "global", status: "synonym", confidence: "high" }, { name: "Normal", region: "uk", status: "preferred", confidence: "high" }, { name: "Normal", region: "usa", status: "preferred", confidence: "high" }, { name: "Normal", region: "europe", status: "preferred", confidence: "high" }, { name: "Normal", region: "australia", status: "preferred", confidence: "high" }] },
  { canonicalId: "evans-hypo", names: [{ name: "Evan's Hypo", region: "global", status: "preferred", confidence: "high" }, { name: "Evan's Hypo", region: "uk", status: "preferred", confidence: "high" }, { name: "Evan's Hypo", region: "usa", status: "preferred", confidence: "high" }, { name: "Evan's Hypo", region: "europe", status: "preferred", confidence: "high" }, { name: "Evan's Hypo", region: "australia", status: "preferred", confidence: "high" }, { name: "Dutch Hypo", region: "europe", status: "synonym", confidence: "high" }, { name: "Dutch Hypo", region: "uk", status: "synonym", confidence: "high" }] },
  { canonicalId: "sable", names: [{ name: "Sable", region: "global", status: "preferred", confidence: "high" }, { name: "Sable", region: "uk", status: "preferred", confidence: "high" }, { name: "Sable", region: "usa", status: "preferred", confidence: "high" }, { name: "Sable", region: "europe", status: "preferred", confidence: "high" }, { name: "Sable", region: "australia", status: "preferred", confidence: "high" }] },
  { canonicalId: "caramel", names: [{ name: "Caramel", region: "global", status: "preferred", confidence: "high" }, { name: "Caramel", region: "uk", status: "preferred", confidence: "high" }, { name: "Caramel", region: "usa", status: "preferred", confidence: "high" }, { name: "Caramel", region: "europe", status: "preferred", confidence: "high" }, { name: "Caramel", region: "australia", status: "preferred", confidence: "high" }] },
];

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const recordsById = new Map(REGIONAL_MORPH_TERMINOLOGY.map((record) => [normalise(record.canonicalId), record]));

export function getRegionalMorphRecord(canonicalId: string): RegionalMorphRecord | undefined { return recordsById.get(normalise(canonicalId)); }

export function getRegionalMorphNames(canonicalId: string, region: MorphRegion, fallbackMorphName?: string): RegionalMorphName[] {
  const record = getRegionalMorphRecord(canonicalId);
  const names = record?.names ?? [];
  if (region === "all") return names;
  const regional = names.filter((entry) => entry.region === region || entry.region === "global");
  if (regional.length > 0) return regional;
  if (fallbackMorphName) return [{ name: fallbackMorphName, region, status: "preferred", confidence: "high", note: "No verified regional rename is currently recorded; canonical name shown." }];
  return [];
}

export function getPreferredRegionalMorphName(morph: MasterMorphDefinition, region: MorphRegion): string {
  if (region === "all") return morph.name;
  const names = getRegionalMorphNames(morph.geneId, region, morph.name);
  return names.find((entry) => entry.region === region && entry.status === "preferred")?.name ?? names.find((entry) => entry.region === region && entry.status !== "unverified")?.name ?? names.find((entry) => entry.region === "global" && entry.status === "preferred")?.name ?? morph.name;
}

export function getRegionalAliases(morph: MasterMorphDefinition, region: MorphRegion): RegionalMorphName[] {
  const preferred = getPreferredRegionalMorphName(morph, region);
  return getRegionalMorphNames(morph.geneId, region, morph.name).filter((entry) => entry.name !== preferred);
}

export function resolveRegionalMorphName(value: string, region?: MorphRegion): string | undefined {
  const query = normalise(value);
  for (const record of REGIONAL_MORPH_TERMINOLOGY) {
    const match = record.names.find((entry) => normalise(entry.name) === query && entry.status !== "unverified" && (!region || region === "all" || entry.region === region || entry.region === "global"));
    if (match) return record.canonicalId;
  }
  return undefined;
}

export function getMorphTerminologyAudit(morphs: MasterMorphDefinition[]) {
  const mapped = new Set(REGIONAL_MORPH_TERMINOLOGY.map((entry) => normalise(entry.canonicalId)));
  const explicit = morphs.filter((morph) => mapped.has(normalise(morph.geneId)));
  const pending = REGIONAL_MORPH_TERMINOLOGY.flatMap((record) => record.names.filter((name) => name.status === "unverified" || name.confidence === "low"));
  const regionalDifferences = REGIONAL_MORPH_TERMINOLOGY.flatMap((record) => record.names.filter((name) => name.status === "regional" || name.status === "historical" || name.status === "breeder"));
  return {
    total: morphs.length,
    covered: morphs.length,
    explicitRecords: explicit.length,
    canonicalFallbacks: Math.max(0, morphs.length - explicit.length),
    regionalDifferences: regionalDifferences.length,
    pendingResearch: pending.length,
    records: REGIONAL_MORPH_TERMINOLOGY.length,
    mapped: explicit.length,
    needsReview: pending.length,
  };
}
