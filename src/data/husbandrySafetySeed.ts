import type {
  HusbandrySafetyAssessment,
  HusbandrySafetyEvidenceLevel,
  HusbandrySafetyItem,
  HusbandrySafetyRegion,
  HusbandrySafetyStatus,
} from "../types/husbandrySafety";

const HOGNOSE_ID = "heterodon-nasicus";
const REVIEWED_ON = "2026-10-03";

function hognoseAssessment(
  status: HusbandrySafetyStatus,
  reason: string,
  evidenceLevel: HusbandrySafetyEvidenceLevel,
  sourceIds: string[],
  options: Partial<Pick<HusbandrySafetyAssessment, "risks" | "preparation" | "alternatives" | "evidenceNote">> = {},
): HusbandrySafetyAssessment {
  return {
    scope: "species",
    scopeId: HOGNOSE_ID,
    status,
    reason,
    risks: options.risks ?? [],
    preparation: options.preparation ?? [],
    alternatives: options.alternatives ?? [],
    evidenceLevel,
    evidenceNote: options.evidenceNote ?? "Assessment combines the cited evidence with a conservative enclosure-safety boundary. It is not a claim that controlled Western Hognose toxicology trials exist.",
    sourceIds,
    reviewedOn: REVIEWED_ON,
  };
}

function leaf(
  id: string,
  commonName: string,
  scientificName: string,
  regions: HusbandrySafetyRegion[],
  assessment: HusbandrySafetyAssessment,
  aliases: string[] = [],
  identificationWarning?: string,
): HusbandrySafetyItem {
  return {
    id,
    commonName,
    scientificName,
    aliases,
    category: "leaf-litter",
    regions,
    summary: assessment.reason,
    identificationWarning,
    assessments: [assessment],
  };
}

const cleanLeafPreparation = [
  "Use only correctly identified leaves from a pesticide- and herbicide-free source.",
  "Avoid roadside, heavily trafficked, sprayed or visibly contaminated collection sites.",
  "Inspect for mould, animal waste and obvious pests before use.",
  "Use fully dry leaf litter unless a species-specific bioactive setup calls for another preparation method.",
];

