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
  'litoria-caerulea': {
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

export function getSpeciesCareOverride(species: UniversalSpeciesRecord): SpeciesCareOverride | undefined {
  return UNIVERSAL_SPECIES_CARE_OVERRIDES[species.id];
}
