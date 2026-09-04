import type { SnakeSpeciesRecord } from './speciesTypes';

const reviewedOn = '2026-09-04';
const taxonomySource = 'reptileDatabase2026';
const base = { kingdom: 'Animalia' as const, phylum: 'Chordata' as const, class: 'Reptilia' as const, order: 'Squamata' as const };

const taxonomyOnly = (
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
  activityPattern: 'diurnal'|'nocturnal'|'crepuscular'|'cathemeral',
  lifestyle: ('terrestrial'|'semi-arboreal'|'arboreal'|'fossorial'|'semi-fossorial'|'semi-aquatic'|'aquatic')[],
  riskClass: 'companion'|'specialist'|'venomous'|'high-risk',
  medicallySignificantVenom: boolean,
  rearFangedOrVenomDelivery: boolean,
  handlingNotes: string,
  synonyms: string[] = []
): SnakeSpeciesRecord => ({
  ...base,
  id,
  acceptedScientificName: scientific,
  authorYear,
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
    feeding: {
      evidenceLevel: 'unknown',
      dietaryGuild: 'carnivore',
      preyCategories: ['species-specific vertebrate prey; husbandry not yet mapped'],
      notes: 'Taxonomy-first entry. Do not apply generic feeding frequency or prey-size rules.'
    },
    breeding: {
      evidenceLevel: 'unknown',
      seasonalCycling: 'Species-specific reproductive evidence required before keeper-facing guidance is enabled.',
      notes: 'Breeding guidance is withheld pending species-level evidence.'
    },
    safety: {
      medicallySignificantVenom,
      rearFangedOrVenomDelivery,
      handlingNotes
    },
    sourceIds: [taxonomySource],
    reviewedOn
  }
});

