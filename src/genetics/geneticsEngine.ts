import { GENETICS_DATABASE } from "./geneticsDatabase";
import { calculateGenome, getLocusAllele, type GeneticsDatabase, type LocusDefinition, type ParentGenome, type LocusResult, type GeneticState, type EvidenceRecord } from "./geneticsModel";

export interface GeneticsCalculation { results: LocusResult[]; warnings: string[]; }
export interface GeneticsSearchResult { kind: "locus" | "allele" | "combination"; name: string; species: string; locusId?: string; alleleId?: string; combinationId?: string; confidence?: string; explanation: string; }
const normalise = (value: string): string => value.trim().toLowerCase();

export function calculateBreeding(parentA: ParentGenome, parentB: ParentGenome, database: GeneticsDatabase = GENETICS_DATABASE): GeneticsCalculation {
  try { return { results: calculateGenome(database, parentA, parentB), warnings: [] }; }
  catch (error) { return { results: [], warnings: [error instanceof Error ? error.message : "Genetics calculation failed."] }; }
}

export function searchGenetics(species: string, query: string, database: GeneticsDatabase = GENETICS_DATABASE): GeneticsSearchResult[] {
  const q = normalise(query);
  if (!q) return [];
  const results: GeneticsSearchResult[] = [];
  for (const locus of database.loci.filter((entry) => entry.species === species)) {
    if (normalise(locus.name).includes(q) || locus.id.toLowerCase().includes(q)) results.push({ kind: "locus", name: locus.name, species, locusId: locus.id, confidence: strongestConfidence(locus.evidence), explanation: `${locus.name} is modelled as a ${locus.inheritance.replaceAll("_", " ")} locus.` });
    for (const allele of locus.alleles) {
      if ([allele.name, allele.id, ...(allele.aliases ?? [])].some((value) => normalise(value).includes(q))) results.push({ kind: "allele", name: allele.name, species, locusId: locus.id, alleleId: allele.id, confidence: strongestConfidence(allele.evidence ?? locus.evidence), explanation: allele.isWildType ? `Wild-type allele at the ${locus.name}.` : `${allele.name} is an allele at the ${locus.name}, not an independent locus.` });
    }
  }
  for (const combination of database.combinations.filter((entry) => entry.species === species)) {
    if ([combination.name, combination.id, ...(combination.aliases ?? [])].some((value) => normalise(value).includes(q))) results.push({ kind: "combination", name: combination.name, species, combinationId: combination.id, confidence: strongestConfidence(combination.evidence), explanation: `${combination.name} is a ${combination.status.replaceAll("_", " ")} combination, not an independent gene.` });
  }
  return dedupeResults(results);
}

export function explainGeneticState(locus: LocusDefinition, state: GeneticState): string {
  const paternal = getLocusAllele(locus, state.paternalAlleleId), maternal = getLocusAllele(locus, state.maternalAlleleId);
  if (!paternal || !maternal) return `The recorded state does not match the ${locus.name} allele set.`;
  if (paternal.isWildType && maternal.isWildType) return `${locus.name}: wild type at this locus.`;
  if (locus.inheritance === "recessive" && (paternal.isWildType || maternal.isWildType)) return `${locus.name}: heterozygous carrier (${paternal.isWildType ? maternal.name : paternal.name}).`;
  if (locus.inheritance === "allelic" && !paternal.isWildType && !maternal.isWildType && paternal.id !== maternal.id) return `${locus.name}: two different non-wild alleles are present at the same locus; this is an allelic genotype, not two independent genes.`;
  if (paternal.id === maternal.id) return `${locus.name}: two copies of ${paternal.name}.`;
  return `${locus.name}: ${paternal.name} / ${maternal.name}.`;
}

export function explainCombination(species: string, query: string, database: GeneticsDatabase = GENETICS_DATABASE): string | undefined {
  const combination = database.combinations.find((entry) => entry.species === species && [entry.name, entry.id, ...(entry.aliases ?? [])].some((value) => normalise(value) === normalise(query)));
  if (!combination) return undefined;
  const components = combination.componentLocusIds.map((id) => database.loci.find((locus) => locus.id === id)?.name ?? id);
  return `${combination.name} = ${components.join(" + ")}. It is stored as a named combination rather than an independent gene.`;
}

function strongestConfidence(records: EvidenceRecord[]): string { if (records.some((record) => record.confidence === "high")) return "high"; if (records.some((record) => record.confidence === "moderate")) return "moderate"; if (records.some((record) => record.confidence === "limited")) return "limited"; return "unresolved"; }
function dedupeResults(results: GeneticsSearchResult[]): GeneticsSearchResult[] { const seen = new Set<string>(); return results.filter((result) => { const key = `${result.kind}|${result.locusId ?? ""}|${result.alleleId ?? ""}|${result.combinationId ?? ""}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
