import type { SnakeSpeciesRecord, SourceCitation } from './speciesTypes';

const reviewedOn = '2026-09-04';
const taxonomySource = 'reptileDatabase2026';
const base = { kingdom: 'Animalia' as const, phylum: 'Chordata' as const, class: 'Reptilia' as const, order: 'Squamata' as const };

export const SPECIES_EXPANSION_BATCH_3_SOURCES: Record<string, SourceCitation> = {
  reptifilesBurmesePython2026: { id: 'reptifilesBurmesePython2026', title: 'Burmese Python Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/burmese-python-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Current keeper-facing species guide for Python bivittatus; adult size makes specialist enclosure and handling planning essential.' },
  reptifilesReticulatedPython2026: { id: 'reptifilesReticulatedPython2026', title: 'Reticulated Python Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/reticulated-python-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Current keeper-facing species guide for Malayopython reticulatus; size and locality variation are explicitly retained.' },
  reptifilesBoaConstrictor2023: { id: 'reptifilesBoaConstrictor2023', title: 'Boa Constrictor Care Guide', publisher: 'ReptiFiles', url: 'https://reptifiles.com/boa-constrictor-care/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Species/genus-level care reference; exact locality or taxon must be retained in individual records because Boa taxonomy is more resolved than older care sheets.' },
  reptifilesBloodPython2017: { id: 'reptifilesBloodPython2017', title: 'Blood and Short-tailed Python Husbandry Reference', publisher: 'ReptiFiles', url: 'https://reptifiles.com/truth-blood-python-temperament/', accessedOn: reviewedOn, evidenceLevel: 'limited', notes: 'Secondary keeper reference used for species separation within the former Python curtus complex; not used to create rigid species-specific environmental numbers.' },
  reptifilesBlackRatsnake2026: { id: 'reptifilesBlackRatsnake2026', title: 'Black Ratsnake Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/black-ratsnake-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Genus-adjacent husbandry context. Eastern Rat Snake values are not copied blindly; this record remains taxonomy-forward until stronger exact-species husbandry is encoded.' }
};

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
  sourceIds: string[],
  synonyms: string[] = []
): SnakeSpeciesRecord => ({
  ...base, id, acceptedScientificName: scientific, commonNames, searchAliases: aliases, family, genus, speciesEpithet: epithet, synonyms, taxonStatus: 'accepted', taxonSource: taxonomySource,
  knowledge: {
    summary, distribution, habitat, activityPattern, lifestyle, riskClass,
    feeding: { evidenceLevel: 'moderate', dietaryGuild: 'carnivore', preyCategories: ['appropriately sized vertebrate whole prey'], notes: feedingNotes },
    breeding: { evidenceLevel: 'limited', seasonalCycling: 'Species-specific seasonal cues should be established from specialist literature before breeding conditioning.', notes: 'Breeding guidance is intentionally not generalised from unrelated species.' },
    safety: { medicallySignificantVenom: riskClass === 'venomous', rearFangedOrVenomDelivery: false, handlingNotes: safetyNotes },
    sourceIds, reviewedOn
  }
});

