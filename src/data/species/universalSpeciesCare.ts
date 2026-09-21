import type { UniversalSpeciesRecord } from './universalSpeciesTypes';
import type {
  CarePriority,
  HealthPriority,
  UniversalCareBasis,
  UniversalCareEvidence,
  UniversalCareRequirement,
  UniversalHealthProfile,
  UniversalHealthWatch,
  UniversalHusbandryProfile,
  UniversalSpeciesCare,
} from './universalSpeciesCareTypes';

const REVIEWED_ON = '2026-09-21';

const CLASS_SOURCE_IDS: Record<UniversalSpeciesRecord['className'], string[]> = {
  reptile: ['merckReptileHusbandry2026', 'merckExoticNutrition2025'],
  amphibian: ['merckAmphibianHusbandry2026', 'merckExoticNutrition2025'],
  arachnid: [],
  insect: [],
  myriapod: [],
  mollusc: [],
  crustacean: [],
  mammal: ['merckExoticNutrition2025'],
  bird: ['merckBirdOverview2026', 'merckBirdManagement2026', 'aavBirdOwners2026', 'merckExoticNutrition2025'],
  fish: ['oataFreshwater2026', 'oataMarine2026', 'oataTraining2026'],
  cephalopod: [],
};

const CLASS_BASIS: Record<UniversalSpeciesRecord['className'], UniversalCareBasis> = {
  reptile: 'class-level',
  amphibian: 'class-level',
  arachnid: 'ecology-only',
  insect: 'ecology-only',
  myriapod: 'ecology-only',
  mollusc: 'ecology-only',
  crustacean: 'class-level',
  mammal: 'general-veterinary',
  bird: 'general-veterinary',
  fish: 'class-level',
  cephalopod: 'ecology-only',
};

const CLASS_CAVEATS: Record<UniversalSpeciesRecord['className'], string> = {
  reptile: 'General veterinary guidance is used for the baseline. Species, locality, life-stage and captive-history differences still require a species-specific evidence review.',
  amphibian: 'General veterinary guidance is used for the baseline. Amphibian moisture, temperature, water and disease-management needs vary materially between taxa and life stages.',
  arachnid: 'This is an ecology-derived baseline, not a species care sheet. Exact moisture, temperature, substrate, feeding and handling requirements require specialist evidence.',
  insect: 'This is an ecology-derived baseline, not a species care sheet. Lifecycle, diapause, breeding, humidity, diet and substrate requirements require specialist evidence.',
  myriapod: 'This is an ecology-derived baseline, not a species care sheet. Substrate chemistry, moisture, ventilation and diet require specialist evidence.',
  mollusc: 'This is an ecology-derived baseline, not a species care sheet. Land, freshwater and marine molluscs have very different systems; exact parameters require species-specific evidence.',
  crustacean: 'The baseline covers welfare fundamentals only. Freshwater, marine and terrestrial/amphibious crustaceans require species-specific water, salinity and habitat evidence.',
  mammal: 'General exotic-animal veterinary nutrition and welfare principles are used. Social structure, diet, thermal needs, dental needs and enclosure design remain taxon-specific.',
  bird: 'General avian veterinary guidance is used. Diet, social needs, flight space, lighting and enrichment vary substantially among bird taxa.',
  fish: 'Aquatic welfare fundamentals are used. Freshwater, brackish and marine systems must not be given the same numeric targets; species-specific chemistry and temperature evidence is required.',
  cephalopod: 'This is a specialist-only baseline. Marine-system chemistry, oxygenation, diet, enrichment and clinical management require dedicated cephalopod expertise.',
};

type RequirementTemplate = Omit<UniversalCareRequirement, 'evidence'> & {
  basis?: UniversalCareBasis;
  sourceIds?: string[];
  caveat?: string;
};

const requirement = (
  id: string,
  domain: UniversalCareRequirement['domain'],
  label: string,
  guidance: string,
  priority: CarePriority,
  extra: Partial<RequirementTemplate> = {},
): RequirementTemplate => ({
  id, domain, label, guidance, priority, ...extra,
});

