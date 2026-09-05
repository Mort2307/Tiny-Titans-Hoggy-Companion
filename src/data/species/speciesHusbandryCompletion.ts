import type { EvidenceLevel, EvidenceScope, GuidanceBasis, HusbandryProfile, NumericRange, SnakeSpeciesRecord } from './speciesTypes';
import { SPECIES_SOURCES } from './speciesSources';

const reviewedOn = '2026-09-05';

const scope = (
  basis: GuidanceBasis,
  sourceIds: string[],
  scopeText: string,
  caveat: string,
): EvidenceScope => ({ basis, sourceIds, scope: scopeText, caveat, reviewedOn });

const range = (
  min: number,
  max: number,
  unit: string,
  context: string,
  evidence: EvidenceScope,
): NumericRange & { evidence: EvidenceScope } => ({ min, max, unit, context, evidence });

const hasOwnHusbandry = (species: SnakeSpeciesRecord): boolean => Boolean(species.knowledge.husbandry);

/**
 * Evidence policy for taxonomy-first records:
 *
 * 1. Never invent a numeric target from ecology alone.
 * 2. Prefer species/locality evidence.
 * 3. Where only a documented taxon/genus/group framework exists, expose that framework
 *    explicitly as such and preserve its scope/caveat.
 * 4. General veterinary guidance is comparative context, never silently species-specific.
 * 5. Community submissions must remain observations and are not promoted by this layer.
 */
