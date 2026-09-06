export type EvidenceSourceType = "peer_reviewed" | "specialist_database" | "documented_breeder" | "community" | "taxonomy";
export type EvidenceConfidence = "high" | "moderate" | "limited" | "unresolved";
export type InheritanceModel = "recessive" | "dominant" | "incomplete_dominant" | "codominant" | "allelic" | "polygenic" | "line_bred" | "complex" | "unknown";
export type SuperStatus = "supported" | "not_applicable" | "claimed" | "unresolved";
export type GeneticPhenotypeStatus = "wild_type" | "visual" | "heterozygous" | "mixed_allelic" | "unresolved";
export interface EvidenceRecord { sourceType: EvidenceSourceType; claim: string; confidence: EvidenceConfidence; source?: string; note?: string; }
export interface AlleleDefinition { id: string; name: string; aliases?: string[]; isWildType?: boolean; phenotype?: string; dominanceRank?: number; evidence?: EvidenceRecord[]; }
export interface LocusDefinition { id: string; species: string; name: string; inheritance: InheritanceModel; alleles: AlleleDefinition[]; superStatus: SuperStatus; superAlleleId?: string; evidence: EvidenceRecord[]; notes?: string; }
export interface GeneticState { locusId: string; paternalAlleleId: string; maternalAlleleId: string; }
export interface ParentGenome { species: string; states: GeneticState[]; }
export interface OffspringOutcome { locusId: string; paternalAlleleId: string; maternalAlleleId: string; probability: number; copiesByAllele: Record<string, number>; label: string; phenotypeStatus: GeneticPhenotypeStatus; superForm: boolean; }
export interface LocusResult { locus: LocusDefinition; outcomes: OffspringOutcome[]; }
export interface CombinationDefinition { id: string; species: string; name: string; componentLocusIds: string[]; aliases?: string[]; evidence: EvidenceRecord[]; status: "recognised" | "community_name" | "unresolved"; }
export interface GeneticsDatabase { loci: LocusDefinition[]; combinations: CombinationDefinition[]; }
export function alleleIdentity(allele: AlleleDefinition): string[] { return [allele.id, allele.name, ...(allele.aliases ?? [])].map((value) => value.trim().toLowerCase()).filter(Boolean); }
export function getLocusAllele(locus: LocusDefinition, value: string): AlleleDefinition | undefined { const query = value.trim().toLowerCase(); return locus.alleles.find((allele) => alleleIdentity(allele).includes(query)); }
export function genotypeLabel(locus: LocusDefinition, paternal: AlleleDefinition, maternal: AlleleDefinition): string {
  if (paternal.isWildType && maternal.isWildType) return "Wild type";
  if (locus.inheritance === "recessive" && (paternal.isWildType || maternal.isWildType)) return `Het ${paternal.isWildType ? maternal.name : paternal.name}`;
  if (paternal.id === maternal.id) return paternal.name;
  return `${paternal.name} / ${maternal.name}`;
}
function unorderedKey(a: string, b: string): string { return [a, b].sort().join("|"); }
function phenotypeStatus(locus: LocusDefinition, paternal: AlleleDefinition, maternal: AlleleDefinition): GeneticPhenotypeStatus {
  if (paternal.isWildType && maternal.isWildType) return "wild_type";
  if (locus.inheritance === "recessive") return paternal.isWildType || maternal.isWildType ? "heterozygous" : "visual";
  if (["dominant", "incomplete_dominant", "codominant"].includes(locus.inheritance)) return "visual";
  if (locus.inheritance === "allelic") {
    if (paternal.id === maternal.id) return paternal.isWildType ? "wild_type" : "visual";
    return paternal.isWildType || maternal.isWildType ? "heterozygous" : "mixed_allelic";
  }
  return "unresolved";
}
function isSuper(locus: LocusDefinition, paternal: AlleleDefinition, maternal: AlleleDefinition): boolean { return Boolean(locus.superAlleleId && locus.superStatus === "supported" && paternal.id === locus.superAlleleId && maternal.id === locus.superAlleleId); }
function wildState(locus: LocusDefinition): GeneticState {
  const wild = locus.alleles.find((allele) => allele.isWildType);
  if (!wild) throw new Error(`Locus ${locus.name} has no wild-type allele.`);
  return { locusId: locus.id, paternalAlleleId: wild.id, maternalAlleleId: wild.id };
}
export function calculateLocus(locus: LocusDefinition, parentA: GeneticState, parentB: GeneticState): LocusResult {
  if (parentA.locusId !== locus.id || parentB.locusId !== locus.id) throw new Error(`State/locus mismatch for ${locus.name}`);
  const a1 = getLocusAllele(locus, parentA.paternalAlleleId), a2 = getLocusAllele(locus, parentA.maternalAlleleId), b1 = getLocusAllele(locus, parentB.paternalAlleleId), b2 = getLocusAllele(locus, parentB.maternalAlleleId);
  if (!a1 || !a2 || !b1 || !b2) throw new Error(`Invalid allele state for locus ${locus.name}`);
  const raw: Array<[AlleleDefinition, AlleleDefinition]> = [[a1, b1], [a1, b2], [a2, b1], [a2, b2]];
  const grouped = new Map<string, OffspringOutcome>();
  for (const [paternal, maternal] of raw) {
    const key = unorderedKey(paternal.id, maternal.id), existing = grouped.get(key);
    if (existing) { existing.probability += 0.25; continue; }
    const copiesByAllele: Record<string, number> = { [paternal.id]: paternal.id === maternal.id ? 2 : 1 };
    if (paternal.id !== maternal.id) copiesByAllele[maternal.id] = 1;
    grouped.set(key, { locusId: locus.id, paternalAlleleId: paternal.id, maternalAlleleId: maternal.id, probability: 0.25, copiesByAllele, label: genotypeLabel(locus, paternal, maternal), phenotypeStatus: phenotypeStatus(locus, paternal, maternal), superForm: isSuper(locus, paternal, maternal) });
  }
  return { locus, outcomes: [...grouped.values()].sort((a, b) => b.probability - a.probability) };
}
export function calculateGenome(database: GeneticsDatabase, parentA: ParentGenome, parentB: ParentGenome): LocusResult[] {
  if (parentA.species !== parentB.species) throw new Error("Cross-species genetics are not supported by this engine.");
  return database.loci.filter((locus) => locus.species === parentA.species).flatMap((locus) => {
    const a = parentA.states.find((state) => state.locusId === locus.id);
    const b = parentB.states.find((state) => state.locusId === locus.id);
    if (!a && !b) return [calculateLocus(locus, wildState(locus), wildState(locus))];
    return [calculateLocus(locus, a ?? wildState(locus), b ?? wildState(locus))];
  });
}
export function resolveCombination(database: GeneticsDatabase, species: string, query: string): CombinationDefinition | undefined {
  const normalised = query.trim().toLowerCase();
  return database.combinations.find((combination) => combination.species === species && [combination.name, combination.id, ...(combination.aliases ?? [])].some((value) => value.trim().toLowerCase() === normalised));
}