const CLASS_REQUIREMENTS: Record<UniversalSpeciesRecord['className'], RequirementTemplate[]> = {
  reptile: [
    requirement('enclosure-type', 'housing', 'Species-appropriate enclosure', 'Use an enclosure/system that matches the recorded lifestyle and allows normal movement, retreat and thermoregulation.', 'essential'),
    requirement('thermal-environment', 'environment', 'Thermal choice and gradient', 'Provide the species-appropriate thermal environment and enough spatial choice for the animal to move between warmer and cooler areas where its biology requires this.', 'essential'),
    requirement('moisture', 'environment', 'Moisture and humidity', 'Maintain the moisture/humidity conditions and microclimates appropriate to the species; do not reduce ventilation simply to force humidity upward.', 'essential'),
    requirement('light', 'lighting', 'Species-appropriate lighting', 'Provide an appropriate photoperiod and UVA/UVB provision where supported by the species evidence; never assume every reptile has identical lighting needs.', 'important'),
    requirement('retreats', 'housing', 'Retreats and cover', 'Provide secure hides, cover and/or climbing structure appropriate to the recorded lifestyle so the reptile can choose shelter.', 'essential'),
    requirement('water', 'water', 'Clean drinking water', 'Provide clean water access appropriate to the species; aquatic reptiles need a maintained aquatic system rather than a simple drinking bowl alone.', 'essential'),
    requirement('feeding', 'feeding', 'Species-appropriate nutrition', 'Feed according to the species diet, life stage and condition rather than using one prey or food rule across reptiles.', 'essential'),
    requirement('ventilation', 'environment', 'Ventilation and air quality', 'Maintain ventilation appropriate to the enclosure and species without creating harmful environmental instability.', 'essential'),
    requirement('hygiene', 'biosecurity', 'Hygiene and quarantine', 'Use routine cleaning, sensible equipment hygiene and a quarantine plan appropriate to the collection risk.', 'important'),
    requirement('records', 'monitoring', 'Health and husbandry records', 'Track weight/condition, feeding, shedding or other species-appropriate outputs and record meaningful environmental changes.', 'important'),
  ],
  amphibian: [
    requirement('enclosure-type', 'housing', 'Species-appropriate wet/dry system', 'Use a terrestrial, arboreal, fossorial, semi-aquatic or aquatic system that matches the species ecology.', 'essential'),
    requirement('moisture', 'environment', 'Stable moisture', 'Prevent desiccation with the moisture regime and microclimates appropriate to the species while preserving adequate ventilation.', 'essential'),
    requirement('water-quality', 'water', 'Clean, non-toxic water', 'Water must be suitable for amphibian skin and respiration and free of harmful contaminants; aquatic species require a managed aquatic system.', 'essential'),
    requirement('temperature', 'environment', 'Species-appropriate temperature', 'Maintain the thermal environment within the species evidence and provide appropriate choice or gradients when biology calls for them.', 'essential'),
    requirement('light', 'lighting', 'Appropriate photoperiod and lighting', 'Use a species-appropriate light cycle; UVB should be treated as species- and activity-dependent rather than a universal amphibian rule.', 'important'),
    requirement('refugia', 'housing', 'Refugia and low-stress structure', 'Provide secure refugia and environmental structure that lets the amphibian retreat and express normal behaviour.', 'essential'),
    requirement('feeding', 'feeding', 'Species-appropriate nutrition', 'Match prey/food type, size, supplementation and lifecycle stage to the species rather than relying on a generic amphibian feeding schedule.', 'essential'),
    requirement('biosecurity', 'biosecurity', 'Strict disease biosecurity', 'Use dedicated equipment and quarantine controls; amphibian collections are particularly vulnerable to pathogen transfer.', 'essential'),
    requirement('records', 'monitoring', 'Health and water records', 'Record appetite, behaviour, body condition and relevant water/environment results so changes can be identified early.', 'important'),
  ],
  arachnid: [
    requirement('secure-enclosure', 'housing', 'Secure species-appropriate enclosure', 'Use an escape-resistant enclosure scaled to the animal and matched to terrestrial, arboreal or fossorial behaviour.', 'essential'),
    requirement('microclimate', 'environment', 'Appropriate microclimate', 'Provide the moisture and thermal conditions indicated by the species ecology, with usable microclimate choice where appropriate.', 'essential'),
    requirement('retreat', 'housing', 'Retreat or webbing structure', 'Provide substrate, structure and cover that allow species-typical retreat, webbing or climbing behaviour.', 'essential'),
    requirement('ventilation', 'environment', 'Ventilation', 'Provide sufficient air exchange for the enclosure without creating an inappropriate dry environment for the species.', 'essential'),
    requirement('feeding', 'feeding', 'Appropriate live prey/food', 'Use a species-appropriate food source and avoid assuming all arachnids can share the same prey size, frequency or supplementation.', 'essential'),
    requirement('moult-safety', 'monitoring', 'Moult-aware management', 'Disturbance, feeding and enclosure changes must account for moulting/ecdysis and the animal’s ability to move safely.', 'essential'),
    requirement('water', 'water', 'Hydration access', 'Provide an appropriate hydration route for the species; this may be direct water access, environmental moisture or another verified method.', 'important'),
    requirement('records', 'monitoring', 'Collection records', 'Track feeding, moulting, body condition and enclosure changes so abnormal patterns are visible.', 'important'),
  ],
  insect: [
    requirement('lifecycle', 'housing', 'Lifecycle-appropriate enclosure', 'The enclosure must support the species’ lifecycle, including juvenile, adult, breeding and diapause states where applicable.', 'essential'),
    requirement('microclimate', 'environment', 'Temperature and moisture regime', 'Use a species-appropriate thermal and moisture regime; do not apply one insect setup to unrelated taxa.', 'essential'),
    requirement('ventilation', 'environment', 'Ventilation and condensation control', 'Maintain airflow appropriate to the species and lifecycle without causing harmful desiccation.', 'essential'),
    requirement('substrate', 'substrate', 'Species-appropriate substrate', 'Use a clean substrate/media matched to burrowing, moulting, pupation or egg-laying requirements.', 'essential'),
    requirement('food', 'feeding', 'Species-appropriate food source', 'Match food and feeding method to the species and lifecycle stage; plant material, prey and formulated diets are not interchangeable.', 'essential'),
    requirement('moult', 'monitoring', 'Moult and metamorphosis safety', 'Provide enough space, structure and environmental stability for moulting or metamorphosis and avoid unnecessary disturbance.', 'essential'),
    requirement('hydration', 'water', 'Safe hydration', 'Provide hydration in a species-appropriate form while preventing drowning or unsafe enclosure conditions.', 'important'),
    requirement('records', 'monitoring', 'Lifecycle records', 'Record feeding, moulting, pupation, emergence and breeding changes where these apply.', 'important'),
  ],
  myriapod: [
    requirement('substrate', 'substrate', 'Deep, biologically suitable substrate', 'Provide substrate appropriate to the species’ burrowing and decomposer ecology, without assuming every millipede or centipede uses the same media.', 'essential'),
    requirement('moisture', 'environment', 'Moisture gradient', 'Maintain species-appropriate moisture and allow usable microclimates rather than keeping the whole enclosure uniformly saturated.', 'essential'),
    requirement('ventilation', 'environment', 'Ventilation', 'Provide sufficient airflow to prevent persistent harmful stagnation while retaining the species’ required moisture.', 'essential'),
    requirement('temperature', 'environment', 'Stable thermal environment', 'Use a species-appropriate thermal regime and avoid unverified numeric targets.', 'essential'),
    requirement('feeding', 'feeding', 'Species-appropriate diet', 'Match food to the animal’s dietary guild; decomposer and predatory myriapods have fundamentally different feeding needs.', 'essential'),
    requirement('retreat', 'housing', 'Burrow and retreat structure', 'Provide substrate depth, cover and surface structure that permit normal hiding and activity.', 'essential'),
    requirement('water', 'water', 'Safe hydration', 'Maintain hydration through the verified species method and prevent standing water from becoming hazardous.', 'important'),
  ],
  mollusc: [
    requirement('system-type', 'housing', 'Correct land or aquatic system', 'First establish whether the species is terrestrial, freshwater or marine; these are different husbandry systems and should never share generic numeric targets.', 'essential'),
    requirement('media', 'substrate', 'Species-appropriate media/substrate', 'Use clean substrate or aquatic media suited to the species and its shell, burrowing or grazing behaviour.', 'essential'),
    requirement('moisture-water', 'water', 'Appropriate moisture or water quality', 'Maintain the species’ required moisture or aquatic conditions and avoid contaminants that can damage sensitive tissues or shells.', 'essential'),
    requirement('nutrition', 'feeding', 'Species-appropriate nutrition', 'Match foods, grazing resources and mineral needs to the species; do not assume all molluscs are herbivorous.', 'essential'),
    requirement('ventilation', 'environment', 'Environmental stability', 'Provide adequate airflow for terrestrial taxa and adequate system exchange/filtration for aquatic taxa.', 'important'),
    requirement('shell-support', 'feeding', 'Shell-support nutrition where required', 'Where the species depends on dietary mineral availability for shell growth, provide an evidence-based mineral source rather than a blanket supplement rule.', 'conditional'),
    requirement('escape-control', 'housing', 'Escape prevention', 'Use an enclosure or system that prevents escape and protects the animal from unsafe access to drying, heating or contaminated surfaces.', 'essential'),
  ],
  crustacean: [
    requirement('system-type', 'housing', 'Correct aquatic/semi-aquatic system', 'Match the enclosure to freshwater, marine, terrestrial or amphibious ecology and provide all required zones.', 'essential'),
    requirement('water-quality', 'water', 'Stable water quality', 'Water quality is a core health variable for aquatic crustaceans; exact chemistry must be species-specific rather than inferred across taxa.', 'essential'),
    requirement('filtration-oxygen', 'water', 'Filtration and oxygenation', 'Use filtration, flow and oxygenation appropriate to biomass, species and system design.', 'essential'),
    requirement('shelter', 'housing', 'Shelter and moult refuge', 'Provide hiding structure and protected areas for moulting and retreat, appropriate to the species.', 'essential'),
    requirement('feeding', 'feeding', 'Species-appropriate diet', 'Match food type and feeding method to the species and lifecycle stage; account for scavenging, predation or herbivory where relevant.', 'essential'),
    requirement('salinity', 'water', 'Correct salinity regime', 'Marine, brackish and freshwater systems require different chemistry; do not convert between them without species evidence.', 'conditional'),
    requirement('records', 'monitoring', 'Water and health records', 'Track key system observations and changes in appetite, moulting, activity and body condition where observable.', 'important'),
  ],
  mammal: [
    requirement('space', 'housing', 'Adequate usable space', 'Provide sufficient usable space for locomotion, resting, species-typical activity and safe retreat, not merely a container that fits the animal.', 'essential'),
    requirement('social', 'social', 'Correct social structure', 'Determine whether the species is solitary, pair-living, family-living or group-living and manage companionship accordingly.', 'essential'),
    requirement('diet', 'feeding', 'Nutritionally appropriate diet', 'Use a species-appropriate complete diet or carefully formulated feeding plan; avoid assuming food from a related mammal is nutritionally equivalent.', 'essential'),
    requirement('enrichment', 'enrichment', 'Behavioural and environmental enrichment', 'Provide opportunities for exploration, foraging, exercise, manipulation, nesting and other normal behaviours appropriate to the species.', 'essential'),
    requirement('air-quality', 'environment', 'Ventilation and thermal safety', 'Provide clean air and a safe thermal environment; heat sensitivity can be pronounced in some exotic mammals.', 'essential'),
    requirement('resting-cover', 'housing', 'Secure resting and nesting areas', 'Provide species-appropriate sleeping, nesting or retreat spaces that allow undisturbed rest.', 'essential'),
    requirement('water', 'water', 'Fresh water access', 'Provide clean, accessible water using a system the animal can safely use and cannot easily contaminate.', 'essential'),
    requirement('vet', 'monitoring', 'Exotic-veterinary access', 'Identify a veterinarian experienced with the species before acquisition and keep meaningful weight/condition and health records.', 'essential'),
  ],
  bird: [
    requirement('flight-space', 'housing', 'Species-appropriate flight space', 'Provide adequate space for normal movement and flight wherever the species uses flight as a core behaviour.', 'essential'),
    requirement('social', 'social', 'Correct social environment', 'Match housing and interaction to the species’ social ecology rather than assuming all birds should be solitary or grouped.', 'essential'),
    requirement('diet', 'feeding', 'Balanced species-appropriate diet', 'Use a nutritionally appropriate diet matched to the bird’s taxon, life stage and feeding ecology; avoid selective feeding that produces nutritional imbalance.', 'essential'),
    requirement('perches', 'housing', 'Appropriate perches and foot use', 'Provide varied, safe perching and climbing opportunities appropriate to the species, with access to food and water.', 'essential'),
    requirement('foraging', 'enrichment', 'Foraging and cognitive enrichment', 'Provide sensory, nutritional, manipulative, environmental and behavioural enrichment suited to the species.', 'essential'),
    requirement('light-cycle', 'lighting', 'Light and photoperiod', 'Provide a stable day/night cycle and species-appropriate lighting; do not assume glass-window sunlight supplies the same exposure as direct light.', 'important'),
    requirement('air-quality', 'environment', 'Safe air quality', 'Avoid smoke, aerosols, fumes and poor ventilation; birds can be especially sensitive to airborne hazards.', 'essential'),
    requirement('vet', 'monitoring', 'Avian-veterinary access', 'Establish access to an avian veterinarian and monitor appetite, body condition, droppings, respiratory effort and feather/foot condition.', 'essential'),
  ],
  fish: [
    requirement('cycled-system', 'housing', 'Established aquatic system', 'Use an aquarium or pond system appropriate to the mature animal and establish the biological filtration needed by the system before stocking.', 'essential'),
    requirement('water-quality', 'water', 'Water quality management', 'Test and record the chemistry relevant to the system and keep conditions stable; water quality is a primary fish-welfare variable.', 'essential'),
    requirement('filtration', 'water', 'Filtration and oxygenation', 'Provide filtration and oxygenation appropriate to the species, stock level and system design.', 'essential'),
    requirement('temperature', 'environment', 'Species-appropriate temperature', 'Maintain the species-specific thermal regime and avoid applying tropical, temperate or marine assumptions interchangeably.', 'essential'),
    requirement('habitat', 'housing', 'Species-appropriate habitat structure', 'Provide swimming space, cover, plants, substrate or flow patterns that permit normal behaviour for the species.', 'essential'),
    requirement('diet', 'feeding', 'Species-appropriate diet', 'Match food type and feeding method to the fish’s dietary guild, size, lifecycle and behaviour.', 'essential'),
    requirement('compatibility', 'social', 'Compatible stocking', 'Plan social grouping and tank-mates around species compatibility, territoriality, predation and available resources.', 'important'),
    requirement('records', 'monitoring', 'Water and health records', 'Record test results and observe breathing, appearance, body condition, feeding and behaviour for changes.', 'essential'),
  ],
  cephalopod: [
    requirement('marine-system', 'housing', 'Specialist marine system', 'Use a mature marine system designed for the species, with redundant environmental monitoring and robust filtration.', 'essential'),
    requirement('water-quality', 'water', 'Tightly controlled water quality', 'Monitor and maintain species-appropriate marine chemistry, oxygenation and stability; exact targets require cephalopod-specific evidence.', 'essential'),
    requirement('filtration-oxygen', 'water', 'High-reliability filtration and oxygenation', 'Provide dependable filtration, oxygenation and waste export appropriate to the animal and feeding load.', 'essential'),
    requirement('escape-proof', 'housing', 'Escape-resistant enclosure', 'Cephalopods are capable of exploiting small openings; the system must be physically secure and escape-resistant.', 'essential'),
    requirement('shelter', 'housing', 'Retreat and environmental complexity', 'Provide appropriate den/retreat structure and species-compatible environmental complexity.', 'essential'),
    requirement('diet', 'feeding', 'Species-specific marine diet', 'Match food type, preparation and feeding behaviour to the species; do not generalise across cephalopods.', 'essential'),
    requirement('monitoring', 'monitoring', 'Continuous operational monitoring', 'Maintain a clear observation and contingency plan because water-system failures can become critical quickly.', 'essential'),
    requirement('specialist-vet', 'monitoring', 'Specialist support', 'Only acquire or maintain a cephalopod with access to appropriate specialist aquatic/exotic veterinary and technical support.', 'essential'),
  ],
};

