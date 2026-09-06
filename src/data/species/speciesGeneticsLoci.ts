export type GeneticsAlleleDefinition = {
  alleleId: string;
  geneId?: string;
  label: string;
  isWildType?: boolean;
};

export type GeneticsLocusPhenotypeRule = {
  alleleIds: [string, string];
  phenotypeId?: string;
  phenotypeLabel?: string;
  visualGeneId?: string;
};

export type GeneticsLocusDefinition = {
  locusId: string;
  speciesId: string;
  label: string;
  alleles: GeneticsAlleleDefinition[];
  phenotypeRules?: GeneticsLocusPhenotypeRule[];
  heteroallelicPhenotype?: string;
};

/** Species-specific locus model. Entries describe alleles at one locus, not independent genes. */
export const SPECIES_GENETICS_LOCI: Record<string, GeneticsLocusDefinition[]> = {
  "pantherophis-guttatus": [
    {
      locusId: "pantherophis-guttatus-clcn2-pattern",
      speciesId: "pantherophis-guttatus",
      label: "CLCN2 pattern locus",
      alleles: [
        { alleleId: "clcn2-wild", label: "Wild type", isWildType: true },
        { alleleId: "clcn2-motley", geneId: "motley", label: "Motley" },
        { alleleId: "clcn2-stripe", geneId: "stripe", label: "Stripe" },
      ],
      phenotypeRules: [
        { alleleIds: ["clcn2-motley", "clcn2-motley"], visualGeneId: "motley" },
        { alleleIds: ["clcn2-stripe", "clcn2-stripe"], visualGeneId: "stripe" },
        { alleleIds: ["clcn2-motley", "clcn2-stripe"], phenotypeId: "clcn2-motley-stripe-intermediate", phenotypeLabel: "Motley/Stripe (intermediate)" },
      ],
      heteroallelicPhenotype: "Motley/Stripe (intermediate)",
    },
  ],
};

export function getSpeciesGeneticsLocus(speciesId: string | undefined, geneId: string): GeneticsLocusDefinition | undefined {
  if (!speciesId) return undefined;
  return SPECIES_GENETICS_LOCI[speciesId]?.find((locus) => locus.alleles.some((allele) => allele.geneId === geneId));
}

export function getSpeciesLocus(speciesId: string | undefined, locusId: string): GeneticsLocusDefinition | undefined {
  if (!speciesId) return undefined;
  return SPECIES_GENETICS_LOCI[speciesId]?.find((locus) => locus.locusId === locusId);
}

/** Backward-compatible gene-member view for existing validators. */
export function getSpeciesLocusMembers(speciesId: string | undefined, locusId: string): Array<{ locusId: string; geneId: string }> {
  const locus = getSpeciesLocus(speciesId, locusId);
  if (!locus) return [];
  return locus.alleles.filter((allele) => allele.geneId).map((allele) => ({ locusId, geneId: allele.geneId! }));
}

export function getSpeciesLocusAllele(speciesId: string | undefined, locusId: string, alleleId: string): GeneticsAlleleDefinition | undefined {
  return getSpeciesLocus(speciesId, locusId)?.alleles.find((allele) => allele.alleleId === alleleId);
}

export function getSpeciesLocusPhenotypeRule(speciesId: string | undefined, locusId: string, alleleA: string, alleleB: string): GeneticsLocusPhenotypeRule | undefined {
  const locus = getSpeciesLocus(speciesId, locusId);
  if (!locus) return undefined;
  const wanted = new Set([alleleA, alleleB]);
  return locus.phenotypeRules?.find((rule) => rule.alleleIds.length === 2 && rule.alleleIds.every((id) => wanted.has(id)) && wanted.size === new Set(rule.alleleIds).size);
}

export function getSpeciesWildTypeAllele(speciesId: string | undefined, locusId: string): GeneticsAlleleDefinition | undefined {
  return getSpeciesLocus(speciesId, locusId)?.alleles.find((allele) => allele.isWildType);
}
