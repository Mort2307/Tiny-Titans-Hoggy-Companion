import type { UniversalCareEvidence, UniversalCareRequirement, UniversalHealthWatch } from './universalSpeciesCareTypes';
import type { UniversalSpeciesRecord } from './universalSpeciesTypes';

export type SpeciesCareOverride = {
  coverage: 'species' | 'genus';
  sourceIds: string[];
  caveat: string;
  requirements: Array<{
    id: string;
    domain: UniversalCareRequirement['domain'];
    label: string;
    guidance: string;
    priority: UniversalCareRequirement['priority'];
  }>;
  numericRanges?: Array<{
    label: string;
    min: number;
    max: number;
    unit: string;
    context?: string;
  }>;
  health?: Array<{
    id: string;
    concern: string;
    watchFor: string[];
    riskFactors: string[];
    prevention: string;
    priority: UniversalHealthWatch['priority'];
  }>;
};

const DART_FROG_CAVEAT = 'Species-specific husbandry source from Josh’s Frogs. This is a specialist keeper/breeder reference, not a veterinary diagnosis; preserve the stated species scope and compare against veterinary literature where clinical questions arise.';
const WHITES_CAVEAT = 'Species-specific husbandry source from Josh’s Frogs. This is a specialist keeper/breeder reference; preserve the species scope and distinguish husbandry guidance from veterinary diagnosis.';
const PACMAN_CAVEAT = 'Species-specific husbandry source from Josh’s Frogs. This is a specialist keeper/breeder reference; preserve the species scope and distinguish husbandry guidance from veterinary diagnosis.';
const AXOLOTL_CAVEAT = 'Species-specific husbandry source from Caudata Culture. This is specialist amphibian husbandry material; use veterinary sources for diagnosis and clinical decisions.';

