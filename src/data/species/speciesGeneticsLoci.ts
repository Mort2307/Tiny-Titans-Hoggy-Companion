export type GeneticsLocusDefinition = {
  locusId: string;
  geneId: string;
  heteroallelicPhenotype?: string;
};

/** Species-specific allelic-series metadata. */
export const SPECIES_GENETICS_LOCI: Record<string, GeneticsLocusDefinition[]> = {
  "pantherophis-guttatus": [
    { locusId: "pantherophis-guttatus-clcn2-pattern", geneId: "motley", heteroallelicPhenotype: "Motley/Stripe (intermediate)" },
    { locusId: "pantherophis-guttatus-clcn2-pattern", geneId: "stripe", heteroallelicPhenotype: "Motley/Stripe (intermediate)" },
  ],
};

export function getSpeciesGeneticsLocus(speciesId: string | undefined, geneId: string): GeneticsLocusDefinition | undefined {
  if (!speciesId) return undefined;
  return SPECIES_GENETICS_LOCI[speciesId]?.find((entry) => entry.geneId === geneId);
}

export function getSpeciesLocusMembers(speciesId: string | undefined, locusId: string): GeneticsLocusDefinition[] {
  if (!speciesId) return [];
  return (SPECIES_GENETICS_LOCI[speciesId] ?? []).filter((entry) => entry.locusId === locusId);
}
