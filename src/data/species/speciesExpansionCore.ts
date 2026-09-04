import type { SnakeSpeciesRecord, SourceCitation } from './speciesTypes';

const reviewedOn = '2026-09-04';
const taxonomySource = 'reptileDatabase2026';
const base = { kingdom: 'Animalia' as const, phylum: 'Chordata' as const, class: 'Reptilia' as const, order: 'Squamata' as const };

export const SPECIES_EXPANSION_SOURCES: Record<string, SourceCitation> = {
  reptifilesChildrensPython2026: { id: 'reptifilesChildrensPython2026', title: "Children's Python Care Sheet", publisher: 'ReptiFiles', url: 'https://reptifiles.com/childrens-python-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Species-specific keeper guidance; cross-checked against Australian husbandry references.' },
  nswsChildrensPython2026: { id: 'nswsChildrensPython2026', title: "Children's Python — Australian Native Animals", publisher: 'NSW Department of Education', url: 'https://education.nsw.gov.au/teaching-and-learning/animals-in-schools/animals-in-schools-species/australian-native-animals/childrens-python', accessedOn: reviewedOn, evidenceLevel: 'high', notes: 'Government animal-care guidance used as a cross-check for thermal and behavioural requirements.' },
  reptinodeWoma2026: { id: 'reptinodeWoma2026', title: 'Woma Python Care Sheet', publisher: 'ReptiNode', url: 'https://reptinode.fr/en/genetics/aspidites-ramsayi', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Keeper-facing species reference; specialist context retained.' },
  reptifilesDumerilBoa2026: { id: 'reptifilesDumerilBoa2026', title: "Dumeril's Boa Care Guide", publisher: 'ReptiFiles', url: 'https://reptifiles.com/dumerils-boa-care/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Species-specific keeper reference.' },
  reptifilesColombianRainbowBoa2026: { id: 'reptifilesColombianRainbowBoa2026', title: 'Colombian Rainbow Boa Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/colombian-rainbow-boa-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Species-specific rainbow boa reference; taxon/locality nuance retained.' },
  reptifilesSpottedPython2026: { id: 'reptifilesSpottedPython2026', title: 'Spotted Python Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/spotted-python-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Current species-specific Antaresia maculosa guidance.' },
  reptifilesPygmyPython2019: { id: 'reptifilesPygmyPython2019', title: 'Pygmy Python Care Reference', publisher: 'Fuzzy Fox / Australian keeper reference', url: 'https://fuzzyfox.com.au/blogs/breeding-and-care/breeding-and-care-of-pygmy-pythons-antaresia-perthensis', accessedOn: reviewedOn, evidenceLevel: 'limited', notes: 'Detailed Australian captive-care account; values are treated as practical evidence rather than universal consensus.' },
  reptifilesBredlsPython2026: { id: 'reptifilesBredlsPython2026', title: "Bredl's Python Care Sheet", publisher: 'ReptiFiles', url: 'https://reptifiles.com/bredls-python-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Current species-specific guidance for Morelia bredli.' },
  reptifilesBlackRatsnake2026: { id: 'reptifilesBlackRatsnake2026', title: 'Black Ratsnake Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/black-ratsnake-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Current Pantherophis obsoletus guidance including arboreal behaviour, thermal gradient and humidity.' },
  reptifilesGarter2026: { id: 'reptifilesGarter2026', title: 'Garter Snake Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/garter-snake-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Genus-level guidance with Common Garter specifics retained; locality/subspecies can alter details.' },
  herpetonHouseSnake2026: { id: 'herpetonHouseSnake2026', title: 'Boaedon fuliginosus Care Guide', publisher: 'Herpeton Academy', url: 'https://academy.herpeton.net/en/caresheets/snakes/boaedon-fuliginosus/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Species and trade-identification guidance; highlights the African house snake species-complex issue.' },
  amazonBasinsEmerald2026: { id: 'amazonBasinsEmerald2026', title: 'Amazon Basin Emerald Tree Boa Husbandry', publisher: 'Amazon Basins', url: 'https://www.amazonbasins.com/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Specialist captive-propagation and husbandry resource focused on Corallus batesii.' },
  reptifilesNorthernEmerald2026: { id: 'reptifilesNorthernEmerald2026', title: 'Northern Emerald Tree Boa Care Sheet', publisher: 'ReptiFiles', url: 'https://reptifiles.com/northern-emerald-tree-boa-care-sheet/', accessedOn: reviewedOn, evidenceLevel: 'moderate', notes: 'Species-specific current guidance for Corallus caninus.' },
};

const p = (
  id: string,
  scientific: string,
  authorYear: string,
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
  riskClass: 'companion' | 'specialist',
  basking: [number, number] | undefined,
  warm: [number, number] | undefined,
  cool: [number, number] | undefined,
  night: [number, number] | undefined,
  humidity: [number, number],
  humidityTarget: 'target' | 'acceptable',
  substrates: string[],
  hides: string,
  water: string,
  ventilation: string,
  lighting: string,
  climbing: boolean,
  enrichment: string[],
  feedingGuild: 'carnivore' | 'generalist' | 'insectivore',
  prey: string[],
  feedingNotes: string,
  breedingNotes: string,
  safety: string,
  sources: string[],
): SnakeSpeciesRecord => {
  const temperature = {
    ...(basking ? { basking: { min: basking[0], max: basking[1], unit: '°C', context: 'species reference' } } : {}),
    ...(warm ? { warmSide: { min: warm[0], max: warm[1], unit: '°C', context: 'warm area' } } : {}),
    ...(cool ? { coolSide: { min: cool[0], max: cool[1], unit: '°C', context: 'cool area' } } : {}),
    ...(night ? { night: { min: night[0], max: night[1], unit: '°C', context: 'night range' } } : {}),
  };

  return {
    ...base,
    id,
    acceptedScientificName: scientific,
    authorYear,
    commonNames,
    searchAliases: aliases,
    family,
    genus,
    speciesEpithet: epithet,
    taxonStatus: 'accepted',
    taxonSource: taxonomySource,
    knowledge: {
      summary,
      distribution,
      habitat,
      activityPattern,
      lifestyle,
      riskClass,
      husbandry: {
        evidenceLevel: sources.includes('reptifilesPygmyPython2019') ? 'limited' : 'moderate',
        temperature,
        humidity: {
          [humidityTarget]: { min: humidity[0], max: humidity[1], unit: '%', context: 'species baseline' },
          notes: 'Use a gradient and permit local microclimate variation; high humidity must be paired with ventilation rather than stagnant saturation.',
        },
        enclosure: {
          habitatType: lifestyle,
          substrate: substrates,
          hides,
          climbing,
          water,
          ventilation,
          lighting,
          enrichment,
        },
        cohabitation: {
          recommendation: 'generally-single',
          rationale: 'Single housing is the conservative pet default outside managed breeding; species-specific sociality remains evidence-gated.',
        },
      },
      feeding: {
        evidenceLevel: sources.includes('reptifilesPygmyPython2019') ? 'limited' : 'moderate',
        dietaryGuild: feedingGuild,
        preyCategories: prey,
        notes: feedingNotes,
      },
      breeding: {
        evidenceLevel: 'moderate',
        seasonalCycling: 'Seasonal or environmental cues may be relevant in established breeding programmes.',
        notes: breedingNotes,
      },
      safety: {
        medicallySignificantVenom: false,
        rearFangedOrVenomDelivery: false,
        handlingNotes: safety,
      },
      sourceIds: sources,
      reviewedOn,
    },
  };
};

export const SPECIES_EXPANSION_CORE: SnakeSpeciesRecord[] = [
  p('antaresia-childreni','Antaresia childreni','(GRAY, 1842)',["Children's Python","Stimson's Python"],['childrens python',"children's python",'stimson python',"stimson's python",'antaresia childreni'],'Pythonidae','Antaresia','childreni','Small Australian python with terrestrial and climbing behaviour.','Northern and central Australia.','Woodland, rocky outcrops, savannah and seasonally dry habitat.','cathemeral',['terrestrial','semi-arboreal'],'companion',[32,34],[28,30],[24,26],[21,23],[40,60],'target',['aspen','paper-based','dry wood/bark substrate'],'Secure warm and cool retreats with additional cover.','Stable clean water bowl.','Good ventilation and drying after localised moisture.','Predictable day/night cycle; low-level UVB may be offered with shade.',true,['secure branches','cork bark','multiple hides','rock/ground cover'],'carnivore',['appropriately sized small mammals','whole prey'],'Feed proportionately and monitor body condition.','Seasonal breeding cues may be used in established programmes.','Non-venomous small python; support the body and allow secure retreats.',['reptileDatabase2026','nswsChildrensPython2026','reptifilesChildrensPython2026']),
  p('aspidites-ramsayi','Aspidites ramsayi','(MACLEAY, 1882)',['Woma Python',"Ramsay's Python"],['woma python','woma',"ramsay's python",'aspidites ramsayi'],'Pythonidae','Aspidites','ramsayi','Australian burrowing python from arid and semi-arid regions.','Central, western and southern interior Australia.','Arid and semi-arid scrub, grassland and sandy/rocky inland habitats.','nocturnal',['terrestrial','fossorial'],'companion',[35,38],[30,33],[24,28],[20,22],[30,50],'target',['aspen','cypress mulch','packed sand/soil mix'],'Secure warm and cool hides.','Stable fresh water bowl.','Good ventilation and rapid drying.','Predictable photoperiod; low-level UVB may be offered with shade.',false,['deep burrowing substrate','cork/bark','ground cover','secure hides'],'carnivore',['appropriately sized rodents','whole prey'],'Strong feeding response; avoid chronic overfeeding.','Seasonal temperature and photoperiod shifts may be used by experienced breeders.','Non-venomous python with potentially strong feeding response.',['reptileDatabase2026','reptinodeWoma2026']),
  p('acrantophis-dumerili','Acrantophis dumerili','JAN, 1860',["Dumeril's Boa"],['dumerils boa',"dumeril's boa",'acrantophis dumerili'],'Boidae','Acrantophis','dumerili','Large terrestrial Madagascar boa from dry southern habitats.','Southern Madagascar.','Dry forest and spiny-thicket habitats.','nocturnal',['terrestrial'],'specialist',[30,31],[27,30],[21,24],[21,24],[40,60],'target',['deep soil/wood moisture-buffering mix','cypress mulch'],'Large secure hides at warm and cool ends.','Large stable clean water bowl.','Good cross-ventilation with drying capacity.','Predictable photoperiod; UVB may be provided with shade.',false,['large hides','deep substrate','leaf litter','low robust structure'],'carnivore',['appropriately sized vertebrate whole prey'],'Feed according to body condition and life stage; avoid overconditioning.','Seasonal cycling can support reproduction in established programmes.','Non-venomous boa; adult size requires planned supported handling.',['reptileDatabase2026','reptifilesDumerilBoa2026']),
  p('epicrates-maurus','Epicrates maurus','GRAY, 1849',['Colombian Rainbow Boa','Brown Rainbow Boa'],['colombian rainbow boa','brown rainbow boa','epicrates maurus','epicrates maurus colombianus'],'Boidae','Epicrates','maurus','Moisture-dependent rainbow boa from northern South America; humidity must be paired with strong ventilation.','Central America and northern South America.','Humid forest and woodland mosaics with sheltered microhabitats.','nocturnal',['terrestrial','semi-arboreal'],'specialist',[30,31],[24,28],[23,26],[18,21],[60,70],'target',['topsoil/coconut fibre tropical mix','moisture-buffering forest substrate','leaf litter'],'Multiple snug hides including a humid retreat.','Large clean water source suitable for soaking.','Strong ventilation; prevent permanently stagnant condensation.','Predictable photoperiod with shaded foliage; low-level UVB can be provided.',true,['sturdy branches','cork','dense foliage','deep substrate','humid retreat'],'carnivore',['appropriately sized mice','rats','quail/chicks','other whole prey'],'Variety is useful where practical; meal size and interval remain body-condition led.','Seasonal cooling/photoperiod cues may be used by experienced breeders.','Non-venomous boa; support body weight and keep enclosure access secure.',['reptileDatabase2026','reptifilesColombianRainbowBoa2026']),
  p('antaresia-maculosa','Antaresia maculosa','(PETERS, 1873)',['Spotted Python','Eastern Small-blotched Python'],['spotted python','eastern small-blotched python','antaresia maculosa'],'Pythonidae','Antaresia','maculosa','Small hardy Australian python that uses ground and elevated cover.','Eastern Australia, especially Queensland and New South Wales.','Woodland, rocky habitat, open forest and seasonally dry environments.','nocturnal',['terrestrial','semi-arboreal'],'companion',[32,35],[28,30],[24,26],[20,23],[40,60],'target',['aspen','paper-based','dry naturalistic substrate'],'Secure warm and cool hides with additional cover.','Stable clean water bowl.','Good cross-ventilation.','Predictable photoperiod; low-level UVB can be offered with shade.',true,['secure branches','cork','rock/ground cover','multiple hides'],'carnivore',['appropriately sized small mammals','whole prey'],'Whole prey diet; size and interval should track body condition.','Seasonal breeding cues may be used in established programmes.','Non-venomous small python.',['reptileDatabase2026','reptifilesSpottedPython2026']),
  p('antaresia-perthensis','Antaresia perthensis','(STULL, 1932)',['Pygmy Python','Anthill Python'],['pygmy python','anthill python','antaresia perthensis'],'Pythonidae','Antaresia','perthensis','The smallest Antaresia species, adapted to arid Pilbara rocky and termite-mound habitats.','Pilbara region and adjacent rocky areas of Western Australia.','Arid sand plains, spinifex, rocky outcrops, gorges and termite-mound habitat.','nocturnal',['terrestrial','fossorial'],'companion',[31,32],[28,30],[24,28],[20,23],[30,50],'target',['sand','aspen','coco-husk substrate'],'Small secure hides with additional surface cover.','Stable small water bowl.','Good ventilation; do not raise humidity unnecessarily.','Predictable day/night cycle.',false,['deep enough substrate for shelter','rock cover','aged wood','small branch'],'generalist',['small reptiles','appropriately sized mammals'],'Hatchlings may have stronger reptile prey bias; captive transition to rodents should be individualised.','Seasonal breeding and oviposition are documented; specialist breeding references should guide incubation.','Non-venomous small python.',['reptileDatabase2026','reptifilesPygmyPython2019']),
  p('morelia-bredli','Morelia bredli','GOW, 1981',["Bredl's Python"],['bredls python',"bredl's python",'morelia bredli'],'Pythonidae','Morelia','bredli','Large terrestrial Australian python with strong basking behaviour and robust climbing structures useful for enrichment.','Southern Northern Territory around the MacDonnell Ranges.','Rocky ranges, dry woodland and arid scrub.','diurnal',['terrestrial','semi-arboreal'],'specialist',[31,35],[28,31],[24,27],[20,23],[30,50],'target',['aspen','cypress mulch','soil/sand mix'],'Large secure hides and robust cover.','Large stable water bowl.','Strong ventilation and dry baseline substrate.','Predictable photoperiod with UVB and basking access.',true,['large branches','rock ledges','cork','ground cover'],'carnivore',['appropriately sized rodents','whole prey'],'Monitor body condition carefully as adults are substantial animals.','Seasonal cooling and photoperiod cues can be used in breeding programmes.','Non-venomous large python; plan supported two-handed handling for adults.',['reptileDatabase2026','reptifilesBredlsPython2026']),
  p('pantherophis-obsoletus','Pantherophis obsoletus','(SAY, 1823)',['Black Ratsnake','Western Ratsnake'],['black ratsnake','western ratsnake','pantherophis obsoletus'],'Colubridae','Pantherophis','obsoletus','Adaptable North American ratsnake that uses both ground and elevated cover.','Central and eastern United States.','Forest, woodland edge, farmland and rocky habitats.','diurnal',['terrestrial','semi-arboreal'],'companion',[29,32],[25,29],[21,24],[18,21],[40,60],'target',['aspen','cypress/soil mix','paper-based'],'Multiple hides with elevated cover.','Large stable water bowl.','Good cross-ventilation with moderate humidity.','Predictable photoperiod; full-spectrum/UVB can be offered with shade.',true,['branches','cork','dense ground cover','foraging opportunities'],'carnivore',['appropriately sized rodents','whole prey'],'Feed to body condition and life stage; avoid chronic overfeeding.','Seasonal cycling may be relevant to reproduction.','Non-venomous colubrid that may be defensive when startled.',['reptileDatabase2026','reptifilesBlackRatsnake2026']),
  p('thamnophis-sirtalis','Thamnophis sirtalis','(LINNAEUS, 1758)',['Common Garter Snake'],['common garter','garter snake','thamnophis sirtalis'],'Colubridae','Thamnophis','sirtalis','Highly adaptable North American garter snake with varied prey use and strong seasonal ecology.','Most of North America.','Wetlands, grassland, woodland edge, gardens and riparian habitats.','diurnal',['terrestrial','semi-aquatic'],'companion',[29,31],[24,28],[20,24],[18,21],[50,70],'target',['soil/coco mix','cypress mulch','leaf litter'],'Multiple hides plus damp and dry microhabitats.','Stable clean water source; access to shallow soaking is useful.','Strong ventilation with local humidity options.','Predictable photoperiod; UVB can be provided with shade.',true,['branches','leaf litter','shallow water feature','foraging cover'],'generalist',['appropriately sized rodents','fish','amphibians','worms/invertebrates where appropriate'],'Diet is broader than many pet colubrids; avoid relying on one prey type.','Seasonal cooling is often relevant to breeding management.','Non-venomous garter; some individuals are musky or defensive when restrained.',['reptileDatabase2026','reptifilesGarter2026']),
  p('boaedon-fuliginosus','Boaedon fuliginosus','(BOCAGE, 1893)',['African House Snake','Brown House Snake'],['african house snake','brown house snake','boaedon fuliginosus'],'Lamprophiidae','Boaedon','fuliginosus','Nocturnal African house snake commonly kept in captivity; trade-identification around the species complex requires care.','Broad sub-Saharan African distribution.','Savanna, woodland, rocky areas, urban edges and other adaptable habitats.','nocturnal',['terrestrial','semi-arboreal'],'companion',[30,32],[26,29],[22,25],[19,22],[40,60],'target',['aspen','cypress mulch','soil-based naturalistic mix'],'Secure warm/cool hides with surface cover.','Stable water bowl.','Good ventilation and drying capacity.','Predictable photoperiod; UVB may be offered.',true,['low branches','cork','leaf litter','multiple hides'],'carnivore',['appropriately sized rodents','whole prey'],'Small regular meals are generally appropriate; body condition should control intervals.','Seasonal cycling may be relevant in established breeding programmes.','Non-venomous house snake; generally manageable but can be defensive.',['reptileDatabase2026','herpetonHouseSnake2026']),
  p('corallus-batesii','Corallus batesii','(GRAY, 1860)',['Amazon Basin Emerald Tree Boa','Emerald Tree Boa'],['amazon basin emerald tree boa','amazon emerald tree boa','corallus batesii'],'Boidae','Corallus','batesii','Arboreal Amazonian boa requiring carefully designed thermal and humidity gradients with substantial perches.','Western and central Amazon Basin.','Humid lowland rainforest canopy and river-edge forest.','nocturnal',['arboreal'],'specialist',[29,31],[25,28],[22,25],[20,23],[70,85],'target',['moisture-buffering tropical substrate','coconut husk','leaf litter'],'Elevated sleeping perches with secure horizontal and diagonal branches.','Elevated or stable clean water source; access should be safe.','Excellent ventilation despite high ambient humidity.','Predictable photoperiod; diffuse UVB can be provided with extensive shade.',true,['multiple sturdy perches','dense foliage','cork','elevated hides'],'carnivore',['appropriately sized rodents','whole prey'],'Feed carefully; arboreal species can be overconditioned when prey is oversized or intervals are too short.','Breeding should follow established seasonal environmental cues and specialist protocols.','Non-venomous arboreal boa; use supported, calm handling and secure all enclosure exits.',['reptileDatabase2026','amazonBasinsEmerald2026']),
  p('corallus-caninus','Corallus caninus','(LINNAEUS, 1758)',['Northern Emerald Tree Boa','Amazonian Emerald Tree Boa'],['northern emerald tree boa','emerald tree boa','corallus caninus'],'Boidae','Corallus','caninus','Arboreal emerald tree boa with specialised perch use and high-humidity tropical ecology.','Northern Amazon Basin.','Humid rainforest canopy and dense vegetation near watercourses.','nocturnal',['arboreal'],'specialist',[29,31],[25,28],[22,25],[20,23],[70,85],'target',['moisture-buffering tropical substrate','coconut husk','leaf litter'],'Strong horizontal perches and elevated hides at multiple temperatures.','Stable clean water source positioned for safe access.','Excellent ventilation to avoid stagnant high humidity.','Predictable photoperiod; diffuse UVB can be provided with deep shade.',true,['sturdy perches','dense foliage','cork','elevated cover'],'carnivore',['appropriately sized rodents','whole prey'],'Keep prey size and feeding interval conservative and monitor body condition closely.','Seasonal environmental cues and specialist breeder protocols should guide reproduction.','Non-venomous arboreal boa; secure handling is essential because of perches and enclosure height.',['reptileDatabase2026','reptifilesNorthernEmerald2026']),
];