function buildScopedFramework(species: SnakeSpeciesRecord): HusbandryProfile {
  const id = species.id;
  const genus = species.genus;
  const family = species.family;

  if (id === 'python-brongersmai') {
    const evidence = scope('species-specific', ['reptifilesBloodPython2017'], 'Python brongersmai / Blood Python', 'The source is a secondary keeper reference and does not establish a controlled experimental range; use the range as documented keeper guidance and maintain a real gradient.');
    return {
      evidenceLevel: 'limited',
      evidenceSummary: evidence,
      temperature: {
        warmSide: range(29, 31, '°C', 'warm area', evidence),
        coolSide: range(24, 27, '°C', 'cool area', evidence),
        basking: range(30, 32, '°C', 'basking surface', evidence),
        night: range(23, 25, '°C', 'night range', evidence),
        notes: 'Documented keeper guidance for Blood Python supports a warm/cool gradient rather than one enclosure-wide temperature. Exact targets vary between sources and individual setups, so measure the actual thermal gradient.',
      },
      humidity: {
        target: range(60, 75, '% RH', 'general enclosure baseline', evidence),
        notes: 'Documented guidance commonly uses elevated humidity with clean water, a humid retreat and strong ventilation. Avoid stagnant, persistently wet substrate or air.',
      },
      enclosure: baseEnclosure(species, ['moisture-buffering forest substrate', 'coconut/soil-style substrate', 'cypress mulch where appropriate'], 'Secure warm and cool hides sized for a heavy-bodied animal; visual cover is important.', false, 'Clean, stable water dish large enough for drinking and appropriate soaking; prevent fouling.', ['secure hides', 'deep/structured substrate', 'leaf litter/visual cover']),
      cohabitation: singleHousing(),
    };
  }

  if (id === 'python-curtus') {
    const evidence = scope('species-specific', ['herpetonPythonCurtus2026'], 'Python curtus / Sumatran Short-tailed Python', 'Current Herpeton Academy guidance is species-specific keeper guidance; it should be treated as practical evidence rather than controlled experimental proof.');
    return {
      evidenceLevel: 'moderate',
      evidenceSummary: evidence,
      temperature: {
        warmSide: range(29, 31, '°C', 'warm hide/area', evidence),
        coolSide: range(24, 26, '°C', 'cool side', evidence),
        night: range(23, 25, '°C', 'night range', evidence),
        notes: 'Keep the gradient measurable at the actual animal-use surfaces and retreats.',
      },
      humidity: { target: range(60, 75, '% RH', 'general baseline', evidence), notes: 'Humidity should be paired with ventilation, clean water and drying substrate; constant wetness is not the goal.' },
      enclosure: baseEnclosure(species, ['deep moisture-buffering substrate', 'coconut/soil-style tropical mix', 'leaf litter'], 'Provide secure warm/cool retreats and substantial visual cover.', false, 'Clean stable water dish with safe soaking access.', ['secure hides', 'covered substrate', 'humid retreat']),
      cohabitation: singleHousing(),
    };
  }

  if (id === 'aspidites-melanocephalus') {
    const evidence = scope('species-specific', ['reptinodeBlackHeadedPython2026'], 'Aspidites melanocephalus / Black-headed Python', 'Current keeper-facing species reference. It is practical captive guidance, not a controlled physiological study.');
    return {
      evidenceLevel: 'moderate',
      evidenceSummary: evidence,
      temperature: {
        basking: range(35, 40, '°C', 'basking surface', evidence),
        warmSide: range(31, 34, '°C', 'warm area', evidence),
        coolSide: range(24, 28, '°C', 'cool side', evidence),
        night: range(22, 24, '°C', 'night range', evidence),
        notes: 'Use guarded heat sources and measure the surface/burrow temperatures. The source specifically cautions that the species lacks labial heat pits and therefore heat sources require careful guarding.',
      },
      humidity: { target: range(40, 60, '% RH', 'general baseline', evidence), notes: 'Provide a humid retreat during shedding while keeping the overall enclosure capable of drying.' },
      enclosure: baseEnclosure(species, ['aspen', 'cypress mulch', 'coco chips', 'paper for quarantine'], 'At least one secure retreat at each end of the gradient; floor space and burrowing opportunities matter.', false, 'Large stable clean water dish available at all times.', ['deep burrowing substrate', 'cork/bark', 'ground cover', 'secure hides']),
      cohabitation: singleHousing(),
    };
  }

  if (id === 'simalia-boeleni') {
    const evidence = scope('species-specific', ['reptitalkBoelensPython2016'], "Simalia boeleni / Boelen's Python", 'This is a detailed experienced-keeper account. It is useful documented husbandry evidence but should not be represented as a controlled consensus standard.');
    return {
      evidenceLevel: 'limited',
      evidenceSummary: evidence,
      temperature: {
        basking: range(35, 38, '°C', 'basking access described for established animals', evidence),
        coolSide: range(18, 20, '°C', 'cooler enclosure area', evidence),
        night: range(20, 22, '°C', 'night range', evidence),
        notes: 'The published keeper account describes distinct cooler areas and warmer basking access. This should be treated as a documented husbandry account, not a universal prescription.',
      },
      humidity: { target: range(60, 80, '% RH', 'humid but ventilated enclosure', evidence), notes: 'The source explicitly stresses humid air without stagnant air.' },
      enclosure: baseEnclosure(species, ['moisture-buffering forest substrate', 'bark/leaf-litter style cover'], 'Provide both elevated and terrestrial retreats with strong structural security.', true, 'Clean shallow water source for juveniles and appropriately scaled water for adults.', ['elevated perches', 'cork', 'dense cover', 'secure retreats']),
      cohabitation: singleHousing(),
    };
  }

  if (id === 'leiopython-albertisii') {
    const evidence = scope('species-specific', ['faunaExoticaWhiteLipped2006'], 'Leiopython albertisii / Northern White-lipped Python', 'Long-running keeper report with explicit temperatures and humidity; practical evidence is labelled as limited because it is not a controlled study.');
    return {
      evidenceLevel: 'limited',
      evidenceSummary: evidence,
      temperature: {
        warmSide: range(30, 34, '°C', 'daytime warm area', evidence),
        night: range(20, 22, '°C', 'night range', evidence),
        notes: 'The source describes a generally warm daytime environment and cooler nights. The animals reportedly seek dark, cooler shelters rather than basking continuously.',
      },
      humidity: { target: range(70, 85, '% RH', 'reported captive baseline', evidence), notes: 'This is the reported keeper baseline. Preserve airflow and avoid saturated, dirty substrate.' },
      enclosure: baseEnclosure(species, ['deep forest-style substrate', 'leaf litter', 'moisture-buffering tropical mix'], 'Provide dark, secure terrestrial retreats and allow the animal to select cooler shelter.', false, 'Stable clean water dish, with soaking access only when appropriate to the setup and individual.', ['deep cover', 'leaf litter', 'multiple dark hides']),
      cohabitation: singleHousing(),
    };
  }

  if (id === 'antaresia-maculosa') {
    const evidence = scope('species-specific', ['reptifilesSpottedPython2026'], 'Antaresia maculosa / Spotted Python', 'Current species-specific keeper guidance; source explicitly notes wide successful humidity variation and the importance of a humid hide.');
    return {
      evidenceLevel: 'moderate',
      evidenceSummary: evidence,
      temperature: {
        notes: 'Use the established Antaresia thermal gradient already documented for this species record; humidity is intentionally not constrained to one artificial constant.',
      },
      humidity: { acceptable: range(20, 80, '% RH', 'ambient range reported as tolerated in captive care', evidence), notes: 'The source reports successful captive maintenance across a broad ambient humidity range and recommends a humid hide. This is not a recommendation to force the enclosure to either boundary.' },
      enclosure: baseEnclosure(species, ['aspen', 'paper-based', 'dry naturalistic substrate'], 'Secure ground and elevated retreats.', true, 'Stable clean water bowl.', ['branches', 'cork', 'rock/ground cover', 'humid retreat']),
      cohabitation: singleHousing(),
    };
  }

  if (id === 'elaphe-climacophora') {
    const evidence = scope('species-specific', ['austriaElapheClimacophora2020'], 'Elaphe climacophora / Japanese Rat Snake', 'Austrian federal animal-keeping standard. Legal minimum standards are not automatically equivalent to an optimal welfare prescription, so the source is presented as a documented regulatory benchmark.');
    return {
      evidenceLevel: 'high',
      evidenceSummary: evidence,
      temperature: {
        warmSide: range(22, 28, '°C', 'daytime general range', evidence),
        basking: range(28, 35, '°C', 'local warm/basking area', evidence),
        night: range(18, 22, '°C', 'night range', evidence),
        notes: 'The Austrian standard allows a local temperature up to 35°C and requires a daytime range of 22–28°C during the active period.',
      },
      humidity: { target: range(50, 80, '% RH', 'regulatory benchmark', evidence), notes: 'The same standard specifies a moist substrate section and seasonal overwintering based on origin.' },
      enclosure: baseEnclosure(species, ['peat/soil', 'peat-sand mix', 'earth'], 'Provide secure hiding places and climbing structure appropriate to an active rat snake.', true, 'Water basin for drinking.', ['wood/stone retreats', 'secure branches', 'seasonal cover']),
      cohabitation: singleHousing(),
    };
  }

  if (id === 'lampropeltis-getula' || genus === 'Lampropeltis') {
    const evidence = scope('genus-level', ['rspcaKingsnake2026', 'reptifilesKingsnake2026'], 'Lampropeltis / kingsnake framework', 'The supporting sources cover kingsnakes as a group and explicitly note that optimal values can vary by species/subspecies. These numbers must therefore remain labelled as group guidance, not species-specific targets.');
    return {
      evidenceLevel: 'moderate',
      evidenceSummary: evidence,
      temperature: {
        basking: range(26, 30, '°C', 'basking zone; kingsnake group guidance', evidence),
        coolSide: range(21, 24, '°C', 'cool end; kingsnake group guidance', evidence),
        night: range(18, 18, '°C', 'documented safe night drop; kingsnake group guidance', evidence),
        notes: 'This is explicitly a Lampropeltis/kingsnake framework. Species, subspecies, locality and individual setup can require adjustment; measure both zones rather than using one average.',
      },
      humidity: { target: range(40, 60, '% RH', 'kingsnake group baseline', evidence), notes: 'ReptiFiles notes that optimal humidity may vary by subspecies; a humid retreat can create a local moisture gradient.' },
      enclosure: baseEnclosure(species, ['soil-style naturalistic substrate', 'coconut fibre', 'aspen/hemp where appropriate'], 'At least one snug retreat at each end of the thermal gradient plus additional cover.', true, 'Water bowl large enough for drinking and species-appropriate soaking.', ['branches', 'leaf litter', 'multiple hides', 'humid retreat']),
      cohabitation: { recommendation: 'generally-single', rationale: 'RSPCA notes kingsnakes should generally be kept individually, including because they can prey on other snakes.' },
    };
  }

  if (genus === 'Thamnophis') {
    const evidence = scope('genus-level', ['rspcaGarterSnake2026'], 'Thamnophis / garter snake group', 'RSPCA guidance is explicitly written for Thamnophis species as a group. Individual species/locality ecology can differ, so these are group parameters rather than species-specific measurements.');
    return {
      evidenceLevel: 'moderate',
      evidenceSummary: evidence,
      temperature: {
        basking: range(28, 32, '°C', 'basking zone; garter-snake group guidance', evidence),
        coolSide: range(22, 24, '°C', 'cool end; garter-snake group guidance', evidence),
        night: range(16, 16, '°C', 'documented safe night drop; group guidance', evidence),
        notes: 'Use a real thermogradient and adjust for the species/locality when stronger evidence exists.',
      },
      humidity: { target: range(50, 60, '% RH', 'garter-snake group guidance', evidence), notes: 'Provide water and local humid areas while maintaining ventilation.' },
      enclosure: baseEnclosure(species, ['soil/naturalistic substrate', 'paper-based during quarantine'], 'Multiple hides, with cover arranged so the animal can thermoregulate without sacrificing security.', false, 'Stable clean water with species-appropriate soaking access.', ['vegetation/cover', 'multiple hides', 'water feature where safe']),
      cohabitation: { recommendation: 'conditional', rationale: 'RSPCA discusses multi-snake housing but requires additional space and resources; Tiny Titans therefore labels cohabitation conditional rather than universally social.' },
    };
  }

  if (genus === 'Pantherophis' || id === 'pituophis-catenifer') {
    const sourceIds = genus === 'Pantherophis' ? ['rspcaCornSnake2026', 'reptifilesBlackRatsnake2026', 'merckReptileHusbandry2025'] : ['reptifilesGopherSnake2026', 'merckReptileHusbandry2025'];
    const evidence = scope(genus === 'Pantherophis' ? 'taxon-level' : 'species-specific', sourceIds, genus === 'Pantherophis' ? 'Pantherophis / corn-and-rat-snake comparative framework' : 'Pituophis catenifer / gopher snake and bullsnake', genus === 'Pantherophis' ? 'Sources cover corn/rat snakes at group level and Pantherophis obsoletus specifically. Exact numbers must not be presented as universal Pantherophis species targets.' : 'The ReptiNode source is specifically for Pituophis catenifer; Merck provides comparative corn/rat-snake veterinary context.');
    return {
      evidenceLevel: genus === 'Pantherophis' ? 'moderate' : 'moderate',
      evidenceSummary: evidence,
      temperature: genus === 'Pantherophis' ? {
        basking: range(28, 30, '°C', 'basking; corn/rat-snake comparative guidance', evidence),
        warmSide: range(25, 30, '°C', 'POTZ/group veterinary framework', evidence),
        coolSide: range(20, 24, '°C', 'cool zone; RSPCA corn/rat-snake context', evidence),
        night: range(16, 20, '°C', 'documented night drop; RSPCA corn-snake context', evidence),
        notes: 'These figures deliberately combine only clearly labelled corn/rat-snake or Pantherophis sources. They are not asserted to be exact for every Pantherophis species.',
      } : {
        basking: range(30, 33, '°C', 'basking surface; Pituophis catenifer', evidence),
        warmSide: range(27, 30, '°C', 'warm area; Pituophis catenifer', evidence),
        coolSide: range(22, 25, '°C', 'cool side; Pituophis catenifer', evidence),
        night: range(18, 20, '°C', 'night range; Pituophis catenifer', evidence),
        notes: 'Species-specific Pituophis catenifer guidance is available; preserve locality/form context for bullsnake and gopher-snake records.',
      },
      humidity: { target: genus === 'Pantherophis' ? range(40, 70, '% RH', 'comparative corn/rat-snake framework', evidence) : range(30, 50, '% RH', 'Pituophis catenifer dry-to-moderate baseline', evidence), notes: genus === 'Pantherophis' ? 'Use the group range as a comparative framework and retain local humid-retreat options.' : 'Do not turn the broad Pituophis range into a rigid constant; provide local moisture options and normal seasonal variation.' },
      enclosure: baseEnclosure(species, ['soil-based naturalistic substrate', 'aspen/paper where appropriate'], retreatFor(species), true, waterFor(species), ['branches', 'ground cover', 'multiple hides']),
      cohabitation: singleHousing(),
    };
  }

  if (family === 'Pythonidae') {
    const evidence = scope('general-veterinary', ['merckReptileHusbandry2025', 'rspcaSnakeCare2026'], 'Pythonidae/general reptile husbandry framework', 'No exact numeric values are borrowed from another python species here. The general sources support measured thermogradients, thermostat control, ventilation, humidity management and husbandry monitoring only.');
    return {
      evidenceLevel: 'limited', evidenceSummary: evidence,
      temperature: { notes: 'No defensible species/taxon-specific numeric target is attached yet. General veterinary guidance supports a measured thermal gradient and thermostat-controlled heat, but does not justify borrowing another python species range.' },
      humidity: { notes: 'No defensible species/taxon-specific numeric target is attached yet. Maintain moisture appropriate to the recorded habitat while preserving ventilation and dry resting areas.' },
      enclosure: baseEnclosure(species, substrateFor(species), retreatFor(species), species.knowledge.lifestyle?.includes('arboreal') || species.knowledge.lifestyle?.includes('semi-arboreal') || false, waterFor(species), ['species-appropriate cover', 'multiple retreats']),
      cohabitation: singleHousing(),
    };
  }

  if (family === 'Boidae') {
    const evidence = scope('general-veterinary', ['merckReptileHusbandry2025', 'rspcaSnakeCare2026'], 'Boidae/general reptile husbandry framework', 'General veterinary guidance is provided as context only. Exact numbers are withheld unless a species/locality source has been mapped.');
    return {
      evidenceLevel: 'limited', evidenceSummary: evidence,
      temperature: { notes: 'No defensible species-specific numeric target is attached yet. Use a measured gradient and species/locality evidence as it becomes available.' },
      humidity: { notes: 'No defensible species-specific numeric target is attached yet. Match moisture to the documented habitat with ventilation and a usable dry retreat.' },
      enclosure: baseEnclosure(species, substrateFor(species), retreatFor(species), species.knowledge.lifestyle?.includes('arboreal') || species.knowledge.lifestyle?.includes('semi-arboreal') || false, waterFor(species), ['secure retreats', 'visual cover']),
      cohabitation: singleHousing(),
    };
  }

  const evidence = scope('general-veterinary', ['merckReptileHusbandry2025', 'rspcaSnakeCare2026'], 'General snake/reptile husbandry framework', 'No species-specific numeric parameter was verified for this record during the current evidence pass. General husbandry principles are shown only as principles, not as borrowed species values.');
  return {
    evidenceLevel: 'limited', evidenceSummary: evidence,
    temperature: { notes: 'No defensible species-specific numeric target is attached yet. Use a measured thermal gradient, thermostat control and locality/species evidence as it becomes available.' },
    humidity: { notes: 'No defensible species-specific numeric target is attached yet. Use habitat-informed moisture management with strong ventilation and a dry resting option.' },
    enclosure: baseEnclosure(species, substrateFor(species), retreatFor(species), species.knowledge.lifestyle?.includes('arboreal') || species.knowledge.lifestyle?.includes('semi-arboreal') || false, waterFor(species), ['species-appropriate cover', 'multiple secure retreats']),
    cohabitation: singleHousing(),
  };
}

