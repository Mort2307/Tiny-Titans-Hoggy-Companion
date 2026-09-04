import type { SnakeSpeciesRecord } from './speciesTypes';

const reviewedOn = '2026-09-04';
const taxonomySource = 'reptileDatabase2026';
const base = { kingdom: 'Animalia' as const, phylum: 'Chordata' as const, class: 'Reptilia' as const, order: 'Squamata' as const };

type KnowledgeOverrides = Partial<SnakeSpeciesRecord['knowledge']>;

const taxonomyOnly = (
  id: string,
  scientific: string,
  commonNames: string[],
  aliases: string[],
  family: string,
  genus: string,
  epithet: string,
  summary: string,
  distribution: string,
  habitat: string,
  activityPattern: 'diurnal' | 'nocturnal' | 'crepuscular' | 'cathemeral',
  lifestyle: ('terrestrial' | 'semi-arboreal' | 'arboreal' | 'fossorial' | 'semi-fossorial' | 'semi-aquatic')[],
  riskClass: 'companion' | 'specialist' | 'venomous' | 'high-risk',
  feedingNotes: string,
  safetyNotes: string,
  synonyms: string[] = [],
  knowledgeOverrides: KnowledgeOverrides = {},
): SnakeSpeciesRecord => ({
  ...base,
  id,
  acceptedScientificName: scientific,
  commonNames,
  searchAliases: aliases,
  family,
  genus,
  speciesEpithet: epithet,
  synonyms,
  taxonStatus: 'accepted',
  taxonSource: taxonomySource,
  knowledge: {
    summary,
    distribution,
    habitat,
    activityPattern,
    lifestyle,
    riskClass,
    feeding: { evidenceLevel: 'moderate', dietaryGuild: 'carnivore', preyCategories: ['appropriately sized vertebrate whole prey'], notes: feedingNotes },
    breeding: { evidenceLevel: 'limited', seasonalCycling: 'Species-specific seasonal cues should be established from specialist literature before breeding conditioning.', notes: 'No generic breeding protocol is supplied where exact evidence is insufficient.' },
    safety: { medicallySignificantVenom: riskClass === 'venomous', rearFangedOrVenomDelivery: false, handlingNotes: safetyNotes },
    sourceIds: [taxonomySource],
    reviewedOn,
    ...knowledgeOverrides,
    feeding: knowledgeOverrides.feeding ?? { evidenceLevel: 'moderate', dietaryGuild: 'carnivore', preyCategories: ['appropriately sized vertebrate whole prey'], notes: feedingNotes },
    safety: knowledgeOverrides.safety ?? { medicallySignificantVenom: riskClass === 'venomous', rearFangedOrVenomDelivery: false, handlingNotes: safetyNotes },
    sourceIds: knowledgeOverrides.sourceIds ?? [taxonomySource],
    reviewedOn: knowledgeOverrides.reviewedOn ?? reviewedOn,
  }
});

