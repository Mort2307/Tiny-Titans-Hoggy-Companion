import type { MasterMorphDefinition } from "./masterMorphDatabase";

export type MorphRegion = "global" | "uk" | "usa" | "europe" | "australia" | "all";
export type MorphNameStatus = "preferred" | "synonym" | "regional" | "historical" | "breeder" | "unverified";
export type RegionalMorphName = { name: string; region: Exclude<MorphRegion, "all">; status: MorphNameStatus; confidence: "high" | "medium" | "low"; note?: string; };
export type RegionalMorphRecord = { canonicalId: string; names: RegionalMorphName[] };

export const REGIONAL_MORPH_TERMINOLOGY: RegionalMorphRecord[] = [
  { canonicalId: "arctic", names: [
    { name: "Arctic", region: "global", status: "preferred", confidence: "high" }, { name: "Arctic", region: "uk", status: "preferred", confidence: "high" }, { name: "Arctic", region: "usa", status: "preferred", confidence: "high" }, { name: "Arctic", region: "europe", status: "preferred", confidence: "high" }, { name: "Arctic", region: "australia", status: "preferred", confidence: "high" }, { name: "JMG Axanthic", region: "usa", status: "historical", confidence: "medium", note: "Retained for search compatibility; do not treat an unverified name as a separate locus." },
  ] },
  { canonicalId: "super-arctic", names: [
    { name: "Super Arctic", region: "global", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "uk", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "usa", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "europe", status: "preferred", confidence: "high" }, { name: "Super Arctic", region: "australia", status: "preferred", confidence: "high" }, { name: "Super JMG Axanthic", region: "usa", status: "historical", confidence: "medium" },
  ] },
  { canonicalId: "conda", names: [
    { name: "Conda", region: "global", status: "preferred", confidence: "high" }, { name: "Anaconda", region: "uk", status: "regional", confidence: "high", note: "Common UK-facing terminology; canonical identity remains Conda." }, { name: "Conda", region: "usa", status: "preferred", confidence: "high" }, { name: "Anaconda", region: "usa", status: "synonym", confidence: "high" }, { name: "Anaconda", region: "europe", status: "synonym", confidence: "high" }, { name: "Anaconda", region: "australia", status: "synonym", confidence: "high" },
  ] },
  { canonicalId: "super-conda", names: [
    { name: "Super Conda", region: "global", status: "preferred", confidence: "high" }, { name: "Superconda", region: "uk", status: "synonym", confidence: "high" }, { name: "Super Conda", region: "usa", status: "preferred", confidence: "high" }, { name: "Super Anaconda", region: "uk", status: "regional", confidence: "high" }, { name: "Super Anaconda", region: "usa", status: "synonym", confidence: "high" }, { name: "Super Anaconda", region: "europe", status: "synonym", confidence: "high" }, { name: "Super Anaconda", region: "australia", status: "synonym", confidence: "high" },
  ] },
  { canonicalId: "toffeebelly", names: [
    { name: "Toffeebelly", region: "global", status: "preferred", confidence: "high" }, { name: "Toffee Belly", region: "uk", status: "synonym", confidence: "high" }, { name: "Toffee Belly", region: "usa", status: "synonym", confidence: "high" }, { name: "Toffee Belly", region: "europe", status: "synonym", confidence: "high" }, { name: "Toffee Belly", region: "australia", status: "synonym", confidence: "high" },
  ] },
  { canonicalId: "axanthic", names: [
    { name: "Axanthic", region: "global", status: "preferred", confidence: "high" }, { name: "Anery", region: "usa", status: "regional", confidence: "medium", note: "Search compatibility only; verify lineage before assigning the canonical gene." }, { name: "Anerythristic", region: "usa", status: "synonym", confidence: "medium" },
  ] },
];

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const recordsById = new Map(REGIONAL_MORPH_TERMINOLOGY.map((record) => [record.canonicalId, record]));
export function getRegionalMorphRecord(canonicalId: string): RegionalMorphRecord | undefined { return recordsById.get(normalise(canonicalId)); }
export function getRegionalMorphNames(canonicalId: string, region: MorphRegion): RegionalMorphName[] { const record = getRegionalMorphRecord(canonicalId); if (!record) return []; return region === "all" ? record.names : record.names.filter((entry) => entry.region === region || entry.region === "global"); }
export function getPreferredRegionalMorphName(morph: MasterMorphDefinition, region: MorphRegion): string { if (region === "all") return morph.name; const names = getRegionalMorphNames(morph.geneId, region); return names.find((entry) => entry.region === region && entry.status === "preferred")?.name ?? names.find((entry) => entry.region === region)?.name ?? names.find((entry) => entry.region === "global" && entry.status === "preferred")?.name ?? morph.name; }
export function getRegionalAliases(morph: MasterMorphDefinition, region: MorphRegion): RegionalMorphName[] { return getRegionalMorphNames(morph.geneId, region).filter((entry) => entry.name !== getPreferredRegionalMorphName(morph, region)); }
export function resolveRegionalMorphName(value: string, region?: MorphRegion): string | undefined { const query = normalise(value); for (const record of REGIONAL_MORPH_TERMINOLOGY) { const match = record.names.find((entry) => normalise(entry.name) === query && (!region || region === "all" || entry.region === region || entry.region === "global")); if (match) return record.canonicalId; } return undefined; }
export function getMorphTerminologyAudit(morphs: MasterMorphDefinition[]) { const mapped = new Set(REGIONAL_MORPH_TERMINOLOGY.map((entry) => entry.canonicalId)); return { total: morphs.length, mapped: morphs.filter((morph) => mapped.has(morph.geneId)).length, needsReview: morphs.filter((morph) => !mapped.has(morph.geneId)).length, records: REGIONAL_MORPH_TERMINOLOGY.length }; }