const cared = (
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
  riskClass: 'companion' | 'specialist' | 'high-risk',
  temperature: { warmSide?: [number, number]; coolSide?: [number, number]; night?: [number, number]; basking?: [number, number] },
  humidity: [number, number],
  substrates: string[],
  hides: string,
  water: string,
  ventilation: string,
  lighting: string,
  climbing: boolean,
  enrichment: string[],
  prey: string[],
  feedingNotes: string,
  safetyNotes: string,
  sourceIds: string[],
  notes: string
): SnakeSpeciesRecord => ({
  ...base, id, acceptedScientificName: scientific, commonNames, searchAliases: aliases, family, genus, speciesEpithet: epithet, taxonStatus: 'accepted', taxonSource: taxonomySource,
  knowledge: {
    summary, distribution, habitat, activityPattern, lifestyle, riskClass,
    husbandry: {
      evidenceLevel: 'moderate',
      temperature: Object.fromEntries(Object.entries({
        basking: temperature.basking ? { min: temperature.basking[0], max: temperature.basking[1], unit: '°C', context: 'basking surface' } : undefined,
        warmSide: temperature.warmSide ? { min: temperature.warmSide[0], max: temperature.warmSide[1], unit: '°C', context: 'warm area' } : undefined,
        coolSide: temperature.coolSide ? { min: temperature.coolSide[0], max: temperature.coolSide[1], unit: '°C', context: 'cool area' } : undefined,
        night: temperature.night ? { min: temperature.night[0], max: temperature.night[1], unit: '°C', context: 'night range' } : undefined
      }).filter(([, value]) => value !== undefined)),
      humidity: { target: { min: humidity[0], max: humidity[1], unit: '%', context: 'species baseline' }, notes },
      enclosure: { habitatType: lifestyle, substrate: substrates, hides, climbing, water, ventilation, lighting, enrichment },
      cohabitation: { recommendation: 'generally-single', rationale: 'Single housing is the conservative pet default outside managed breeding.' }
    },
    feeding: { evidenceLevel: 'moderate', dietaryGuild: 'carnivore', preyCategories: prey, notes: feedingNotes },
    breeding: { evidenceLevel: 'moderate', seasonalCycling: 'Seasonal environmental cues may be relevant in established breeding programmes.', notes: 'Condition adults first and use locality/taxon-specific breeding references.' },
    safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false, handlingNotes: safetyNotes },
    sourceIds, reviewedOn
  }
});