export const SPECIES_EXPANSION_BATCH_8: SnakeSpeciesRecord[] = [
  taxonomyOnly('heterodon-simus','Heterodon simus','(LINNAEUS, 1766)',['Southern Hognose Snake'],['southern hognose','southern hognose snake','heterodon simus'],'Colubridae','Heterodon','simus','Southern North American hognose species with a strongly upturned rostral scale and a specialised amphibian-heavy diet.','Southeastern United States.','Sandy soils, pine woodland, scrub, open woodland and coastal plain habitats.','diurnal',['terrestrial','fossorial'],'specialist',false,true,'Non-medically-significant rear-fanged venom delivery is present in Heterodon; treat bites and handling with appropriate caution.'),
  taxonomyOnly('xenodon-dorbignyi','Xenodon dorbignyi','(BIBRON, 1854)',['South American Hognose Snake',"d'Orbigny's Hognose Snake"],['south american hognose','dorbignys hognose','xenodon dorbignyi','lystrophis dorbignyi'],'Colubridae','Xenodon','dorbignyi','South American hognose-type snake formerly placed in Lystrophis; the current Reptile Database treats Lystrophis as a synonym of Xenodon.','Southern Brazil, Paraguay, Uruguay and Argentina.','Sandy and open habitats, grassland, scrub and seasonally dry landscapes.','diurnal',['terrestrial','fossorial'],'companion',false,true,'Rear-fanged venom delivery should be treated as a species-specific safety consideration; this is not a medically significant viper-type venomous snake.', ['Heterodon dorbignyi','Lystrophis dorbignyi']),
  taxonomyOnly('xenodon-merremii','Xenodon merremii','(WAGLER, 1824)',["Wagler's Snake",'False Yarara','Brazilian Hognose-type Snake'],['waglers snake','false yarara','falsa jararaca','xenodon merremii','waglerophis merremii'],'Colubridae','Xenodon','merremii','South American Xenodon with a broad distribution and morphology associated with hognose-type snakes; it is non-viperid despite local mimicry of Bothrops.','Northern, central and southern South America east of the Andes.','Grassland, scrub, woodland edge, agricultural landscapes and open habitats.','diurnal',['terrestrial','fossorial'],'companion',false,true,'Rear-fanged venom delivery and defensive mimicry warrant species-specific handling guidance once husbandry evidence is mapped.', ['Ophis merremii','Waglerophis merremii']),
  taxonomyOnly('crotalus-atrox','Crotalus atrox','(BAIRD & GIRARD, 1853)',['Western Diamond-backed Rattlesnake','Western Diamondback'],['western diamondback','western diamond-backed rattlesnake','crotalus atrox'],'Viperidae','Crotalus','atrox','Large North American rattlesnake and medically significant pit viper.','Southwestern United States and northern Mexico.','Desert scrub, grassland, rocky terrain, thorn scrub and open woodland.','crepuscular',['terrestrial'],'venomous',true,false,'Venomous rattlesnake. Do not provide casual handling instructions; keeper-facing guidance must prioritise legal, professional and institutional safety requirements.'),
  taxonomyOnly('crotalus-horridus','Crotalus horridus','(LINNAEUS, 1758)',['Timber Rattlesnake','Canebrake Rattlesnake'],['timber rattlesnake','canebrake rattlesnake','crotalus horridus'],'Viperidae','Crotalus','horridus','Large North American rattlesnake with substantial geographic variation and medically significant venom.','Eastern and central United States.','Forests, rocky hillsides, woodland edges, wetlands and open upland habitat.','diurnal',['terrestrial'],'venomous',true,false,'Venomous rattlesnake. Do not provide casual handling instructions; keeper-facing guidance must prioritise legal, professional and institutional safety requirements.'),
  taxonomyOnly('crotalus-oreganus','Crotalus oreganus','(HOLBROOK, 1840)',['Western Rattlesnake','Western Diamondback Rattlesnake complex species'],['western rattlesnake','crotalus oreganus'],'Viperidae','Crotalus','oreganus','Northwestern North American rattlesnake currently recognised as a distinct species, with important locality variation.','Western United States and southwestern Canada.','Desert, grassland, woodland, rocky slopes and montane habitats.','diurnal',['terrestrial'],'venomous',true,false,'Venomous rattlesnake. Do not provide casual handling instructions; keeper-facing guidance must prioritise legal, professional and institutional safety requirements.'),
  taxonomyOnly('crotalus-scutulatus','Crotalus scutulatus','(KENNICOTT, 1861)',['Mojave Rattlesnake'],['mojave rattlesnake','mojave green','crotalus scutulatus'],'Viperidae','Crotalus','scutulatus','Highly venomous North American rattlesnake associated with arid western landscapes.','Southwestern United States and northern Mexico.','Desert scrub, rocky desert, grassland and arid open terrain.','nocturnal',['terrestrial'],'venomous',true,false,'Highly venomous rattlesnake. No casual handling guidance; any husbandry module must be restricted to appropriately authorised professional contexts.'),
  taxonomyOnly('bitis-arietans','Bitis arietans','(MERREM, 1820)',['Puff Adder'],['puff adder','bitis arietans'],'Viperidae','Bitis','arietans','Large African viper with medically significant venom and a broad ecological range.','Much of sub-Saharan Africa and parts of the Arabian Peninsula.','Savanna, grassland, woodland, scrub and semi-arid habitats.','nocturnal',['terrestrial'],'venomous',true,false,'Venomous viper. Do not provide casual handling instructions; professional safety and legal compliance are mandatory considerations.'),
  taxonomyOnly('bitis-nasicornis','Bitis nasicornis','(SHAW, 1802)',['Rhinoceros Viper','River Jack'],['rhinoceros viper','river jack','bitis nasicornis'],'Viperidae','Bitis','nasicornis','Large, strongly patterned African viper associated with humid forest environments and medically significant venom.','West and Central Africa.','Lowland rainforest, swamp margins and humid forest near water.','nocturnal',['terrestrial','semi-aquatic'],'venomous',true,false,'Venomous viper. No casual handling guidance; any husbandry information must be restricted to appropriately authorised professional contexts.'),
  taxonomyOnly('bothrops-asper','Bothrops asper','(GARMAN, 1883)',['Terciopelo','Fer-de-lance'],['terciopelo','fer de lance','fer-de-lance','bothrops asper'],'Viperidae','Bothrops','asper','Large Central American pit viper responsible for medically significant snakebite and requiring specialist professional management.','Mexico through Central America into northwestern South America.','Lowland rainforest, plantations, forest edge, agricultural areas and humid scrub.','nocturnal',['terrestrial'],'venomous',true,false,'Medically significant pit viper. No casual handling guidance; professional safety, legal compliance and emergency planning are essential.'),
  taxonomyOnly('bothrops-atrox','Bothrops atrox','(LINNAEUS, 1758)',['Common Lancehead','Fer-de-lance'],['common lancehead','fer de lance','fer-de-lance','bothrops atrox'],'Viperidae','Bothrops','atrox','Highly variable South American lancehead with medically significant venom and complex taxonomic history.','Northern and western South America.','Tropical forest, forest edge, agricultural mosaics and humid lowland habitats.','nocturnal',['terrestrial'],'venomous',true,false,'Medically significant pit viper. No casual handling guidance; professional safety, legal compliance and emergency planning are essential.'),
  taxonomyOnly('daboia-russelii','Daboia russelii','(SHAW, 1797)',['Russell’s Viper','Chain Viper'],['russells viper','russell viper','chain viper','daboia russelii'],'Viperidae','Daboia','russelii','Major South Asian viper with medically significant venom and substantial public-health importance.','South Asia including India, Sri Lanka, Pakistan, Bangladesh and Nepal.','Grassland, scrub, agricultural landscapes and open woodland.','nocturnal',['terrestrial'],'venomous',true,false,'Highly medically significant viper. No casual handling guidance; professional safety, legal compliance and emergency planning are essential.'),
  taxonomyOnly('daboia-siamensis','Daboia siamensis','(SMITH, 1917)',['Siamese Russell’s Viper','Eastern Russell’s Viper'],['siamese russells viper','eastern russells viper','daboia siamensis'],'Viperidae','Daboia','siamensis','Southeast Asian Daboia species elevated from subspecies treatment and possessing medically significant venom.','Thailand, Myanmar, Cambodia, Laos, Vietnam and parts of southern China.','Open woodland, grassland, agricultural areas and dry scrub.','nocturnal',['terrestrial'],'venomous',true,false,'Highly medically significant viper. No casual handling guidance; professional safety, legal compliance and emergency planning are essential.'),
  taxonomyOnly('echis-carinatus','Echis carinatus','(SCHNEIDER, 1801)',['Saw-scaled Viper','Carpet Viper'],['saw scaled viper','saw-scaled viper','carpet viper','echis carinatus'],'Viperidae','Echis','carinatus','Small but highly medically significant viper with a broad Old World distribution.','South Asia and parts of the Middle East.','Arid scrub, rocky terrain, grassland, agricultural margins and semi-desert habitats.','nocturnal',['terrestrial'],'venomous',true,false,'Highly medically significant viper. No casual handling guidance; professional safety, legal compliance and emergency planning are essential.'),
  taxonomyOnly('acanthophis-antarcticus','Acanthophis antarcticus','(SHAW, 1794)',['Common Death Adder'],['common death adder','death adder','acanthophis antarcticus'],'Elapidae','Acanthophis','antarcticus','Australian death adder with potent neurotoxic venom and ambush predation behaviour.','Eastern and southern Australia.','Woodland, grassland, heath, scrub and sandy habitats.','nocturnal',['terrestrial'],'venomous',true,false,'Venomous elapid. No casual handling guidance; professional safety, legal compliance and emergency planning are essential.'),
  taxonomyOnly('ophiophagus-hannah','Ophiophagus hannah','(CANTOR, 1836)',['King Cobra'],['king cobra','hamadryad','ophiophagus hannah'],'Elapidae','Ophiophagus','hannah','The world’s longest venomous snake, a specialised ophiophagous elapid with medically significant venom.','South and Southeast Asia.','Forest, woodland, bamboo, plantations and habitats near water.','diurnal',['terrestrial','semi-arboreal','semi-aquatic'],'venomous',true,false,'Highly venomous elapid and specialist species. No casual handling guidance; professional safety, legal compliance and emergency planning are essential.')
];