function singleHousing() {
  return { recommendation: 'generally-single' as const, rationale: 'Single housing is the conservative pet default unless species-specific evidence and a controlled breeding context support temporary pairing.' };
}

function substrateFor(species: SnakeSpeciesRecord): string[] {
  const lifestyle = new Set(species.knowledge.lifestyle ?? []);
  const text = `${species.knowledge.habitat ?? ''} ${species.knowledge.summary}`.toLowerCase();
  if (lifestyle.has('aquatic') || lifestyle.has('semi-aquatic')) return ['species-appropriate moisture-buffering substrate', 'soil/coconut-fibre or equivalent naturalistic mix', 'leaf litter where biologically appropriate'];
  if (lifestyle.has('fossorial') || lifestyle.has('semi-fossorial')) return ['deep burrowing substrate', 'low-dust soil/sand or wood-based blend suited to the species', 'leaf litter/cover where appropriate'];
  if (/desert|arid|semi-arid|dry scrub|rocky/.test(text)) return ['dry, low-dust naturalistic substrate', 'aspen/paper substrate where appropriate to the species', 'localised humid-retreat substrate when required'];
  if (lifestyle.has('arboreal') || lifestyle.has('semi-arboreal')) return ['moisture-buffering forest substrate', 'coconut fibre/soil-style mix', 'leaf litter or bark where appropriate'];
  return ['species-appropriate low-dust substrate', 'paper-based or naturalistic substrate selected for the species', 'substrate depth matched to normal behaviour'];
}

