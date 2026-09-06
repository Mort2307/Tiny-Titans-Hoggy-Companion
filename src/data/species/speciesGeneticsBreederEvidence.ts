import type { MasterMorphDefinition } from "../masterMorphDatabase";
import type { MorphEvidenceSourceDefinition } from "../morphEvidenceSources";

type BreederEvidenceOverlay = {
  speciesName: string;
  traitName: string;
  aliases?: string[];
  inheritance: MasterMorphDefinition["inheritance"];
  evidenceStatus: "confirmed" | "recognised";
  evidenceNote: string;
  sources: MorphEvidenceSourceDefinition[];
};

const breederSource = (id: string, label: string, url: string, notes: string): MorphEvidenceSourceDefinition => ({
  id,
  label,
  url,
  type: "breeder-reference",
  authority: "secondary",
  notes,
});

const reticSunfire = breederSource(
  "morphmarket-retic-sunfire",
  "MorphMarket Morphpedia — Sunfire Reticulated Python",
  "https://www.morphmarket.com/morphpedia/reticulated-pythons/sunfire/",
  "Specialist reptile genetics reference records Sunfire as incomplete dominant and documents its established breeding history and combinations.",
);
const reticTiger = breederSource(
  "morphmarket-retic-tiger",
  "MorphMarket Morphpedia — Tiger Reticulated Python",
  "https://www.morphmarket.com/morphpedia/reticulated-pythons/tiger/",
  "Specialist reptile genetics reference records Tiger as incomplete dominant and documents captive production from the founding animal.",
);
const milkAlbino = breederSource(
  "morphmarket-milk-albino",
  "MorphMarket Morphpedia — Milk Snake Albino",
  "https://www.morphmarket.com/morphpedia/milk-snakes/albino/",
  "Morphpedia records Milk Snake Albino as recessive and describes its proven simple-recessive breeding history.",
);
const milkHypo = breederSource(
  "morphmarket-milk-hypo",
  "MorphMarket Morphpedia — Milk Snake Hypo",
  "https://www.morphmarket.com/morphpedia/milk-snakes/hypo/",
  "Morphpedia records Milk Snake Hypo as recessive and documents the original breeding work that demonstrated inheritance.",
);
const milkAnery = breederSource(
  "morphmarket-milk-anery",
  "MorphMarket Morphpedia — Milk Snake Anerythristic",
  "https://www.morphmarket.com/morphpedia/milk-snakes/anerythristic/",
  "Morphpedia records Milk Snake Anerythristic as recessive and documents its captive proving history.",
);
const boaJungle = breederSource(
  "morphmarket-boa-jungle",
  "MorphMarket Morphpedia — Jungle Boa",
  "https://www.morphmarket.com/morphpedia/boa-constrictors/jungle/",
  "Specialist boa genetics reference records Jungle as incomplete dominant and documents Jungle and Super Jungle production.",
);

const OVERLAYS: BreederEvidenceOverlay[] = [
  { speciesName: "Malayopython reticulatus", traitName: "Sunfire", inheritance: "Incomplete Dominant", evidenceStatus: "confirmed", evidenceNote: "Established captive breeding records support incomplete-dominant inheritance for Sunfire in Reticulated Pythons.", sources: [reticSunfire] },
  { speciesName: "Malayopython reticulatus", traitName: "Tiger", inheritance: "Incomplete Dominant", evidenceStatus: "confirmed", evidenceNote: "Established captive breeding records support incomplete-dominant inheritance for Tiger in Reticulated Pythons.", sources: [reticTiger] },
  { speciesName: "Boa constrictor", traitName: "Jungle", inheritance: "Incomplete Dominant", evidenceStatus: "confirmed", evidenceNote: "Specialist breeding records describe Jungle as incomplete dominant and document the Super Jungle form; fertility and viability issues are tracked separately from inheritance.", sources: [boaJungle] },
  { speciesName: "Boa imperator", traitName: "Jungle", inheritance: "Incomplete Dominant", evidenceStatus: "recognised", evidenceNote: "Jungle is extensively documented in the boa trade, but the available source is a broad Boa Constrictor reference rather than a species-specific molecular distinction, so this record remains recognised-only for Boa imperator.", sources: [boaJungle] },
  { speciesName: "Lampropeltis triangulum", traitName: "Albino", aliases: ["Amel", "Amelanistic"], inheritance: "Recessive", evidenceStatus: "recognised", evidenceNote: "Specialist Milk Snake breeding reference documents simple-recessive Albino inheritance. Species/subspecies attribution varies across the milk-snake trade, so this remains recognised-only until the exact taxon is resolved.", sources: [milkAlbino] },
  { speciesName: "Lampropeltis triangulum", traitName: "Hypo", aliases: ["Hypomelanistic"], inheritance: "Recessive", evidenceStatus: "recognised", evidenceNote: "Specialist Milk Snake breeding reference documents simple-recessive Hypo inheritance. Exact species/subspecies provenance remains important for individual animals.", sources: [milkHypo] },
  { speciesName: "Lampropeltis triangulum", traitName: "Anerythristic", aliases: ["Anery", "Hypoerythristic"], inheritance: "Recessive", evidenceStatus: "recognised", evidenceNote: "Specialist Milk Snake breeding reference documents simple-recessive Anerythristic inheritance; trade taxonomy is not uniform enough to treat the reference as species-specific molecular proof.", sources: [milkAnery] },
];

export function applyBreederGeneticsEvidence(catalogues: Record<string, MasterMorphDefinition[]>): Record<string, MasterMorphDefinition[]> {
  const result: Record<string, MasterMorphDefinition[]> = Object.fromEntries(Object.entries(catalogues).map(([speciesName, traits]) => [speciesName, [...traits]]));
  for (const overlay of OVERLAYS) {
    const traits = result[overlay.speciesName] ?? [];
    const index = traits.findIndex((entry) => entry.name.trim().toLowerCase() === overlay.traitName.trim().toLowerCase());
    if (index < 0) continue;
    const current = traits[index];
    traits[index] = {
      ...current,
      ...(overlay.aliases ? { aliases: Array.from(new Set([...(current.aliases ?? []), ...overlay.aliases])) } : {}),
      inheritance: overlay.inheritance,
      hetPossible: overlay.inheritance === "Recessive",
      verification: overlay.evidenceStatus === "confirmed" ? "Confirmed" : "Recognised",
      evidenceStatus: overlay.evidenceStatus,
      evidenceNote: overlay.evidenceNote,
      sourceUrl: overlay.sources[0]?.url ?? current.sourceUrl,
      sourceLabel: overlay.sources[0]?.label ?? current.sourceLabel,
      sourceLinks: overlay.sources,
    };
  }
  return result;
}

export const BREEDER_GENETICS_OVERLAY_COUNT = OVERLAYS.length;