export const SPECIES_EXPANSION_BATCH_3: SnakeSpeciesRecord[] = [
  cared('python-bivittatus','Python bivittatus',['Burmese Python'],['burmese python','burmese rock python','python bivittatus'],'Pythonidae','Python','bivittatus','Giant Southeast Asian python requiring advanced husbandry, very secure housing and long-term planning for adult size.','South and Southeast Asia.','Tropical and subtropical grassland, woodland, marsh and forest-edge habitats; often associated with water.','cathemeral',['terrestrial','semi-aquatic'],'high-risk',{basking:[31,33],warmSide:[27,30],coolSide:[24,27],night:[21,24]},[60,80],['coconut husk','cypress mulch','large moisture-buffering naturalistic substrate'],'Very large, secure warm and cool retreats sized for the adult.','Large stable bowl or purpose-built water feature; adult facilities must support safe cleaning.','Strong mechanical ventilation; humidity must not be maintained through stagnant air.','Bright predictable photoperiod with shade; UVB may be offered where safe and professionally configured.',true,['strong climbing structures','large hides','visual cover','water access'],'large vertebrate whole prey','Adult feeding must be proportionate to body condition and facility safety; avoid power-feeding.','Very large constrictor. Adult handling, enclosure access and emergency procedures require specialist planning; no casual handling protocol is stored here.',['reptileDatabase2026','reptifilesBurmesePython2026'],'Advanced species: adult scale, strength and enclosure engineering are core husbandry considerations.'),
  cared('malayopython-reticulatus','Malayopython reticulatus',['Reticulated Python'],['reticulated python','retic','malayopython reticulatus'],'Pythonidae','Malayopython','reticulatus','Giant Southeast Asian semi-arboreal python with major size variation between localities and morphs; enclosure scale must follow projected adult length.','South and Southeast Asia.','Tropical forests, wetlands, plantations, rivers and other habitats with both terrestrial and arboreal structure.','cathemeral',['terrestrial','semi-arboreal','semi-aquatic'],'high-risk',{basking:[31,33],warmSide:[27,30],coolSide:[24,27],night:[21,24]},[60,80],['coconut husk','moisture-buffering tropical substrate'],'Secure warm/cool retreats large enough for the animal and robust enough for adult strength.','Large soaking/swimming basin with safe drainage and cleaning access.','Strong ventilation combined with controlled humidity; avoid permanently saturated stagnant air.','12-hour predictable daylight cycle with abundant shade; UVB may be offered in a professionally configured setup.',true,['large branches','elevated perches','large hides','water feature','dense cover'],'large vertebrate whole prey','Use projected adult size and body condition when determining meal size and frequency.','Giant constrictor. Adult enclosure access and handling are specialist operations; do not improvise solo handling.',['reptileDatabase2026','reptifilesReticulatedPython2026'],'Current keeper guidance explicitly recognises standard, dwarf and super-dwarf size groups; Tiny Titans stores the species profile without treating those locality labels as separate species.'),
  cared('boa-constrictor','Boa constrictor',['Boa Constrictor','True Red-tailed Boa'],['boa constrictor','true red tailed boa','boa constrictor constrictor','boa constrictor species'],'Boidae','Boa','constrictor','Large South American boa species. Locality and recognised form matter substantially; a generic “red-tail boa” label should not erase provenance.','South America east of the Andes, including Amazonian and adjacent regions.','Tropical and subtropical forest, woodland and forest-edge habitats with both ground and climbing opportunities.','crepuscular',['terrestrial','semi-arboreal'],'specialist',{basking:[30,32],warmSide:[27,30],coolSide:[24,26],night:[21,24]},[55,75],['deep naturalistic substrate','coconut/soil moisture-buffering mix'],'Large secure hides on both ends of the gradient.','Large stable clean water bowl; soaking access should be safely scaled to the individual.','Strong cross-ventilation sized to enclosure volume.','Predictable photoperiod with shaded retreats; UVB can be provided with a safe gradient.',true,['sturdy branches','deep substrate','leaf litter','large hides','visual cover'],'appropriately sized vertebrate whole prey','Meal size and frequency should follow body condition, growth trajectory and locality-informed adult size rather than power-feeding.','Large constrictor. Adults should have planned, supported handling and a secure enclosure.',['reptileDatabase2026','reptifilesBoaConstrictor2023'],'The current genus treatment recognises Boa constrictor separately from B. imperator and B. sigma, so Tiny Titans keeps them as separate taxa.'),
  taxonomyOnly('pantherophis-alleghaniensis','Pantherophis alleghaniensis',['Eastern Rat Snake'],['eastern rat snake','pantherophis alleghaniensis','black rat snake eastern'],'Colubridae','Pantherophis','alleghaniensis','Current taxonomy recognises Pantherophis alleghaniensis as a separate eastern/central lineage; care guidance varies with the recognised form and locality, so Tiny Titans does not invent exact thermal numbers yet.','Eastern and central United States.','Forest, woodland, farmland, rocky areas and habitats offering substantial cover; partly arboreal.','diurnal',['terrestrial','semi-arboreal'],'companion','Whole-prey carnivore; prey selection and feeding schedules should follow the individual and recognised form.','Non-venomous colubrid; calm, secure handling and escape-proof housing are appropriate.',['reptileDatabase2026','reptifilesBlackRatsnake2026'],['Pantherophis obsoletus alleghaniensis','Pantherophis spiloides']),
  taxonomyOnly('pituophis-catenifer','Pituophis catenifer',['Gopher Snake','Bullsnake','Pine Snake Complex'],['gopher snake','bullsnake','pituophis catenifer','pine snake'],'Colubridae','Pituophis','catenifer','Active North American constrictor complex commonly represented in the pet trade by locality/form names such as gopher snake and bullsnake. Exact care requirements should remain locality-aware.','Western and central North America.','Prairie, grassland, scrub, desert edge, woodland and agricultural habitats.','diurnal',['terrestrial','fossorial'],'companion','Carnivorous constrictor feeding predominantly on vertebrate prey; body condition should drive meal size and frequency.','Non-venomous colubrid; strong defensive display can occur, especially in younger animals.',['reptileDatabase2026']),
  taxonomyOnly('elaphe-climacophora','Elaphe climacophora',['Japanese Rat Snake','Japanese Forest Rat Snake'],['japanese rat snake','japanese forest rat snake','elaphe climacophora'],'Colubridae','Elaphe','climacophora','Asian rat snake from Japan. Captive husbandry should account for its temperate seasonal ecology rather than being copied from North American ratsnakes.','Japan.','Temperate forest, woodland, agricultural edges and areas with climbing structure.','diurnal',['terrestrial','semi-arboreal'],'companion','Carnivorous snake taking appropriately sized vertebrate prey; schedules should follow body condition and season.','Non-venomous colubrid; provide secure climbing structure and strong escape prevention.',['reptileDatabase2026']),
  taxonomyOnly('python-brongersmai','Python brongersmai',['Blood Python','Malaysian Blood Python'],['blood python','malaysian blood python','python brongersmai'],'Pythonidae','Python','brongersmai','Heavy-bodied Southeast Asian python. It is kept separately from the other short-tailed python species in the current taxonomy.','Thailand, Peninsular Malaysia, Sumatra and adjacent regions.','Humid lowland forests, swamp margins and wet tropical habitats.','nocturnal',['terrestrial','semi-aquatic'],'specialist','Carnivorous heavy-bodied python taking appropriately sized vertebrate prey; feeding must be conservative to body condition.','Non-venomous but powerful heavy-bodied python; secure enclosure access and deliberate handling are essential.',['reptileDatabase2026','reptifilesBloodPython2017'],['Python curtus brongersmai']),
  taxonomyOnly('python-breitensteini','Python breitensteini',['Borneo Short-tailed Python','Bornean Blood Python'],['borneo short tailed python','bornean blood python','python breitensteini'],'Pythonidae','Python','breitensteini','Bornean short-tailed python recognised as a separate species from Python brongersmai and P. curtus. Species-specific captive evidence should be kept separate rather than pooled.','Borneo.','Humid tropical forest, lowland habitats and wet ground environments.','nocturnal',['terrestrial','semi-aquatic'],'specialist','Carnivorous heavy-bodied python taking appropriately sized vertebrate prey.','Non-venomous heavy-bodied python; specialist enclosure security and handling planning are required.',['reptileDatabase2026','reptifilesBloodPython2017']),
  taxonomyOnly('python-curtus','Python curtus',['Sumatran Short-tailed Python'],['sumatran short tailed python','sumatran short-tail','python curtus'],'Pythonidae','Python','curtus','Short-tailed python from Sumatra and nearby regions. Current taxonomy separates it from the Borneo and Malaysian blood-python species.','Sumatra and adjacent Indonesian regions.','Humid forest, swamp and wet lowland habitats.','nocturnal',['terrestrial','semi-aquatic'],'specialist','Carnivorous heavy-bodied python taking appropriately sized vertebrate prey; avoid overconditioning.','Non-venomous heavy-bodied python; secure housing and deliberate handling are essential.',['reptileDatabase2026','reptifilesBloodPython2017']),
  taxonomyOnly('simalia-amethistina','Simalia amethistina',['Amethystine Python','Scrub Python'],['amethystine python','scrub python','simalia amethistina'],'Pythonidae','Simalia','amethistina','Very large Australasian python capable of significant adult size. Exact husbandry should be tied to the locality and projected adult size rather than a one-size-fits-all target.','New Guinea, northern Australia and nearby islands depending on current taxonomic delimitation.','Tropical forest, woodland, riverine habitat and arboreal environments.','cathemeral',['terrestrial','semi-arboreal'],'high-risk','Large vertebrate whole prey; adult meal planning must be conservative and safety-led.','Large powerful non-venomous constrictor; specialist keeper and enclosure planning is required.',['reptileDatabase2026'])
];
