import type { UniversalSpeciesRecord } from './universalSpeciesTypes';
import type { UniversalCareRequirement, UniversalHealthWatch } from './universalSpeciesCareTypes';

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
  },
  ,
  'pantherophis-guttatus': {
    coverage: 'species',
    sourceIds: ['reptifilesCornSnake2024'],
    caveat: 'Species-specific keeper reference from ReptiFiles. Preserve its evidence scope and practical-keeper status; do not generalise the numeric ranges to unrelated Pantherophis species.',
    requirements: [
      { id: 'species-thermal', domain: 'environment', label: 'Measured thermal gradient', guidance: 'Provide a basking zone and cooler zone so the snake can move between temperatures. The source specifies a basking temperature around 32°C and a cool zone around 24–27°C.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'Species-specific humidity', guidance: 'Maintain the source’s reported average humidity range of 65–75%, with normal day/night fluctuation and a humid retreat available.', priority: 'essential' },
      { id: 'species-lighting', domain: 'lighting', label: 'Distinct day/night cycle with optional UVB evidence', guidance: 'Provide a consistent day/night cycle. ReptiFiles recommends UVB for corn snakes, with the source specifying a maximum basking UVI of 2–3; shade and distance must be preserved.', priority: 'important' },
      { id: 'species-enclosure', domain: 'housing', label: 'Secure semi-arboreal enclosure', guidance: 'Use a secure enclosure with climbing structure, cover, hides and sufficient space for this active semi-arboreal species.', priority: 'essential' },
      { id: 'species-water', domain: 'water', label: 'Clean water and humidity options', guidance: 'Provide clean drinking water and a humid retreat while maintaining ventilation.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Basking', min: 32, max: 32, unit: '°C', context: 'ReptiFiles species-specific basking parameter.' },
      { label: 'Cool zone', min: 24, max: 27, unit: '°C', context: 'ReptiFiles species-specific cool-zone parameter.' },
      { label: 'Humidity', min: 65, max: 75, unit: '% RH', context: 'ReptiFiles species-specific average humidity range.' },
      { label: 'Basking UV Index', min: 2, max: 3, unit: 'UVI', context: 'ReptiFiles maximum basking UVI recommendation; exact exposure depends on distance and obstruction.' },
    ],
  },
  'eublepharis-macularius': {
    coverage: 'species',
    sourceIds: ['reptifilesLeopardGecko2025'],
    caveat: 'Species-specific keeper reference from ReptiFiles. UVB values distinguish normal-pigmented from hypopigmented/albino animals and therefore should not be applied without considering phenotype.',
    requirements: [
      { id: 'species-thermal', domain: 'environment', label: 'Species-specific thermal gradient', guidance: 'Provide a basking surface, warm hide and cool end. ReptiFiles specifies 34–36°C basking surface, 32–33°C warm hide and 21–25°C cool end.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'Dry ambient environment with humid retreat', guidance: 'Maintain a relatively dry general environment while providing a distinct humid hide for shedding; do not simply raise the entire enclosure humidity.', priority: 'essential' },
      { id: 'species-uvb', domain: 'lighting', label: 'Low-level UVB with phenotype awareness', guidance: 'ReptiFiles specifies a low basking UVI for leopard geckos and a lower ceiling for less-pigmented/albino animals. Measure exposure rather than relying on bulb percentage alone.', priority: 'important' },
      { id: 'species-hides', domain: 'housing', label: 'Multiple secure hides', guidance: 'Provide at least a warm hide and cool hide, with a humid hide available for shedding.', priority: 'essential' },
      { id: 'species-substrate', domain: 'substrate', label: 'Species-appropriate arid substrate', guidance: 'Use a safe dry substrate suited to the animal and enclosure, while keeping the humid hide separate and controlled.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Basking surface', min: 34, max: 36, unit: '°C', context: 'ReptiFiles species-specific basking surface range.' },
      { label: 'Warm hide', min: 32, max: 33, unit: '°C', context: 'ReptiFiles species-specific warm-hide range.' },
      { label: 'Cool end', min: 21, max: 25, unit: '°C', context: 'ReptiFiles species-specific cool-end range.' },
      { label: 'Ambient humidity', min: 30, max: 40, unit: '% RH', context: 'ReptiFiles daytime ambient humidity range.' },
      { label: 'Humid hide', min: 70, max: 80, unit: '% RH', context: 'ReptiFiles humid-hide range for shedding.' },
      { label: 'Normal-pigment basking UVI', min: 0.5, max: 1.5, unit: 'UVI', context: 'ReptiFiles recommendation; lower range applies to hypopigmented/albino animals.' },
      { label: 'Hypopigmented basking UVI', min: 0.5, max: 0.7, unit: 'UVI', context: 'ReptiFiles recommendation for albino and other less-pigmented morphs.' },
    ],
  },
  'pogona-vitticeps': {
    coverage: 'species',
    sourceIds: ['reptifilesBeardedDragon2026'],
    caveat: 'Species-specific keeper reference from ReptiFiles, updated January 2026. Numeric parameters are source-specific husbandry targets and should remain tied to measurement method and equipment configuration.',
    requirements: [
      { id: 'species-basking', domain: 'environment', label: 'Strong basking zone and gradient', guidance: 'Provide strong overhead basking access and a meaningful cooler area so the dragon can thermoregulate by moving through the enclosure.', priority: 'essential' },
      { id: 'species-uvb', domain: 'lighting', label: 'Reliable UVB and bright white light', guidance: 'Provide strong reliable UVB plus bright white visible light as part of the day environment; measurement and mounting distance matter.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'Controlled ambient humidity', guidance: 'Use a generally moderate ambient humidity while preserving natural local variation and avoiding persistently wet substrate.', priority: 'essential' },
      { id: 'species-substrate', domain: 'substrate', label: 'Species-appropriate terrestrial substrate', guidance: 'Use a stable substrate that supports digging and normal terrestrial activity without creating avoidable ingestion or hygiene hazards.', priority: 'essential' },
      { id: 'species-enrichment', domain: 'enrichment', label: 'Climbing, basking and digging structure', guidance: 'Provide sturdy climbing/basking structures and opportunities for natural exploration and digging.', priority: 'important' },
    ],
    numericRanges: [
      { label: 'Basking surface', min: 42, max: 45, unit: '°C', context: 'ReptiFiles species-specific basking surface range.' },
      { label: 'Cool-side surface', min: 25, max: 29, unit: '°C', context: 'ReptiFiles species-specific cool-side surface range.' },
      { label: 'Air gradient', min: 22, max: 37, unit: '°C', context: 'ReptiFiles reported enclosure air-gradient range; surface measurements remain separately specified.' },
      { label: 'Night', min: 12, max: 24, unit: '°C', context: 'ReptiFiles reported nighttime range.' },
      { label: 'Ambient humidity', min: 30, max: 60, unit: '% RH', context: 'ReptiFiles reported average ambient humidity range.' },
      { label: 'Basking UVI', min: 4, max: 4.5, unit: 'UVI', context: 'ReptiFiles species-specific basking UVI range.' },
    ],
  },
  'python-regius': {
    coverage: 'species',
    sourceIds: ['reptifilesBallPython2026'],
    caveat: 'Species-specific keeper reference from ReptiFiles. Preserve the source’s distinction between warm-hide, cool-hide and nighttime temperatures rather than collapsing them into one enclosure target.',
    requirements: [
      { id: 'species-warm-hide', domain: 'environment', label: 'Warm hide thermal target', guidance: 'Provide a stable warm hide in the source’s 30–32°C range and allow movement to cooler areas.', priority: 'essential' },
      { id: 'species-cool-hide', domain: 'environment', label: 'Cool hide and gradient', guidance: 'Provide a cool hide around 22–27°C so the snake can choose its thermal zone.', priority: 'essential' },
      { id: 'species-humidity', domain: 'environment', label: 'Species-specific humidity', guidance: 'Use a humid environment with higher nighttime humidity and a humid hide where needed for hydration and shedding, while retaining ventilation.', priority: 'essential' },
      { id: 'species-light', domain: 'lighting', label: 'Predictable day/night cycle and low-level UVB', guidance: 'Provide a clear day/night cycle; ReptiFiles recommends low-level UVB as an illumination source for ball pythons.', priority: 'important' },
      { id: 'species-burrow', domain: 'housing', label: 'Burrow-like retreats', guidance: 'Provide secure, enclosed retreats that allow the snake to feel protected and select warmer/cooler conditions.', priority: 'essential' },
    ],
    numericRanges: [
      { label: 'Warm hide', min: 30, max: 32, unit: '°C', context: 'ReptiFiles species-specific warm-hide range.' },
      { label: 'Cool hide', min: 22, max: 27, unit: '°C', context: 'ReptiFiles species-specific cool-hide range.' },
      { label: 'Night', min: 21, max: 26, unit: '°C', context: 'ReptiFiles species-specific nighttime range.' },
      { label: 'Humidity day', min: 60, max: 80, unit: '% RH', context: 'ReptiFiles climate-derived daytime humidity range.' },
      { label: 'Humidity night', min: 80, max: 100, unit: '% RH', context: 'ReptiFiles climate-derived nighttime humidity range.' },
    ],
    health: [
      { id: 'environment-feeding', concern: 'Environmental disruption and feeding change', watchFor: ['persistent appetite change', 'reduced normal activity'], riskFactors: ['inappropriate temperature or humidity', 'inadequate refuge'], prevention: 'Maintain a stable thermal/humidity gradient and provide secure retreats; investigate persistent feeding changes rather than guessing at a cause.', priority: 'prompt-vet' },
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