export const UNIVERSAL_SPECIES_CARE_OVERRIDES: Record<string, SpeciesCareOverride> = {
  'dendrobates-tinctorius': {
    coverage: 'species',
    sourceIds: ['joshsFrogsDendrobatesTinctorius2026'],
    caveat: DART_FROG_CAVEAT,
    requirements: [
      { id: 'species-vivarium', domain: 'housing', label: 'Species-specific vivarium architecture', guidance: 'Use a naturalistic, planted vivarium with substantial ground cover and leaf litter suited to this primarily ground-dwelling dart frog.', priority: 'essential' },
      { id: 'species-substrate', domain: 'substrate', label: 'Drainage and forest-floor substrate', guidance: 'Use a well-draining planted-vivarium substrate with leaf litter and suitable microfauna support rather than treating this as a bare terrestrial setup.', priority: 'essential' },
      { id: 'species-hydration', domain: 'water', label: 'Safe hydration and moisture management', guidance: 'Maintain stable humid microclimates and clean water access while avoiding stagnant, persistently saturated substrate conditions.', priority: 'essential' },
      { id: 'species-social', domain: 'social', label: 'Mature group management', guidance: 'Group housing can work, but mature females may be aggressive toward one another; monitor social compatibility and be prepared to separate individuals.', priority: 'conditional' },
      { id: 'species-handling', domain: 'monitoring', label: 'Minimal handling', guidance: 'Avoid routine handling; skin contact can expose the frog to harmful residues and creates unnecessary stress.', priority: 'important' },
      { id: 'species-prey', domain: 'feeding', label: 'Small live prey and supplementation', guidance: 'Provide appropriately small live invertebrate prey and use a species-appropriate vitamin/mineral supplementation regime.', priority: 'essential' },
      { id: 'species-heat', domain: 'environment', label: 'Heat-sensitive species', guidance: 'Avoid excessive temperatures; this species is heat-sensitive and the enclosure should remain within the reviewed species range.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 15.6, max: 26.7, unit: '°C', context: 'Josh’s Frogs states to keep D. tinctorius above 60°F and below 80°F, with an ideal range in the low-to-mid 70s°F.' },
    ],
  },
  'pelodryas-caerulea': {
    coverage: 'species',
    sourceIds: ['joshsFrogsLitoriaCaerulea2026'],
    caveat: WHITES_CAVEAT,
    requirements: [
      { id: 'species-arboreal', domain: 'housing', label: 'Large arboreal enclosure', guidance: 'Use a vertical enclosure with adequate space for a large arboreal frog and provide secure climbing structure and plants.', priority: 'essential' },
      { id: 'species-water', domain: 'water', label: 'Constant clean water access', guidance: 'Provide a substantial, easily cleaned water source and keep it clean because the frogs may use it as a latrine.', priority: 'essential' },
      { id: 'species-ventilation', domain: 'environment', label: 'Ventilation', guidance: 'Maintain meaningful ventilation rather than trapping persistently stagnant humid air.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'Moderate humidity with post-misting spikes', guidance: 'Use a moderate average humidity with temporary increases after misting, while retaining ventilation.', priority: 'essential' },
      { id: 'species-social', domain: 'social', label: 'Compatible group housing', guidance: 'This species can be kept in compatible groups when the enclosure provides sufficient space and resources for all individuals.', priority: 'conditional' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 23.9, max: 29.4, unit: '°C', context: 'Josh’s Frogs states 75–85°F for White’s tree frogs; its own collection is commonly kept around 74–76°F with occasional low-80s°F highs.' },
      { label: 'Humidity average', min: 50, max: 50, unit: '%', context: 'Josh’s Frogs describes an average around 50% with spikes after misting, rather than constant high humidity.' },
      { label: 'Humidity post-misting', min: 50, max: 70, unit: '%', context: 'Temporary post-misting spike described by Josh’s Frogs.' },
    ],
  },
  'ceratophrys-cranwelli': {
    coverage: 'species',
    sourceIds: ['joshsFrogsCeratophrysCranwelli2026'],
    caveat: PACMAN_CAVEAT,
    requirements: [
      { id: 'species-terrestrial', domain: 'housing', label: 'Terrestrial burrowing setup', guidance: 'Use a terrestrial setup with suitable substrate and cover for a sit-and-wait frog that spends much of its time associated with the substrate.', priority: 'essential' },
      { id: 'species-water', domain: 'water', label: 'Clean water dish', guidance: 'Provide a large clean water dish appropriate to the frog’s size and keep it hygienic.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'Moderately high humidity with ventilation', guidance: 'Maintain the reviewed humidity range without sealing the enclosure into stagnant, poorly ventilated conditions.', priority: 'essential' },
      { id: 'species-heat', domain: 'environment', label: 'Avoid dangerous overheating', guidance: 'Avoid high temperatures; the source specifically warns that high-80s°F temperatures can become dangerous, especially when water or humidity is inadequate.', priority: 'essential' },
      { id: 'species-prey', domain: 'feeding', label: 'Carnivorous prey-based diet', guidance: 'Use appropriately sized animal prey and build feeding around the species’ carnivorous biology rather than generic frog feeding assumptions.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 23.9, max: 29.4, unit: '°C', context: 'Josh’s Frogs houses Pac-Man frogs around 75–85°F and warns that temperatures in the high 80s°F can quickly become dangerous.' },
      { label: 'Humidity', min: 60, max: 70, unit: '%', context: 'Josh’s Frogs describes 60–70% as the preferred humidity range.' },
    ],
  },
  'dendrobates-auratus': {
    coverage: 'species',
    sourceIds: ['joshsFrogsDendrobatesAuratus2026'],
    caveat: DART_FROG_CAVEAT,
    requirements: [
      { id: 'species-vivarium', domain: 'housing', label: 'Horizontal planted vivarium', guidance: 'Use a naturalistic planted vivarium with substantial leaf litter and ground structure; this species is less climbing-oriented than many other dart frogs.', priority: 'essential' },
      { id: 'species-water-feature', domain: 'water', label: 'Clean water feature where used', guidance: 'A small water feature can be appropriate where designed safely and kept clean; it is not a substitute for controlled environmental moisture.', priority: 'conditional' },
      { id: 'species-temperature', domain: 'environment', label: 'Cool tropical thermal regime', guidance: 'Keep temperatures within the reviewed dart-frog range and avoid overheating; temperatures above the source’s upper tolerance are dangerous.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'High humidity with airflow', guidance: 'Maintain a humid vivarium while preserving ventilation and safe access to water.', priority: 'essential' },
      { id: 'species-feeding', domain: 'feeding', label: 'Small supplemented live prey', guidance: 'Provide appropriately small live invertebrate prey and a verified vitamin/mineral supplementation regime.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 18.3, max: 29.4, unit: '°C', context: 'Josh’s Frogs states 65–85°F tolerance and warns that temperatures above 85°F are dangerous.' },
      { label: 'Humidity', min: 70, max: 100, unit: '%', context: 'Josh’s Frogs states a preferred humidity range of 70–100%, with short lower periods only when water is available.' },
    ],
    health: [
      { id: 'heat-stress', concern: 'Heat and dehydration stress', watchFor: ['reduced activity', 'abnormal posture or behaviour', 'unexpected rapid decline'], riskFactors: ['excessive temperature', 'inadequate water access', 'loss of humidity'], prevention: 'Keep the vivarium within the reviewed thermal range, maintain hydration and provide effective ventilation.', priority: 'urgent-vet' },
      { id: 'skin-environment', concern: 'Skin/environment stress', watchFor: ['abnormal skin', 'reduced feeding or activity'], riskFactors: ['poor moisture management', 'stagnant conditions', 'contaminated water'], prevention: 'Keep the vivarium clean, humid and ventilated and investigate persistent changes promptly.', priority: 'prompt-vet' },
    ],
  },
  'dendrobates-leucomelas': {
    coverage: 'species',
    sourceIds: ['joshsFrogsDendrobatesLeucomelas2026'],
    caveat: DART_FROG_CAVEAT,
    requirements: [
      { id: 'species-vivarium', domain: 'housing', label: 'Naturalistic dart-frog vivarium', guidance: 'Use a planted vivarium with leaf litter, secure retreats and structure appropriate for a small terrestrial dart frog.', priority: 'essential' },
      { id: 'species-temperature', domain: 'environment', label: 'Cool-to-moderate thermal regime', guidance: 'Keep this species within the reviewed tolerance and avoid temperatures above the dangerous upper threshold.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'High humidity with safe hydration', guidance: 'Maintain the reviewed humid environment and ensure safe water access; short dry periods should not become prolonged.', priority: 'essential' },
      { id: 'species-feeding', domain: 'feeding', label: 'Small live prey and supplementation', guidance: 'Provide appropriately small invertebrate prey and verified vitamin/mineral supplementation.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 18.3, max: 29.4, unit: '°C', context: 'Josh’s Frogs states 65–85°F tolerance and warns temperatures over 85°F are dangerous.' },
      { label: 'Humidity', min: 70, max: 100, unit: '%', context: 'Josh’s Frogs states 70–100% preferred humidity and notes that brief drops can be tolerated only with water access.' },
    ],
    health: [
      { id: 'heat-dehydration', concern: 'Heat/dehydration stress', watchFor: ['reduced activity', 'feeding change', 'rapid decline'], riskFactors: ['excess heat', 'poor water access', 'inadequate humidity'], prevention: 'Maintain the reviewed temperature/moisture regime and clean water access.', priority: 'urgent-vet' },
    ],
  },
  'ranitomeya-imitator': {
    coverage: 'species',
    sourceIds: ['joshsFrogsRanitomeyaImitator2026'],
    caveat: DART_FROG_CAVEAT,
    requirements: [
      { id: 'species-vivarium', domain: 'housing', label: 'Vertical thumbnail-dart vivarium', guidance: 'Use an appropriate vertical vivarium with leaf litter and climbing/resting structure for this small arboreal/terrestrial poison frog.', priority: 'essential' },
      { id: 'species-social', domain: 'social', label: 'Careful social grouping', guidance: 'Smaller enclosures are suited to pairs; larger systems may support groups, but social stress should be monitored and animals separated if compatibility breaks down.', priority: 'conditional' },
      { id: 'species-humidity', domain: 'environment', label: 'High humidity with ventilation', guidance: 'Maintain the reviewed humid environment and retain adequate airflow; safe water access remains essential.', priority: 'essential' },
      { id: 'species-feeding', domain: 'feeding', label: 'Very small prey', guidance: 'Use small prey such as suitable fruit flies and springtails, with species-appropriate supplementation.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 18.3, max: 26.7, unit: '°C', context: 'Josh’s Frogs states 65–80°F tolerance and warns temperatures above 85°F are dangerous.' },
      { label: 'Humidity', min: 80, max: 100, unit: '%', context: 'Josh’s Frogs states 80–100% preferred humidity, with brief lower periods possible only with water access.' },
    ],
    health: [
      { id: 'heat-dehydration', concern: 'Heat/dehydration stress', watchFor: ['reduced activity', 'feeding change', 'rapid decline'], riskFactors: ['excess heat', 'low humidity', 'inadequate water access'], prevention: 'Maintain the reviewed environmental range and clean water access.', priority: 'urgent-vet' },
      { id: 'social-stress', concern: 'Social stress', watchFor: ['repeated avoidance', 'persistent decline in activity', 'body-condition loss'], riskFactors: ['overcrowding', 'incompatible groupings'], prevention: 'Use evidence-based group size and provide enough structure and resources for all frogs.', priority: 'prompt-vet' },
    ],
  },
  'agalychnis-callidryas': {
    coverage: 'species',
    sourceIds: ['joshsFrogsAgalychnisCallidryas2026'],
    caveat: WHITES_CAVEAT,
    requirements: [
      { id: 'species-arboreal', domain: 'housing', label: 'Large arboreal enclosure', guidance: 'Use substantial vertical space, branches and foliage for this arboreal tree frog.', priority: 'essential' },
      { id: 'species-water', domain: 'water', label: 'Constant clean water access', guidance: 'Provide a large clean water dish that can be cleaned regularly; this species may use it as a latrine.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'Moderate humidity with strong ventilation', guidance: 'Maintain the reviewed humidity range and strong ventilation because stagnant humid conditions increase skin-disease risk.', priority: 'essential' },
      { id: 'species-feeding', domain: 'feeding', label: 'Appropriately sized live prey', guidance: 'Feed species-appropriate live invertebrates matched to the size and life stage of the frog.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 23.3, max: 29.4, unit: '°C', context: 'Josh’s Frogs states best results in the mid-high 70s°F and warns that mid/high-80s°F can quickly become fatal, especially with poor hydration.' },
      { label: 'Humidity', min: 60, max: 70, unit: '%', context: 'Josh’s Frogs states 60–70% as the preferred humidity range and stresses ventilation.' },
    ],
    health: [
      { id: 'skin-infection-risk', concern: 'Skin/environment disease risk', watchFor: ['abnormal skin', 'persistent lesions', 'reduced activity'], riskFactors: ['stagnant humid air', 'poor hygiene', 'contaminated water'], prevention: 'Maintain ventilation, clean water and appropriate enclosure hygiene.', priority: 'prompt-vet' },
      { id: 'heat-stress', concern: 'Heat and dehydration stress', watchFor: ['rapid decline', 'reduced activity', 'feeding cessation'], riskFactors: ['high temperature', 'inadequate water/humidity'], prevention: 'Prevent overheating and maintain clean water access.', priority: 'urgent-vet' },
    ],
  },
  'ambystoma-mexicanum': {
    coverage: 'species',
    sourceIds: ['caudataAmbystomaMexicanum2026', 'merckAmphibianHusbandry2026'],
    caveat: AXOLOTL_CAVEAT,
    requirements: [
      { id: 'species-aquatic', domain: 'housing', label: 'Permanent aquatic housing', guidance: 'Keep this neotenic salamander in a fully aquatic system; it does not use a normal terrestrial post-metamorphic setup.', priority: 'essential' },
      { id: 'species-water', domain: 'water', label: 'Stable clean aquatic system', guidance: 'Maintain clean water, suitable substrate and enough system volume to buffer water-quality changes; avoid small ingestible gravel.', priority: 'essential' },
      { id: 'species-cover', domain: 'housing', label: 'Multiple refugia and visual barriers', guidance: 'Provide secure hiding places and visual barriers to reduce stress and conflict, particularly where animals share a system.', priority: 'essential' },
      { id: 'species-monitoring', domain: 'monitoring', label: 'Water-quality and health records', guidance: 'Track water conditions, appetite, behaviour and body condition because environmental change can quickly affect an aquatic amphibian.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Preferred housing temperature', min: 18, max: 20, unit: '°C', context: 'Merck lists 18–20°C as the preferred housing range for axolotls in its laboratory-animal reference table; this is a laboratory reference and should not be treated as a complete pet care sheet.' },
    ],
  },
};


const UNIVERSAL_GENUS_CARE_OVERRIDES: Record<string, SpeciesCareOverride> = {
  Hymenochirus: {
    coverage: 'genus',
    sourceIds: ['joshsFrogsHymenochirus2026'],
    caveat: 'Genus-level captive husbandry source from Josh’s Frogs. Species-level differences within Hymenochirus should override this profile where evidenced.',
    requirements: [
      { id: 'genus-aquatic', domain: 'housing', label: 'Fully aquatic enclosure', guidance: 'African dwarf frogs of the Hymenochirus genus are fully aquatic and should be maintained in a suitable aquatic system rather than a terrestrial frog vivarium.', priority: 'essential' },
      { id: 'genus-social', domain: 'social', label: 'Compatible social housing', guidance: 'The genus can be kept socially when the system provides adequate space and stable water quality; do not confuse sociality with permission for unlimited stocking.', priority: 'conditional' },
      { id: 'genus-water-quality', domain: 'water', label: 'Stable aquarium water quality', guidance: 'Use an established aquarium with stable, species-appropriate water quality and avoid substrates or décor that can be ingested or trap the frogs.', priority: 'essential' },
      { id: 'genus-humidity', domain: 'environment', label: 'Aquatic thermal environment', guidance: 'Maintain the reviewed aquatic temperature range and avoid abrupt environmental changes.', priority: 'essential' },
      { id: 'genus-feeding', domain: 'feeding', label: 'Small aquatic animal diet', guidance: 'Use an appropriate carnivorous aquatic diet matched to frog size and life stage; do not substitute generic terrestrial frog feeding advice.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Temperature', min: 23.9, max: 27.8, unit: '°C', context: 'Josh’s Frogs gives 75–82°F as its recommended ADF temperature range for the Hymenochirus genus.' },
      { label: 'pH', min: 6.5, max: 7.5, unit: 'pH', context: 'Josh’s Frogs gives pH 6.5–7.5 for African dwarf frogs.' },
    ],
  },
};

export function getSpeciesCareOverride(species: UniversalSpeciesRecord): SpeciesCareOverride | undefined {
  return UNIVERSAL_SPECIES_CARE_OVERRIDES[species.id] ?? UNIVERSAL_GENUS_CARE_OVERRIDES[species.genus];
}