export const SPECIES_EXPANSION_BATCH_4: SnakeSpeciesRecord[] = [
  taxonomyOnly('python-sebae','Python sebae',['African Rock Python'],['african rock python','rock python','python sebae'],'Pythonidae','Python','sebae','Very large African python. The current taxon is retained separately from Southern African Python (Python natalensis).','Sub-Saharan Africa, broadly from West/Central Africa into eastern regions.','Savannah, woodland, river margins, wetlands and other habitats associated with substantial prey and water.','cathemeral',['terrestrial','semi-aquatic'],'high-risk','Large vertebrate whole prey; feeding must remain body-condition and safety led.','Very large powerful constrictor; specialist enclosure engineering, redundant security and planned handling support are required.',['Python sebae','Python natalensis sebae']),
  taxonomyOnly('python-natalensis','Python natalensis',['Southern African Python'],['southern african python','lesser african python','python natalensis'],'Pythonidae','Python','natalensis','Current accepted Southern African rock-python species, formerly widely treated as a subspecies of Python sebae.','Southern and eastern Africa, including South Africa, Zimbabwe, Mozambique, Zambia and adjoining regions.','Savannah, woodland, rocky areas, river corridors and wetlands.','cathemeral',['terrestrial','semi-aquatic'],'high-risk','Large vertebrate whole prey; avoid overconditioning and power-feeding.','Large powerful constrictor; specialist enclosure security and assisted handling planning are required.',['Python sebae natalensis']),
  taxonomyOnly('python-molurus','Python molurus',['Indian Rock Python'],['indian rock python','python molurus','indian python'],'Pythonidae','Python','molurus','Large South Asian python. Current taxonomy recognises Python molurus separately from the Burmese Python (Python bivittatus).','Indian subcontinent, including India, Pakistan, Nepal and Bangladesh; current range treatment may vary by taxonomic source.','Grassland, scrub, woodland, wetland, agricultural margins and river-associated habitat.','nocturnal',['terrestrial','semi-aquatic'],'high-risk','Large vertebrate whole prey; feeding should be conservative and body-condition led.','Large powerful constrictor; specialist enclosure design, secure access and supported handling are essential.',['Python molurus molurus']),
  taxonomyOnly('simalia-boeleni','Simalia boeleni',["Boelen's Python"],['boelens python',"boelen's python",'simalia boeleni'],'Pythonidae','Simalia','boeleni','Large dark New Guinean python associated with montane forest. Captive husbandry evidence is much narrower than for common pet pythons.','New Guinea highland regions.','Montane rainforest and forest habitats at elevation.','nocturnal',['terrestrial','semi-arboreal'],'specialist','Carnivorous python taking appropriately sized vertebrate prey; body condition should drive feeding.','Non-venomous but large specialist python; secure arboreal/terrestrial enclosure design is required.',['Morelia boeleni']),
  taxonomyOnly('bothrochilus-boa','Bothrochilus boa',['Bismarck Ringed Python'],['bismarck ringed python','ringed python','bothrochilus boa'],'Pythonidae','Bothrochilus','boa','Distinctive Bismarck Archipelago python now placed in Bothrochilus. It is a specialist captive species with species-specific husbandry evidence available.','Bismarck Archipelago, especially New Britain and nearby islands.','Humid tropical forest, sheltered ground, low vegetation and humid debris; primarily terrestrial to semi-fossorial in captivity.','nocturnal',['terrestrial','semi-fossorial'],'specialist','Carnivorous python. Appropriately sized rats or mice are suitable captive prey; prey should be matched to the snake and feeding should remain body-condition led.','Non-venomous specialist python. Juveniles may be nervous or nippy and established animals can show a strong feeding response, so handling should be deliberate and feeding safety maintained.',['Liasis boa'],{
    husbandry: {
      evidenceLevel: 'moderate',
      temperature: {
        coolSide: { min: 24, max: 27, unit: '°C', context: 'daytime cool-side gradient' },
        warmSide: { min: 29, max: 32, unit: '°C', context: 'daytime warm-side gradient' },
        notes: 'Published species-specific sources place the overall captive gradient around 75–88°F, with a detailed care sheet describing approximately 75–82°F on the cool side and 85–90°F on the warm side. Use a measured gradient rather than a single enclosure-wide target.'
      },
      humidity: {
        target: { min: 60, max: 80, unit: '% RH', context: 'general enclosure humidity' },
        notes: 'Maintain elevated humidity while keeping the enclosure ventilated and the substrate from becoming waterlogged. A humid retreat can provide additional shedding support.'
      },
      enclosure: {
        habitatType: ['terrestrial', 'semi-fossorial'],
        substrate: ['fine aspen shavings where appropriate', 'cypress mulch', 'sphagnum/fir mixture', 'reptile-safe cage liner'],
        hides: 'Provide secure hides/retreats on the thermal gradient. A humid retreat is useful when ambient humidity is difficult to maintain.',
        climbing: true,
        water: 'Provide a large, sturdy water dish with clean water available at all times; maintain and sanitise it regularly.',
        ventilation: 'Use a sealed, escape-proof enclosure that retains humidity while still providing reliable ventilation. Glass can be used only when humidity retention is adequate.',
        enrichment: ['appropriate hides', 'artificial foliage', 'driftwood or logs', 'secure furnishings that support shelter and low climbing'],
        notes: 'Floor space is more important than excessive height, although individuals may climb. Adult housing guidance in the supporting sources ranges from approximately 4–6 ft by 2 ft or larger, scaled to the individual snake.'
      },
      cohabitation: {
        recommendation: 'generally-single',
        rationale: 'Keep individual animals separately so feeding, weight, health and behaviour can be monitored without competition or feeding-related risk.'
      }
    },
    feeding: {
      evidenceLevel: 'moderate',
      dietaryGuild: 'carnivore',
      preyCategories: ['appropriately sized rats', 'appropriately sized mice', 'other suitable vertebrate whole prey where specialist guidance supports it'],
      notes: 'Captive sources recommend appropriately sized whole prey, with prey width broadly matched to the snake. Live prey presents avoidable injury risk; monitor body condition and avoid overfeeding.'
    },
    safety: {
      medicallySignificantVenom: false,
      rearFangedOrVenomDelivery: false,
      handlingNotes: 'Juveniles can be nervous or nippy, and established ringed pythons can have a strong feeding response. Handle gently and deliberately, avoid handling immediately around feeding, and use secure enclosure access.'
    },
    sourceIds: ['reptileDatabase2026', 'bismarckRingedPythonCare2023', 'bismarckRingedPythonRoscoe2023'],
  }),
  taxonomyOnly('leiopython-albertisii','Leiopython albertisii',['Northern White-lipped Python'],['white lipped python','northern white lipped python','leiopython albertisii'],'Pythonidae','Leiopython','albertisii','New Guinea white-lipped python with a strong defensive reputation in captivity. Current taxonomy keeps it separate from Leiopython fredparkeri.','New Guinea and nearby islands.','Humid lowland to montane forest, riparian and heavily vegetated environments.','nocturnal',['terrestrial','semi-arboreal'],'specialist','Carnivorous python taking appropriately sized whole prey; avoid overfeeding.','Non-venomous but potentially defensive specialist python; use secure enclosure access and experienced handling.',['Liasis albertisii']),
  taxonomyOnly('liasis-mackloti','Liasis mackloti',["Macklot's Python"],['macklots python',"macklot's python",'freckled python','liasis mackloti'],'Pythonidae','Liasis','mackloti','Australasian python associated with a range of terrestrial and wetland habitats. Locality matters and should remain visible in animal records.','Indonesia, Timor-Leste and northern Australia in current range treatment.','Seasonally wet woodland, grassland, scrub, wetland edges and rocky habitat.','nocturnal',['terrestrial','semi-aquatic'],'specialist','Carnivorous python taking appropriately sized vertebrate whole prey.','Non-venomous python; adult size and feeding response warrant deliberate keeper procedures.',['Liasis mackloti mackloti']),
  taxonomyOnly('liasis-fuscus','Liasis fuscus',['Water Python'],['fuscus water python','water python','liasis fuscus'],'Pythonidae','Liasis','fuscus','Australian water-associated python. It is kept separate from the broader Macklot’s Python complex in the current taxonomy.','Northern Australia.','Rivers, billabongs, wetlands, floodplains and adjacent woodland/savannah.','nocturnal',['terrestrial','semi-aquatic'],'specialist','Carnivorous python with strong association with vertebrate prey; body condition should determine feeding frequency.','Non-venomous aquatic-associated python; secure enclosure and water-feature design are required.',['Liasis mackloti fuscus']),
  taxonomyOnly('aspidites-melanocephalus','Aspidites melanocephalus',['Black-headed Python'],['black headed python','blackhead python','aspidites melanocephalus'],'Pythonidae','Aspidites','melanocephalus','Australian terrestrial python with a distinctive black head and strong feeding response. It should not inherit Woma parameters without species-specific evidence.','Northern and central Australia.','Arid and semi-arid woodland, scrub, grassland and rocky habitat.','nocturnal',['terrestrial','fossorial'],'specialist','Carnivorous python taking appropriately sized reptiles, birds and mammals; whole-prey variety may be appropriate.','Non-venomous python; secure housing and deliberate feeding/handling procedures are appropriate.',['Aspidites melanocephala']),
  taxonomyOnly('apodora-papuana','Apodora papuana',['Papuan Olive Python'],['papuan olive python','olive python','apodora papuana'],'Pythonidae','Apodora','papuana','Large Papuan olive python, currently recognised as a distinct genus and species. Husbandry evidence should be locality-aware.','New Guinea and nearby islands.','Tropical lowland forest, woodland, river margins and other warm humid habitats.','nocturnal',['terrestrial','semi-arboreal'],'specialist','Large vertebrate whole prey; feeding should remain conservative and body-condition led.','Large non-venomous python; adult enclosure scale and supported handling are essential.',['Liasis papuanus'])
];
