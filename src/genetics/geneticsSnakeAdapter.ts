import type { Snake } from "../types/Snake";
import type { GeneticsDatabase, GeneticState, LocusDefinition, ParentGenome } from "./geneticsModel";
import { getSpeciesLoci } from "./geneticsDatabase";
import { resolveStrictMorph } from "../utils/geneticsIdentity";

export type SnakeGenomeBuild = {
  genome: ParentGenome;
  warnings: string[];
  supported: boolean;
};

const SPECIES_ALIASES: Record<string, string> = {
  "western hognose": "Heterodon nasicus",
  "western hognose snake": "Heterodon nasicus",
  "heterodon nasicus": "Heterodon nasicus",
  "corn snake": "Pantherophis guttatus",
  "corn snake (pantherophis guttatus)": "Pantherophis guttatus",
  "pantherophis guttatus": "Pantherophis guttatus",
};

export function canonicalSpecies(species: string): string {
  const key = species.trim().toLowerCase();
  return SPECIES_ALIASES[key] ?? species.trim();
}

function matchesGene(locus: LocusDefinition, value: string): boolean {
  const resolved = resolveStrictMorph(value);
  const candidates = [resolved?.geneId, resolved?.name, value].filter(Boolean).map((item) => item!.trim().toLowerCase());
  return locus.alleles.some((allele) => [allele.id, allele.name, ...(allele.aliases ?? [])].some((candidate) => candidates.includes(candidate.toLowerCase())));
}

function findAllele(locus: LocusDefinition, value: string) {
  const resolved = resolveStrictMorph(value);
  const candidates = [resolved?.geneId, resolved?.name, value].filter(Boolean).map((item) => item!.trim().toLowerCase());
  return locus.alleles.find((allele) => [allele.id, allele.name, ...(allele.aliases ?? [])].some((candidate) => candidates.includes(candidate.toLowerCase())));
}

function explicitSuperName(locus: LocusDefinition, snake: Snake): string | undefined {
  if (!locus.superAlleleId) return undefined;
  const superAllele = locus.alleles.find((allele) => allele.id === locus.superAlleleId);
  if (!superAllele) return undefined;
  const names = [`super ${superAllele.name}`, ...(superAllele.aliases ?? []).map((alias) => `super ${alias}`)];
  return snake.morphs.find((morph) => names.some((name) => name.toLowerCase() === morph.trim().toLowerCase()));
}

export function buildSnakeGenome(snake: Snake, database?: GeneticsDatabase): SnakeGenomeBuild {
  const canonical = canonicalSpecies(snake.species);
  const loci = (database?.loci ?? getSpeciesLoci(canonical));
  const warnings: string[] = [];
  const states: GeneticState[] = [];

  if (!loci.length) {
    return { genome: { species: canonical, states }, warnings: [`No canonical genetics loci are registered for ${snake.species}.`], supported: false };
  }

  for (const locus of loci) {
    const visual = snake.morphs.find((morph) => matchesGene(locus, morph));
    const superVisual = explicitSuperName(locus, snake);
    const het = snake.hets.find((entry) => {
      const source = entry.geneId ?? entry.gene;
      return matchesGene(locus, source);
    });

    if (superVisual && locus.superStatus === "supported" && locus.superAlleleId) {
      states.push({ locusId: locus.id, paternalAlleleId: locus.superAlleleId, maternalAlleleId: locus.superAlleleId });
      continue;
    }

    if (visual) {
      const allele = findAllele(locus, visual);
      if (!allele) continue;
      if (locus.inheritance === "recessive") {
        states.push({ locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: allele.id });
      } else if (locus.inheritance === "dominant" || locus.inheritance === "incomplete_dominant" || locus.inheritance === "codominant") {
        const wild = locus.alleles.find((candidate) => candidate.isWildType);
        if (!wild) throw new Error(`Locus ${locus.name} has no wild-type allele.`);
        states.push({ locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id });
      } else {
        warnings.push(`${locus.name}: the recorded visual phenotype does not uniquely identify the genotype for an allelic/complex locus. Exact breeding probabilities are withheld.`);
      }
      continue;
    }

    if (het) {
      const source = het.geneId ?? het.gene;
      const allele = findAllele(locus, source);
      const percentage = String(het.percentage).replace(/\s/g, "");
      if (!allele) continue;
      if (percentage === "100%" || percentage === "100") {
        const wild = locus.alleles.find((candidate) => candidate.isWildType);
        if (!wild) throw new Error(`Locus ${locus.name} has no wild-type allele.`);
        states.push({ locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id });
      } else {
        warnings.push(`${locus.name}: ${percentage} het records are probability-bearing uncertainty and are not collapsed into a false exact genotype.`);
      }
    }
  }

  const supported = warnings.length === 0;
  return { genome: { species: canonical, states }, warnings, supported };
}
