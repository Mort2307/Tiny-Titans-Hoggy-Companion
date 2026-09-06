import type { MasterMorphDefinition } from "../masterMorphDatabase";
import type { MorphEvidenceSourceDefinition } from "../morphEvidenceSources";

type ScientificEvidenceOverlay = {
  speciesName: string;
  traitName: string;
  aliases?: string[];
  inheritance?: MasterMorphDefinition["inheritance"];
  evidenceStatus: MasterMorphDefinition["evidenceStatus"];
  evidenceNote: string;
  sources: MorphEvidenceSourceDefinition[];
};

const scientificSource = (
  id: string,
  label: string,
  url: string,
  notes: string,
): MorphEvidenceSourceDefinition => ({
  id,
  label,
  url,
  type: "scientific-literature",
  authority: "primary",
  notes,
});

const ballPiebald = scientificSource(
  "omia-python-regius-tfec-piebald",
  "OMIA: TFEC-related piebald in Python regius",
  "https://omia.org/OMIA002761/51751/",
  "OMIA records piebald as a recessive single-gene trait and documents a known TFEC stop-gain variant.",
);
const ballPiebaldPaper = scientificSource(
  "garcia-elfring-2023-tfec-piebald",
  "Garcia-Elfring et al. (2023) — Piebaldism and TFEC",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC10712277/",
  "Peer-reviewed whole-genome and segregation evidence links recessive ball-python piebaldism to TFEC.",
);
const ballGch2 = scientificSource(
  "omia-python-regius-gch2-axanthic",
  "OMIA: GCH2-related axanthism in Python regius",
  "https://omia.org/OMIA002937/51751/",
  "OMIA records axanthism as autosomal recessive and identifies a known GCH2-associated variant.",
);
const ballGch2Paper = scientificSource(
  "garcia-elfring-2025-gch2-axanthic",
  "García-Elfring et al. (2025) — GCH2 and ball-python axanthism",
  "https://onlinelibrary.wiley.com/doi/10.1111/age.70011",
  "Peer-reviewed whole-genome pool-sequencing study associates a GCH2 premature stop codon with captive ball-python axanthism.",
);
const ballMlph = scientificSource(
  "omia-python-regius-mlph-ghost",
  "OMIA: MLPH-related dilution in Python regius",
  "https://omia.org/OMIA002758/51751/",
  "OMIA names Ghost/Hypo/Orange Ghost as the species-specific MLPH-related phenotype and records recessive inheritance.",
);
const ballMlphPaper = scientificSource(
  "lederer-2023-mlph-ghost",
  "Lederer et al. (2023) — MLPH and the Ghost phenotype",
  "https://omia.org/OMIA002758/51751/",
  "OMIA cites the primary study identifying a homozygous MLPH deletion in the Ghost phenotype.",
);
const ballMc1r = scientificSource(
  "omia-python-regius-mc1r-clown",
  "OMIA: MC1R-related Clown colour morph in Python regius",
  "https://omia.org/OMIA002770/51751/",
  "OMIA documents a species-specific MC1R variant associated with the Clown colour morph; inheritance is not promoted here without an explicit mode in the source record.",
);
const ballEdnrb2 = scientificSource(
  "omia-python-regius-ednrb2-yellowbelly",
  "OMIA: EDNRB2-related Yellowbelly series in Python regius",
  "https://omia.org/OMIA002701/51751/",
  "OMIA documents multiple EDNRB2-associated Yellowbelly-series colour phenotypes and corrects earlier gene annotation; retained as reference-only series evidence.",
);
const cornLyst = scientificSource(
  "omia-pantherophis-guttatus-lyst-lavender",
  "OMIA: LYST-related Lavender in Pantherophis guttatus",
  "https://omia.org/OMIA002449/94885/",
  "OMIA links the Lavender colour morph to a LYST premature-stop variant.",
);
const cornLystPaper = scientificSource(
  "ullate-agote-2020-lyst-lavender",
  "Ullate-Agote et al. (2020) — LYST mutation and Lavender corn snakes",
  "https://pubmed.ncbi.nlm.nih.gov/33020272/",
  "Peer-reviewed genome mapping identifies the Lavender-associated LYST mutation in Pantherophis guttatus.",
);
const cornPmel = scientificSource(
  "omia-pantherophis-guttatus-pmel-terrazzo",
  "OMIA: PMEL-related Terrazzo in Pantherophis guttatus",
  "https://omia.org/OMIA002884/94885/",
  "OMIA records Terrazzo as an autosomal recessive single-gene trait with a known PMEL splice-associated variant.",
);
const cornPmelPaper = scientificSource(
  "tzika-2024-pmel-terrazzo",
  "Tzika et al. (2024) — PMEL and the Terrazzo corn snake morph",
  "https://www.nature.com/articles/s41467-024-51927-0",
  "Peer-reviewed genome mapping and functional knockout work identifies PMEL as the causal locus for the Terrazzo pattern phenotype.",
);