export const HUSBANDRY_SAFETY_SEED: HusbandrySafetyItem[] = [
  leaf(
    "oak-leaves",
    "Oak leaves",
    "Quercus spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("safe", "Established vivarium leaf-litter material when correctly identified, clean and chemical-free.", "moderate", ["neherpLeafLitter", "joshsFrogsLeafLitter"], {
      risks: ["Pesticide/herbicide contamination", "Roadside pollutants", "Mould from damp storage", "Incorrect tree identification"],
      preparation: cleanLeafPreparation,
      evidenceNote: "Vivarium use is well established in specialist husbandry sources, but the classification is husbandry-practice evidence rather than a controlled Heterodon nasicus exposure study.",
    }),
    ["oak", "quercus", "live oak", "water oak", "red oak"],
  ),
  leaf(
    "magnolia-leaves",
    "Magnolia leaves",
    "Magnolia spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("safe", "Widely used durable vivarium leaf litter when sourced cleanly and allowed to dry.", "moderate", ["neherpLeafLitter", "joshsFrogsLeafLitter"], {
      risks: ["Chemical contamination", "Mould if stored wet", "Unknown ornamental treatment history"],
      preparation: cleanLeafPreparation,
      evidenceNote: "Specialist vivarium suppliers consistently use magnolia leaf litter. This supports husbandry suitability but is not species-specific toxicology.",
    }),
    ["magnolia", "southern magnolia"],
  ),
  leaf(
    "sea-grape-leaves",
    "Sea grape leaves",
    "Coccoloba uvifera",
    ["us", "north-america"],
    hognoseAssessment("safe", "Recognised vivarium leaf litter when chemical-free and correctly identified.", "moderate", ["joshsFrogsLeafLitter"], {
      risks: ["Chemical contamination", "Collection legality or local restrictions", "Incorrect identification"],
      preparation: cleanLeafPreparation,
    }),
    ["sea grape", "seagrape"],
  ),
  leaf(
    "beech-leaves",
    "Beech leaves",
    "Fagus spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("caution", "Commonly used by keepers, but the current Tiny Titans source set does not yet contain strong reptile-specific evidence for promoting beech to the same confidence as oak or magnolia.", "limited", [], {
      risks: ["Insufficient reptile-specific evidence", "Chemical contamination", "Incorrect identification"],
      preparation: cleanLeafPreparation,
      alternatives: ["Oak leaves", "Magnolia leaves"],
      evidenceNote: "Pending stronger husbandry or toxicology sourcing. Caution here means evidence-gap management, not that beech is known to be toxic to Western Hognoses.",
    }),
    ["beech", "fagus"],
  ),
  leaf(
    "birch-leaves",
    "Birch leaves",
    "Betula spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("caution", "No specific hazard is asserted, but the current evidence set is not strong enough for a high-confidence Western Hognose safe classification.", "limited", [], {
      risks: ["Insufficient reptile-specific evidence", "Chemical contamination"],
      preparation: cleanLeafPreparation,
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["birch", "betula"],
  ),
  leaf(
    "hazel-leaves",
    "Hazel leaves",
    "Corylus avellana",
    ["uk", "europe"],
    hognoseAssessment("caution", "Potential leaf-litter option, but currently retained as caution until stronger enclosure-specific evidence is attached.", "limited", [], {
      risks: ["Evidence gap", "Chemical contamination", "Misidentification"],
      preparation: cleanLeafPreparation,
      alternatives: ["Oak leaves"],
    }),
    ["hazel", "corylus"],
  ),
  leaf(
    "hornbeam-leaves",
    "Hornbeam leaves",
    "Carpinus betulus",
    ["uk", "europe"],
    hognoseAssessment("caution", "No known Western Hognose-specific problem is encoded, but direct husbandry evidence remains limited.", "limited", [], {
      risks: ["Evidence gap", "Chemical contamination"],
      preparation: cleanLeafPreparation,
      alternatives: ["Oak leaves"],
    }),
    ["hornbeam", "carpinus"],
  ),
  leaf(
    "hawthorn-leaves",
    "Hawthorn leaves",
    "Crataegus monogyna",
    ["uk", "europe"],
    hognoseAssessment("caution", "Leaf material is retained as caution while enclosure-specific sourcing is expanded; do not introduce thorny stems with it.", "limited", [], {
      risks: ["Evidence gap", "Thorny stem fragments", "Chemical contamination"],
      preparation: [...cleanLeafPreparation, "Remove thorny twigs and woody fragments."],
      alternatives: ["Oak leaves"],
    }),
    ["hawthorn", "crataegus"],
  ),
  leaf(
    "willow-leaves",
    "Willow leaves",
    "Salix spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("caution", "Keep as a researched-but-not-promoted option until stronger reptile-specific evidence is attached.", "limited", [], {
      risks: ["Evidence gap", "Chemical contamination"],
      preparation: cleanLeafPreparation,
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["willow", "salix"],
  ),
  leaf(
    "maple-leaves",
    "Maple leaves",
    "Acer spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("caution", "Acer is a broad genus and common names vary by region, so Tiny Titans does not apply a blanket safe classification.", "limited", [], {
      risks: ["Species-level identification uncertainty", "Regional naming differences", "Chemical contamination"],
      preparation: cleanLeafPreparation,
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["maple", "acer"],
    "Confirm the actual Acer species. Common names can be misleading between the UK and North America.",
  ),
  leaf(
    "sycamore-uk-leaves",
    "Sycamore leaves (UK)",
    "Acer pseudoplatanus",
    ["uk", "europe"],
    hognoseAssessment("caution", "Tiny Titans does not currently have enough reptile-specific evidence to recommend UK sycamore leaf litter when better-characterised options are available.", "limited", [], {
      risks: ["Evidence gap", "Common-name confusion with North American sycamores", "Chemical contamination"],
      alternatives: ["Oak leaves"],
    }),
    ["uk sycamore", "acer pseudoplatanus"],
    "In the UK, sycamore usually means Acer pseudoplatanus. In North America, 'sycamore' commonly refers to Platanus species.",
  ),
  leaf(
    "yew-leaves",
    "Yew leaves",
    "Taxus spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("avoid", "Yew foliage is recognised as highly toxic. There is no husbandry benefit that justifies deliberately introducing it to the enclosure.", "high", ["rhsYew", "rhsHarmfulPlants"], {
      risks: ["Known plant toxicity", "Accidental ingestion by enclosure fauna or other animals", "Keeper exposure during handling"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
      evidenceNote: "The toxicity evidence is not a Western Hognose enclosure trial; the avoid classification applies a conservative hazard-exclusion principle to a well-established toxic plant.",
    }),
    ["yew", "taxus", "taxus baccata", "taxus cuspidata"],
  ),
  leaf(
    "rhododendron-leaves",
    "Rhododendron leaves",
    "Rhododendron spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("avoid", "Rhododendron foliage is documented as harmful if eaten and offers no enclosure advantage over established leaf-litter choices.", "high", ["rhsHarmfulPlants"], {
      risks: ["Recognised plant toxicity", "Unknown reptile-specific exposure response"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["rhododendron", "rhododendron leaves"],
  ),
  leaf(
    "azalea-leaves",
    "Azalea leaves",
    "Rhododendron spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("avoid", "Azaleas are Rhododendron species/cultivars and are kept out of Tiny Titans enclosures under the same conservative toxic-plant boundary.", "high", ["rhsHarmfulPlants"], {
      risks: ["Recognised plant toxicity", "Common-name confusion"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["azalea", "azalea leaves"],
  ),
  leaf(
    "horse-chestnut-leaves",
    "Horse chestnut leaves",
    "Aesculus hippocastanum",
    ["uk", "europe"],
    hognoseAssessment("avoid", "RHS lists Aesculus among potentially harmful plants. Tiny Titans excludes the foliage because safer, better-characterised litter is readily available.", "moderate", ["rhsHarmfulPlants"], {
      risks: ["Potential plant toxicity", "Evidence is not reptile-enclosure-specific"],
      alternatives: ["Oak leaves"],
    }),
    ["horse chestnut", "conker tree leaves", "aesculus"],
  ),
  leaf(
    "cherry-laurel-leaves",
    "Cherry laurel leaves",
    "Prunus laurocerasus",
    ["uk", "europe", "us", "north-america"],
    hognoseAssessment("avoid", "Tiny Titans excludes cherry laurel foliage from reptile enclosures because Prunus laurocerasus is a recognised potentially harmful garden plant and there is no need to accept that uncertainty.", "moderate", ["rhsHarmfulPlants"], {
      risks: ["Potential plant toxicity", "Confusion with unrelated plants called laurel"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["cherry laurel", "common laurel", "prunus laurocerasus"],
    "Do not identify plants from the word 'laurel' alone; several unrelated plants share that common name.",
  ),
  leaf(
    "portugal-laurel-leaves",
    "Portugal laurel leaves",
    "Prunus lusitanica",
    ["uk", "europe"],
    hognoseAssessment("avoid", "Kept out of reptile enclosures under the same conservative Prunus/laurel safety boundary.", "moderate", ["rhsHarmfulPlants"], {
      risks: ["Potential plant toxicity", "Common-name confusion"],
      alternatives: ["Oak leaves"],
    }),
    ["portugal laurel", "prunus lusitanica"],
  ),
  leaf(
    "ivy-leaves",
    "Common ivy leaves",
    "Hedera helix",
    ["uk", "europe", "us", "north-america"],
    hognoseAssessment("avoid", "RHS lists ivy among potentially harmful garden plants. Tiny Titans excludes it as leaf litter rather than treating mammalian/human ingestion data as proof of reptile safety.", "moderate", ["rhsHarmfulPlants"], {
      risks: ["Potential toxicity/irritancy", "Evidence is not reptile-enclosure-specific"],
      alternatives: ["Oak leaves"],
    }),
    ["ivy", "english ivy", "hedera helix"],
  ),
  leaf(
    "oleander-leaves",
    "Oleander leaves",
    "Nerium oleander",
    ["us", "north-america", "europe"],
    hognoseAssessment("avoid", "Oleander contains cardiac glycosides and is a well-established toxic plant. It should not be introduced into an enclosure.", "high", ["aspcaOleander"], {
      risks: ["Cardiac glycoside toxicity", "Severe poisoning risk if ingested by animals", "Contamination during handling"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["oleander", "nerium oleander", "rose-bay"],
  ),
  leaf(
    "poison-ivy-leaves",
    "Poison ivy leaves",
    "Toxicodendron radicans",
    ["us", "north-america"],
    hognoseAssessment("avoid", "Poison ivy contains urushiol. The keeper-contact and contamination hazard alone makes it unsuitable for any vivarium.", "high", ["cdcPoisonousPlants"], {
      risks: ["Urushiol contamination", "Severe allergic contact dermatitis in people", "Persistent contamination of tools and enclosure surfaces"],
      alternatives: ["Oak leaves", "Magnolia leaves", "Sea grape leaves"],
    }),
    ["poison ivy", "toxicodendron radicans"],
    "Do not collect or handle suspected Toxicodendron material for enclosure use.",
  ),
  leaf(
    "eucalyptus-leaves",
    "Eucalyptus leaves",
    "Eucalyptus spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("caution", "Aromatic foliage with a large and chemically varied genus. Tiny Titans does not recommend it as routine Western Hognose leaf litter without species-specific evidence.", "limited", [], {
      risks: ["Aromatic volatile compounds", "Large genus with variable chemistry", "Evidence gap"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["eucalyptus", "gum leaves"],
  ),
  leaf(
    "cedar-foliage",
    "Cedar foliage",
    "Various genera sold as cedar",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("avoid", "The common name cedar covers multiple aromatic conifers. Tiny Titans excludes unidentified cedar foliage rather than guessing which species and volatile profile is present.", "limited", [], {
      risks: ["Aromatic/resinous plant compounds", "Common-name ambiguity", "Evidence gap"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["cedar", "cedar leaves", "cedar needles"],
    "‘Cedar’ can refer to Cedrus, Thuja, Juniperus and other unrelated plants depending on region.",
  ),
  leaf(
    "pine-needles",
    "Pine needles",
    "Pinus spp.",
    ["uk", "us", "europe", "north-america"],
    hognoseAssessment("caution", "Pine needles are resinous/aromatic and are not needed when established broadleaf litter is available. Tiny Titans keeps them out of the routine safe list.", "limited", [], {
      risks: ["Resins and aromatic compounds", "Sharp/dry needle fragments", "Evidence gap"],
      alternatives: ["Oak leaves", "Magnolia leaves"],
    }),
    ["pine needles", "pine leaves", "pinus"],
  ),
];

export const HUSBANDRY_SAFETY_SEED_BY_ID = Object.fromEntries(
  HUSBANDRY_SAFETY_SEED.map((item) => [item.id, item]),
) as Record<string, HusbandrySafetyItem>;