type HealthTemplate = Omit<UniversalHealthWatch, 'evidence'> & {
  basis?: UniversalCareBasis;
  sourceIds?: string[];
  caveat?: string;
};

const healthWatch = (
  id: string,
  concern: string,
  watchFor: string[],
  riskFactors: string[],
  prevention: string,
  priority: HealthPriority,
  extra: Partial<HealthTemplate> = {},
): HealthTemplate => ({
  id, concern, watchFor, riskFactors, prevention, priority, ...extra,
});

const CLASS_HEALTH_WATCHES: Record<UniversalSpeciesRecord['className'], HealthTemplate[]> = {
  reptile: [
    healthWatch('nutrition-metabolic', 'Nutrition or metabolic problems', ['persistent weight/condition change', 'weakness or reduced normal activity', 'abnormal growth or skeletal/soft-tissue changes'], ['unbalanced diet', 'inappropriate environmental support for normal metabolism', 'incorrect supplementation'], 'Use species-appropriate nutrition and environment, and investigate sustained changes rather than correcting a symptom blindly.', 'prompt-vet', { sourceIds: ['merckReptileHusbandry2026', 'merckExoticNutrition2025'], basis: 'general-veterinary' }),
    healthWatch('respiratory', 'Respiratory disease', ['changed respiratory effort', 'nasal/oral discharge', 'persistent open-mouth breathing or unusual breathing posture'], ['poor ventilation', 'inappropriate temperature/moisture conditions', 'infectious exposure'], 'Maintain appropriate ventilation and environmental conditions and use quarantine when adding reptiles.', 'prompt-vet', { sourceIds: ['merckReptileHusbandry2026'], basis: 'general-veterinary' }),
    healthWatch('skin-shed', 'Skin and shedding problems', ['retained shed', 'persistent abnormal skin appearance', 'lesions or unexplained tissue damage'], ['incorrect moisture regime', 'trauma', 'poor environmental hygiene'], 'Provide appropriate microclimates and inspect the animal without repeatedly disturbing normal hiding or shedding behaviour.', 'prompt-vet', { sourceIds: ['merckReptileHusbandry2026'], basis: 'general-veterinary' }),
    healthWatch('parasites-gut', 'Parasitic or gastrointestinal concerns', ['persistent appetite change', 'weight loss', 'abnormal faecal output or repeated digestive disturbance'], ['new additions without quarantine', 'shared equipment', 'unsuitable diet'], 'Use sensible biosecurity and seek species-appropriate veterinary diagnostics for persistent changes.', 'prompt-vet', { sourceIds: ['merckReptileHusbandry2026'], basis: 'general-veterinary' }),
  ],
  amphibian: [
    healthWatch('pathogen', 'Infectious disease and pathogen exposure', ['abnormal skin', 'marked lethargy', 'unusual posture, movement or swimming', 'unexpected deaths in a collection'], ['new animals', 'shared equipment', 'inadequate quarantine', 'contaminated water or substrates'], 'Use quarantine, dedicated equipment where appropriate and rapid veterinary investigation of collection-level illness.', 'urgent-vet', { sourceIds: ['merckAmphibianHusbandry2026'], basis: 'general-veterinary' }),
    healthWatch('water-toxin', 'Water quality and toxin exposure', ['changes in skin condition', 'loss of normal activity', 'feeding change', 'unexpected mortality'], ['chlorine/chloramine', 'ammonia/nitrite or other contamination', 'poor system maintenance'], 'Maintain clean, appropriate water and test the system rather than trying to diagnose from appearance alone.', 'urgent-vet', { sourceIds: ['merckAmphibianHusbandry2026'], basis: 'general-veterinary' }),
    healthWatch('nutrition', 'Nutritional disease', ['poor growth', 'weakness', 'poor body condition', 'persistent feeding difficulty'], ['inappropriate prey', 'incorrect supplementation', 'life-stage mismatch'], 'Use a verified species- and life-stage-appropriate feeding plan and veterinary nutritional review when problems persist.', 'prompt-vet', { sourceIds: ['merckAmphibianHusbandry2026', 'merckExoticNutrition2025'], basis: 'general-veterinary' }),
    healthWatch('desiccation', 'Dehydration and environmental instability', ['dry or abnormal skin', 'reduced activity', 'weight loss'], ['insufficient moisture', 'excessive ventilation for the species', 'inadequate access to water'], 'Maintain appropriate moisture microclimates and observe environmental conditions closely.', 'prompt-vet', { sourceIds: ['merckAmphibianHusbandry2026'], basis: 'general-veterinary' }),
  ],
  arachnid: [
    healthWatch('moult', 'Moulting or ecdysis failure', ['difficulty completing a moult', 'persistent immobility outside a normal pre-moult state', 'fresh damage after moulting'], ['disturbance during moult', 'inappropriate moisture', 'unsafe enclosure structure'], 'Keep environmental conditions stable and avoid unnecessary handling or enclosure changes around moulting.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('hydration', 'Hydration or environmental stress', ['marked inactivity', 'persistent abnormal posture', 'obvious signs of dehydration or environmental distress'], ['inappropriate moisture', 'heat stress', 'lack of safe hydration route'], 'Use species-specific environmental evidence and do not rely on one humidity target across arachnids.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('injury', 'Trauma', ['loss of appendage function', 'visible injury', 'unexpected bleeding or severe structural damage'], ['unsafe enclosure height/structure', 'falls', 'aggressive cohabitation'], 'Use secure species-appropriate structure and do not cohouse without verified evidence.', 'prompt-vet', { basis: 'ecology-only' }),
  ],
  insect: [
    healthWatch('moult', 'Moulting or metamorphic failure', ['incomplete moult', 'deformity after emergence', 'failure to progress through expected lifecycle stages'], ['poor humidity/moisture', 'insufficient space or structure', 'nutritional mismatch'], 'Stabilise the lifecycle environment and use species-specific developmental evidence.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('environment', 'Environmental stress', ['persistent inactivity', 'unusual clustering or avoidance', 'unexpected mortality'], ['temperature or moisture instability', 'poor ventilation', 'contaminated media'], 'Keep environmental records and change one husbandry variable at a time when investigating a pattern.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('injury', 'Physical injury and cannibalism risk', ['missing limbs', 'body damage', 'unexpected aggression or feeding injury'], ['incompatible stocking', 'insufficient refugia', 'poor enclosure design'], 'Match density and social structure to the species lifecycle and ecology.', 'prompt-vet', { basis: 'ecology-only' }),
  ],
  myriapod: [
    healthWatch('substrate', 'Substrate or moisture-related decline', ['persistent inactivity', 'abnormal posture or movement', 'unexpected mortality'], ['unsuitable substrate', 'drying or waterlogging', 'contaminated media'], 'Use species-specific substrate and moisture evidence and replace contaminated media safely.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('moult', 'Moulting stress or failure', ['difficulty completing ecdysis', 'abnormal body segmentation after moult'], ['disturbance', 'poor moisture', 'insufficient substrate depth'], 'Provide stable substrate and undisturbed moulting refugia.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('injury', 'Physical injury', ['visible damage', 'loss of normal movement', 'unexplained mortality'], ['falls', 'cohabitation conflict', 'unsafe décor'], 'Use secure structure and species-appropriate housing density.', 'prompt-vet', { basis: 'ecology-only' }),
  ],
  mollusc: [
    healthWatch('shell', 'Shell and mineral-balance problems', ['shell damage', 'abnormal shell growth', 'persistent erosion or weakness'], ['unsuitable water or substrate chemistry', 'dietary mineral mismatch', 'physical trauma'], 'Use species-specific substrate/water and nutrition evidence; shell appearance alone is not a diagnosis.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('water', 'Aquatic water-quality stress', ['feeding change', 'abnormal movement', 'tissue retraction or unexplained mortality'], ['contaminants', 'unstable water chemistry', 'poor filtration/aeration'], 'Test and maintain the appropriate aquatic system rather than guessing from livestock appearance.', 'urgent-vet', { basis: 'ecology-only' }),
    healthWatch('desiccation', 'Desiccation or environmental stress', ['persistent inactivity', 'failure to maintain normal tissue hydration'], ['inappropriate moisture', 'poor access to suitable microclimates'], 'Use species-specific moisture guidance and provide safe retreat zones.', 'prompt-vet', { basis: 'ecology-only' }),
  ],
  crustacean: [
    healthWatch('water-quality', 'Water-quality or oxygenation stress', ['rapid changes in activity', 'abnormal movement', 'unexpected mortality'], ['poor water quality', 'inadequate oxygenation', 'system instability'], 'Test and record water quality and maintain dependable filtration/oxygenation.', 'urgent-vet', { basis: 'class-level', sourceIds: ['oataFreshwater2026', 'oataMarine2026'], caveat: 'OATA sources are fish/aquarium references, so this is supporting aquatic-system guidance rather than a crustacean-specific medical reference.' }),
    healthWatch('moult', 'Moulting problems', ['failed or incomplete moult', 'persistent weakness around moulting', 'physical damage'], ['insufficient shelter', 'environmental instability', 'species-inappropriate chemistry'], 'Provide protected moulting areas and use species-specific chemistry/evidence.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('injury', 'Trauma or compatibility injury', ['visible appendage/body damage', 'repeated conflict', 'loss of normal movement'], ['predation', 'incompatible tank-mates', 'poor habitat structure'], 'Plan tank-mates and habitat around species compatibility and refuge needs.', 'prompt-vet', { basis: 'ecology-only' }),
  ],
  mammal: [
    healthWatch('condition-nutrition', 'Body-condition and nutritional problems', ['persistent weight gain/loss', 'reduced appetite', 'poor body condition'], ['imbalanced diet', 'food selectivity', 'inadequate exercise/enrichment'], 'Use a complete species-appropriate diet and record condition trends rather than reacting to a single weight.', 'prompt-vet', { basis: 'general-veterinary', sourceIds: ['merckExoticNutrition2025'] }),
    healthWatch('respiratory', 'Respiratory or air-quality concerns', ['changed breathing', 'nasal discharge', 'reduced activity'], ['poor ventilation', 'dust/fumes', 'infectious exposure'], 'Maintain clean air and appropriate bedding/substrate and seek veterinary assessment for persistent respiratory changes.', 'prompt-vet', { basis: 'general-veterinary', sourceIds: ['merckExoticNutrition2025'] }),
    healthWatch('dental', 'Dental or oral problems where taxonomically relevant', ['reduced food intake', 'drooling or oral wetness', 'difficulty chewing', 'change in food preferences'], ['species-specific tooth growth', 'poor diet structure', 'oral disease'], 'Treat dental monitoring as conditional by taxon and use a species-experienced veterinarian.', 'prompt-vet', { basis: 'general-veterinary' }),
  ],
  bird: [
    healthWatch('nutrition-obesity', 'Nutritional imbalance or obesity', ['persistent weight change', 'body-condition change', 'selective feeding', 'reduced exercise'], ['seed-heavy or unbalanced diet', 'food selection', 'low activity'], 'Use a balanced species-appropriate diet and monitor body condition; avoid indiscriminate supplementation.', 'prompt-vet', { sourceIds: ['merckBirdManagement2026', 'merckBirdOverview2026'], basis: 'general-veterinary' }),
    healthWatch('respiratory', 'Respiratory disease or inhaled toxin exposure', ['changed respiratory effort', 'nasal discharge', 'persistent tail movement with breathing', 'exercise intolerance'], ['smoke', 'aerosols/fumes', 'poor air quality', 'infection'], 'Keep the bird’s air environment clean and treat respiratory changes as clinically important.', 'urgent-vet', { sourceIds: ['merckBirdManagement2026'], basis: 'general-veterinary' }),
    healthWatch('feather-feet', 'Feather, skin and foot problems', ['feather damage or plucking', 'foot wear/callus/ulceration', 'abnormal beak or nail growth'], ['poor diet', 'inadequate perches', 'stress or behavioural problems'], 'Provide varied appropriate perches and enrichment and investigate persistent changes.', 'prompt-vet', { sourceIds: ['merckBirdManagement2026', 'aavBirdOwners2026'], basis: 'general-veterinary' }),
    healthWatch('behaviour', 'Behavioural and welfare decline', ['loss of normal interaction', 'repetitive abnormal behaviour', 'marked change in activity or sleep'], ['social mismatch', 'limited flight/exercise', 'poor enrichment'], 'Use a species-appropriate social, flight and enrichment plan and seek veterinary review where behavioural change may indicate illness.', 'prompt-vet', { sourceIds: ['merckBirdOverview2026', 'aavBirdOwners2026'], basis: 'general-veterinary' }),
  ],
  fish: [
    healthWatch('water-quality', 'Water-quality related illness/stress', ['rapid breathing or abnormal opercular movement', 'white spots or other abnormal growths', 'fin/scale changes', 'feeding change'], ['ammonia/nitrite or other water-quality problems', 'unstable chemistry', 'overstocking'], 'Test water before assuming a fish disease and keep a record of results and corrective actions.', 'urgent-vet', { sourceIds: ['oataFreshwater2026', 'oataMarine2026'], basis: 'class-level' }),
    healthWatch('infection-parasites', 'Infectious or parasitic disease', ['lesions', 'abnormal swimming', 'progressive condition loss', 'unexplained mortality'], ['new fish', 'poor quarantine', 'system stress'], 'Quarantine additions where appropriate and seek aquatic-veterinary diagnosis rather than treating blindly.', 'prompt-vet', { sourceIds: ['oataTraining2026'], basis: 'class-level' }),
    healthWatch('nutrition', 'Nutritional or condition problems', ['persistent appetite change', 'weight/condition decline', 'abnormal growth'], ['inappropriate diet', 'overfeeding/underfeeding', 'dietary mismatch'], 'Use diet appropriate to the species and life stage and monitor condition trends.', 'prompt-vet', { sourceIds: ['oataTraining2026', 'merckExoticNutrition2025'], basis: 'class-level' }),
  ],
  cephalopod: [
    healthWatch('water-quality', 'Rapid-onset water-system stress', ['sudden colour/behaviour change', 'abnormal activity', 'feeding cessation', 'unexpected mortality'], ['oxygenation failure', 'ammonia/nitrite or other chemistry problems', 'filtration failure'], 'Treat environmental failure as an operational emergency and verify system conditions immediately.', 'urgent-vet', { basis: 'ecology-only' }),
    healthWatch('injury', 'Soft-tissue or enclosure trauma', ['visible mantle/appendage injury', 'loss of normal movement', 'repeated contact with unsafe equipment'], ['sharp décor', 'insecure equipment', 'aggressive tank-mates'], 'Use smooth, escape-resistant equipment and inspect the system before introducing the animal.', 'prompt-vet', { basis: 'ecology-only' }),
    healthWatch('nutrition', 'Feeding and condition decline', ['persistent refusal to feed', 'body-condition loss', 'loss of normal feeding behaviour'], ['species-inappropriate prey', 'poor prey quality', 'environmental stress'], 'Use specialist dietary evidence and seek prompt veterinary/aquatic-expert input for sustained appetite change.', 'urgent-vet', { basis: 'ecology-only' }),
  ],
};

const GENUS_EMPHASIS: Record<string, string> = {
  Heterodon: 'Genus emphasis: terrestrial/fossorial snake architecture; preserve secure cover, substrate choice and low-disturbance retreat access.',
  Pantherophis: 'Genus emphasis: terrestrial or semi-arboreal colubrid architecture; provide secure ground cover plus usable climbing structure where species ecology supports it.',
  Lampropeltis: 'Genus emphasis: terrestrial/secretive colubrid architecture; prioritise secure retreats, escape control and species-appropriate cohabitation decisions.',
  Pituophis: 'Genus emphasis: terrestrial burrowing/exploratory snake architecture; provide secure substrate and strong environmental choice without assuming one humidity target.',
  Python: 'Genus emphasis: species-dependent terrestrial, semi-arboreal or arboreal python architecture; enclosure design must follow the individual species and size.',
  Boa: 'Genus emphasis: species-dependent terrestrial/arboreal boa architecture; provide secure retreats and climbing/ground structure according to species ecology.',
  Morelia: 'Genus emphasis: many taxa use climbing structure; select enclosure architecture from the species’ recorded lifestyle rather than the genus name alone.',
  Corallus: 'Genus emphasis: arboreal architecture; prioritise secure elevated perches, retreat choice and escape-resistant access.',
  Eunectes: 'Genus emphasis: large semi-aquatic architecture; aquatic access, filtration and substantial secure enclosure design are species-critical.',
  Bitis: 'Genus emphasis: specialist venomous viper husbandry; escape-proof housing, secure handling protocols and specialist veterinary access are mandatory planning concerns.',
  Bothrops: 'Genus emphasis: specialist venomous viper husbandry; use professional-grade containment and a documented emergency/antivenom-access plan appropriate to jurisdiction.',
  Trimeresurus: 'Genus emphasis: specialist arboreal pit-viper architecture; provide secure elevated structure and professional handling controls.',
  Crotalus: 'Genus emphasis: specialist venomous rattlesnake husbandry; professional containment and legal review are required before keeping.',
  Naja: 'Genus emphasis: specialist venomous elapid husbandry; professional containment, emergency planning and legal review are required.',
  Dendroaspis: 'Genus emphasis: specialist venomous arboreal/surface-active elapid husbandry; use professional-grade containment and handling protocols.',
  Ophiophagus: 'Genus emphasis: specialist large venomous snake husbandry; professional facilities, containment and legal/veterinary planning are required.',
  Chamaeleo: 'Genus emphasis: arboreal lizard architecture; ventilation, usable vertical structure and stable environmental microclimates are central design considerations.',
  Furcifer: 'Genus emphasis: arboreal chameleon architecture; vertical structure, ventilation, hydration and species-specific lighting require specialist evidence.',
  Pogona: 'Genus emphasis: terrestrial agamid architecture; provide strong ground structure and species-appropriate thermal/light planning.',
  Eublepharis: 'Genus emphasis: terrestrial gecko architecture with secure ground retreats; avoid blindly importing care from arboreal geckos.',
  Correlophus: 'Genus emphasis: arboreal gecko architecture; vertical structure, secure foliage/cover and species-appropriate moisture management are central.',
  Varanus: 'Genus emphasis: active monitor-lizard architecture; enclosure scale, climbing/digging options, thermal design and enrichment must match the individual species.',
  Tiliqua: 'Genus emphasis: terrestrial skink architecture; usable ground space, secure shelter and species-specific diet are priorities.',
  Testudo: 'Genus emphasis: terrestrial tortoise architecture; outdoor/indoor system choice, grazing resources and shell/UV-light management are species-specific.',
  Trachemys: 'Genus emphasis: aquatic turtle architecture; large managed aquatic systems, basking access, filtration and legal/invasive-species checks are important.',
  Ambystoma: 'Genus emphasis: amphibian life-stage planning is critical; aquatic and terrestrial requirements can differ markedly between species and life stages.',
  Xenopus: 'Genus emphasis: fully aquatic amphibian system; water quality, filtration, temperature and disease biosecurity require close control.',
  Ceratophrys: 'Genus emphasis: terrestrial sit-and-wait frog architecture; provide suitable substrate, cover and stable moisture without unnecessary disturbance.',
  Brachypelma: 'Genus emphasis: terrestrial tarantula architecture; deep substrate, secure retreat and moult-safe management are priorities.',
  Tliltocatl: 'Genus emphasis: terrestrial tarantula architecture; prioritise secure substrate and undisturbed moulting rather than frequent handling.',
  Grammostola: 'Genus emphasis: generally terrestrial tarantula architecture; exact moisture and substrate remain species-dependent.',
  Avicularia: 'Genus emphasis: arboreal tarantula architecture; vertical climbing structure and ventilation are central, with species-specific moisture evidence required.',
  Caribena: 'Genus emphasis: arboreal tarantula architecture; provide secure vertical structure and well-managed moisture/ventilation.',
  Poecilotheria: 'Genus emphasis: specialist arboreal tarantula architecture; secure vertical structure and escape-resistant containment are high priorities.',
  Theraphosa: 'Genus emphasis: large specialist tarantula architecture; space, moisture management, ventilation and secure access require advanced evidence.',
  Scolopendra: 'Genus emphasis: predatory centipede architecture; escape-resistant terrestrial housing, secure substrate and safe feeding practices are essential.',
  Archispirostreptus: 'Genus emphasis: decomposer millipede architecture; deep organic substrate and stable moisture/ventilation are core planning variables.',
  Odontotaenius: 'Genus emphasis: wood-associated beetle architecture; lifecycle substrate, food resources and humidity require species-specific evidence.',
  Blaptica: 'Genus emphasis: feeder cockroach colony architecture; lifecycle housing, diet, ventilation and escape control are more important than pet-style display housing.',
  Mantis: 'Genus emphasis: predatory mantid architecture; vertical resting/moult structure, ventilation and secure prey delivery are priorities.',
  Chinchilla: 'Genus emphasis: cool, well-ventilated mammal housing with dust-bath/enrichment planning; thermal stress prevention is especially important.',
  Octodon: 'Genus emphasis: social rodent architecture; companion structure, exercise, gnawing outlets and diet need to be planned together.',
  Petaurus: 'Genus emphasis: social arboreal mammal architecture; vertical movement, companionship and nocturnal enrichment are central.',
  Atelerix: 'Genus emphasis: solitary small-mammal architecture; ground exercise, hides and diet/condition monitoring are key.',
  Mustela: 'Genus emphasis: active carnivorous mammal architecture; secure escape-resistant housing and substantial enrichment/exercise are required.',
  Melopsittacus: 'Genus emphasis: highly active social bird architecture; flight opportunity, social contact, foraging and balanced nutrition are central.',
  Nymphicus: 'Genus emphasis: social flight-capable bird architecture; varied perches, exercise, foraging and balanced diet are core.',
  Psittacus: 'Genus emphasis: intelligent social parrot architecture; flight/exercise, foraging, social needs and safe chewing material are central.',
  Ara: 'Genus emphasis: large parrot architecture; substantial flight/exercise, heavy-duty enrichment and specialist avian nutrition are required.',
  Cacatua: 'Genus emphasis: highly social intelligent parrot architecture; social contact, foraging, chewing and flight/exercise need deliberate planning.',
  Serinus: 'Genus emphasis: small passerine architecture; flight space, species-appropriate seed/formulated diet and bathing/foraging opportunities require evidence-led design.',
  Taeniopygia: 'Genus emphasis: active social finch architecture; usable flight space, compatible grouping and balanced diet are priorities.',
  Betta: 'Genus emphasis: freshwater labyrinth-fish architecture; warm stable water, low-stress cover and species-appropriate flow require evidence.',
  Poecilia: 'Genus emphasis: livebearer aquarium architecture; water chemistry, group structure and sustainable stocking are key.',
  Symphysodon: 'Genus emphasis: specialist cichlid aquarium architecture; stable warm water, social structure and high-quality nutrition require close management.',
  Pterophyllum: 'Genus emphasis: tall-bodied cichlid architecture; vertical swimming space, compatible grouping and stable water quality matter.',
  Astronotus: 'Genus emphasis: large cichlid architecture; substantial mature system capacity, filtration and compatible tank-mate planning are essential.',
  Corydoras: 'Genus emphasis: bottom-oriented freshwater fish architecture; appropriate substrate, group structure and water quality should drive system design.',
  Hippocampus: 'Genus emphasis: specialist seahorse marine architecture; secure holdfasts, suitable flow, live/appropriate foods and excellent water quality require specialist evidence.',
  Amphiprion: 'Genus emphasis: marine clownfish architecture; species-compatible hosting/structure, stable marine chemistry and tank-mate planning are important.',
  Paracanthurus: 'Genus emphasis: active marine tang architecture; mature swimming space, grazing opportunities and high-quality marine system maintenance are essential.',
  Octopus: 'Genus emphasis: specialist cephalopod architecture; escape-proofing, stable marine chemistry, high oxygenation and frequent monitoring are critical.',
  Sepia: 'Genus emphasis: specialist cuttlefish architecture; mature marine system, suitable substrate, prey supply and escape prevention require expert evidence.',
  Hapalochlaena: 'Genus emphasis: medically hazardous cephalopod architecture; specialist professional containment, risk management and legal review are required.',
};

function evidence(
  species: UniversalSpeciesRecord,
  basis: UniversalCareBasis,
  sourceIds: string[],
  caveat?: string,
): UniversalCareEvidence {
  return {
    basis,
    sourceIds,
    caveat: caveat ?? CLASS_CAVEATS[species.className],
    reviewedOn: REVIEWED_ON,
  };
}

function resolveRequirement(
  species: UniversalSpeciesRecord,
  template: RequirementTemplate,
): UniversalCareRequirement {
  return {
    id: template.id,
    domain: template.domain,
    label: template.label,
    guidance: template.guidance,
    priority: template.priority,
    ...(template.conditional ? { conditional: template.conditional } : {}),
    evidence: evidence(
      species,
      template.basis ?? CLASS_BASIS[species.className],
      template.sourceIds ?? CLASS_SOURCE_IDS[species.className],
      template.caveat,
    ),
  };
}

function resolveHealthWatch(
  species: UniversalSpeciesRecord,
  template: HealthTemplate,
): UniversalHealthWatch {
  return {
    id: template.id,
    concern: template.concern,
    watchFor: template.watchFor,
    riskFactors: template.riskFactors,
    prevention: template.prevention,
    priority: template.priority,
    evidence: evidence(
      species,
      template.basis ?? CLASS_BASIS[species.className],
      template.sourceIds ?? CLASS_SOURCE_IDS[species.className],
      template.caveat,
    ),
  };
}

function buildHealth(species: UniversalSpeciesRecord, scopeKey: string): UniversalHealthProfile {
  const watches = CLASS_HEALTH_WATCHES[species.className].map((item) => resolveHealthWatch(species, item));
  const baseline = [
    'Know the individual’s normal appetite/feeding pattern, activity and body condition.',
    'Track meaningful environmental changes alongside health observations so patterns can be investigated rather than guessed at.',
    'Persistent, progressive or severe change should be assessed by a veterinarian familiar with the animal group and species where possible.',
  ];

  if (species.className === 'fish' || species.className === 'crustacean' || species.className === 'cephalopod' || species.lifestyle.includes('aquatic') || species.lifestyle.includes('semi-aquatic')) {
    baseline.push('Water quality and system stability are part of the animal’s health record, not just an enclosure setting.');
  }

  if (species.className === 'amphibian' || species.className === 'reptile') {
    baseline.push('Quarantine and collection biosecurity should be treated as preventive medicine, especially when adding animals.');
  }

  if (species.className === 'bird' || species.className === 'mammal') {
    baseline.push('Changes in weight, eating, breathing, faeces/urine, behaviour or grooming can be useful early signals and should be recorded in context.');
  }

  return {
    status: CLASS_SOURCE_IDS[species.className].length > 0 ? 'sourced-profile' : 'needs-review',
    scopeKey,
    baseline,
    watches,
    quarantine: {
      guidance: species.className === 'amphibian'
        ? 'Use a risk-assessed quarantine plan with collection separation and dedicated equipment where practical; amphibian pathogen control deserves particular attention.'
        : 'Use a risk-assessed quarantine plan appropriate to the species, source and existing collection. The exact duration and diagnostics should be species- and risk-specific.',
      separateTools: true,
      separateEquipment: true,
      sourceIds: species.className === 'amphibian' ? ['merckAmphibianHusbandry2026'] : species.className === 'reptile' ? ['merckReptileHusbandry2026'] : [],
    },
    veterinary: {
      guidance: 'Identify an appropriately experienced exotic, aquatic, avian or invertebrate veterinarian before acquisition where practical.',
      speciesSpecificVetRecommended: species.riskClass === 'venomous' || species.riskClass === 'high-risk' || species.riskClass === 'toxic' || species.className === 'cephalopod',
      emergencyNote: 'This profile is not a diagnosis. A rapidly deteriorating animal, severe trauma, major respiratory change, poisoning concern or collection-level disease event warrants prompt professional assessment.',
    },
    unresolved: species.className === 'cephalopod'
      ? ['Species-specific marine chemistry, nutrition and veterinary references.', 'Species-specific legal and risk controls.']
      : ['Species-specific numeric targets where applicable.', 'Species-specific disease lists and diagnostics.', 'Locality, life-stage and captive-history refinements.'],
    sourceIds: [...new Set(watches.flatMap((watch) => watch.evidence.sourceIds))],
    reviewedOn: REVIEWED_ON,
  };
}

export function buildUniversalSpeciesCare(species: UniversalSpeciesRecord): UniversalSpeciesCare {
  const genusNote = GENUS_EMPHASIS[species.genus];
  const classRequirements = CLASS_REQUIREMENTS[species.className].map((item) => resolveRequirement(species, item));
  const requirements = genusNote
    ? [
        ...classRequirements,
        {
          id: 'genus-emphasis',
          domain: 'housing',
          label: 'Genus-level design emphasis',
          guidance: genusNote,
          priority: 'important' as const,
          evidence: evidence(species, 'genus-level', [], 'Ecology-derived genus emphasis only. This is not a substitute for species-specific captive evidence and must not be converted into an exact numeric target.'),
        },
      ]
    : classRequirements;

  const scopeKey = genusNote ? `genus:${species.genus}` : `class:${species.className}`;
  const husbandry: UniversalHusbandryProfile = {
    status: CLASS_SOURCE_IDS[species.className].length > 0 ? 'sourced-profile' : 'needs-review',
    scopeKey,
    title: `${species.commonNames[0] ?? species.acceptedScientificName} — baseline husbandry`,
    overview: CLASS_CAVEATS[species.className],
    ecologyContext: {
      className: species.className,
      lifestyle: species.lifestyle,
      dietaryGuild: species.dietaryGuild,
    },
    requirements,
    numericGuidance: {
      available: false,
      note: 'No universal numeric target is generated here. Species-specific ranges must come from a mapped evidence scope and remain separate from class/genus baseline guidance.',
    },
    unresolved: [
      'Species-specific numeric temperature/humidity/water-chemistry targets where applicable.',
      'Species-specific enclosure-size and lighting calculations where applicable.',
      'Species-specific feeding quantity/frequency and supplementation.',
      'Species-specific breeding and life-stage refinements.',
    ],
    sourceIds: [...new Set(requirements.flatMap((item) => item.evidence.sourceIds))],
    reviewedOn: REVIEWED_ON,
  };

  const health = buildHealth(species, scopeKey);
  const resolvedFrom = [
    genusNote ? `genus:${species.genus}` : `class:${species.className}`,
    `class:${species.className}`,
    species.taxonSourceId,
  ];

  if (species.knowledgeBridge === 'snake-profile') {
    resolvedFrom.unshift(`species:${species.id}`);
  }

  return {
    status: husbandry.status,
    resolvedFrom,
    husbandry,
    health,
    summary: 'A structured baseline is available for this record. Species-specific evidence should override inherited requirements where the biology, locality, life stage or captive-management literature calls for it.',
  };
}

export function attachUniversalSpeciesCare(
  species: UniversalSpeciesRecord,
): UniversalSpeciesRecord {
  return { ...species, care: buildUniversalSpeciesCare(species) };
}