function retreatFor(species: SnakeSpeciesRecord): string {
  const lifestyle = new Set(species.knowledge.lifestyle ?? []);
  if (lifestyle.has('arboreal') || lifestyle.has('semi-arboreal')) return 'Provide secure terrestrial and elevated retreats, with cover positioned across the usable thermal and humidity gradients.';
  if (lifestyle.has('fossorial') || lifestyle.has('semi-fossorial')) return 'Provide multiple snug ground retreats plus sufficient substrate depth for normal hiding and burrowing behaviour.';
  return 'Provide secure warm and cool retreats plus visual cover so the snake can choose exposure and shelter without remaining exposed.';
}

function waterFor(species: SnakeSpeciesRecord): string {
  const lifestyle = new Set(species.knowledge.lifestyle ?? []);
  if (lifestyle.has('aquatic') || lifestyle.has('semi-aquatic')) return 'Provide reliable access to clean water with safe entry/exit and drainage scaled to the animal and enclosure. Aquatic access must not compromise hygiene or enclosure security.';
  return 'Provide clean drinking water in a stable dish at all times, with the size and placement appropriate to the species and enclosure design.';
}

function baseEnclosure(species: SnakeSpeciesRecord, substrate: string[], hides: string, climbing: boolean, water: string, enrichment: string[]) {
  return {
    habitatType: species.knowledge.lifestyle,
    substrate,
    hides,
    climbing,
    water,
    ventilation: 'Provide reliable cross-ventilation appropriate to the enclosure volume. Humidity must never be maintained by trapping stagnant air or permanently wet substrate.',
    lighting: 'Use a predictable day/night cycle with shaded retreats. UVB should only be represented as a species-supported recommendation; otherwise offer it as optional welfare enrichment with shade.',
    enrichment,
  };
}

export function completeSpeciesHusbandry(species: SnakeSpeciesRecord): SnakeSpeciesRecord {
  if (hasOwnHusbandry(species)) return species;

  const husbandry = buildScopedFramework(species);
  const sourceIds = Array.from(new Set([...(species.knowledge.sourceIds ?? []), ...(husbandry.evidenceSummary?.sourceIds ?? [])]));
  return {
    ...species,
    knowledge: {
      ...species.knowledge,
      husbandry,
      sourceIds,
      reviewedOn,
    },
  };
}