const OVERLAYS: ScientificEvidenceOverlay[] = [
  {
    speciesName: "Python regius",
    traitName: "Piebald",
    evidenceStatus: "confirmed",
    evidenceNote: "Molecular evidence supports recessive TFEC-associated piebaldism in ball pythons.",
    sources: [ballPiebald, ballPiebaldPaper],
  },
  {
    speciesName: "Python regius",
    traitName: "Axanthic",
    aliases: ["GCH2 Axanthic", "GCH2-Related Axanthic"],
    inheritance: "Recessive",
    evidenceStatus: "confirmed",
    evidenceNote: "GCH2-associated axanthism is documented as an autosomal recessive single-gene trait.",
    sources: [ballGch2, ballGch2Paper],
  },
  {
    speciesName: "Python regius",
    traitName: "Hypo",
    aliases: ["Ghost", "Hypomelanistic", "Orange Ghost"],
    evidenceStatus: "confirmed",
    evidenceNote: "The Ghost/Hypo/Orange Ghost phenotype is linked to a recessive MLPH variant in ball pythons.",
    sources: [ballMlph, ballMlphPaper],
  },
  {
    speciesName: "Python regius",
    traitName: "Clown",
    evidenceStatus: "recognised",
    evidenceNote: "MC1R is associated with the Clown colour morph, but this overlay deliberately does not promote it to calculator-confirmed inheritance without an explicit inheritance mode in the source record.",
    sources: [ballMc1r],
  },
  {
    speciesName: "Python regius",
    traitName: "Yellowbelly",
    aliases: ["Yellowbelly Series", "YB"],
    inheritance: "Unknown",
    evidenceStatus: "recognised",
    evidenceNote: "EDNRB2-associated Yellowbelly-series phenotypes are scientifically documented, but the source describes a series of variants/phenotypes rather than a single simple Mendelian morph record, so it remains reference-only.",
    sources: [ballEdnrb2],
  },
  {
    speciesName: "Pantherophis guttatus",
    traitName: "Lavender",
    aliases: ["Lavender Corn"],
    inheritance: "Recessive",
    evidenceStatus: "confirmed",
    evidenceNote: "Genome mapping and OMIA evidence associate the Lavender corn-snake phenotype with a recessive LYST variant.",
    sources: [cornLyst, cornLystPaper],
  },
  {
    speciesName: "Pantherophis guttatus",
    traitName: "Terrazzo",
    aliases: ["Terrazzo Corn"],
    inheritance: "Recessive",
    evidenceStatus: "confirmed",
    evidenceNote: "PMEL is the molecularly characterized locus underlying the recessive Terrazzo pattern phenotype.",
    sources: [cornPmel, cornPmelPaper],
  },
];

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function applyScientificEvidence(
  catalogues: Record<string, MasterMorphDefinition[]>,
): Record<string, MasterMorphDefinition[]> {
  const result: Record<string, MasterMorphDefinition[]> = Object.fromEntries(
    Object.entries(catalogues).map(([speciesName, traits]) => [speciesName, [...traits]]),
  );

  for (const overlay of OVERLAYS) {
    const traits = result[overlay.speciesName] ?? [];
    const index = traits.findIndex((entry) => sameName(entry.name, overlay.traitName));
    if (index >= 0) {
      const current = traits[index];
      traits[index] = {
        ...current,
        ...(overlay.aliases ? { aliases: Array.from(new Set([...(current.aliases ?? []), ...overlay.aliases])) } : {}),
        ...(overlay.inheritance ? { inheritance: overlay.inheritance, hetPossible: overlay.inheritance === "Recessive" } : {}),
        verification: overlay.evidenceStatus === "confirmed" ? "Confirmed" : "Recognised",
        evidenceStatus: overlay.evidenceStatus,
        evidenceNote: overlay.evidenceNote,
        sourceUrl: overlay.sources[0]?.url ?? current.sourceUrl,
        sourceLabel: overlay.sources[0]?.label ?? current.sourceLabel,
        sourceLinks: overlay.sources,
      };
    } else {
      const geneId = overlay.traitName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const inheritance = overlay.inheritance ?? "Unknown";
      traits.push({
        geneId,
        name: overlay.traitName,
        aliases: overlay.aliases ?? [],
        kind: "Gene",
        isGene: true,
        category: "Species gene",
        inheritance,
        hetPossible: inheritance === "Recessive",
        verification: overlay.evidenceStatus === "confirmed" ? "Confirmed" : "Recognised",
        evidenceStatus: overlay.evidenceStatus,
        evidenceNote: overlay.evidenceNote,
        description: `Scientifically characterized ${overlay.traitName} phenotype documented for ${overlay.speciesName}.`,
        educationalNotes: "Scientific evidence is species-specific. Individual animal genotype and breeder records remain separate from phenotype identification.",
        sourceUrl: overlay.sources[0]?.url,
        sourceLabel: overlay.sources[0]?.label,
        sourceLinks: overlay.sources,
      });
    }
    result[overlay.speciesName] = traits;
  }

  return result;
}

export const SCIENTIFIC_GENETICS_OVERLAY_COUNT = OVERLAYS.length;
