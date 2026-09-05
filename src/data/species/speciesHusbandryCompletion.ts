import type { HusbandryProfile, SnakeSpeciesRecord } from './speciesTypes';

/**
 * Completes taxonomy-first species with an explicit, evidence-limited keeper framework.
 *
 * This is deliberately NOT a temperature/humidity shortcut. Exact numeric targets are
 * only stored where species-specific evidence already exists in the registry. For the
 * remaining taxa we expose the animal's own habitat/lifestyle requirements, husbandry
 * safeguards and provenance so the UI no longer treats the species as an empty record.
 */
const reviewedOn = '2026-09-05';

function climateNotes(species: SnakeSpeciesRecord): string {
  const text = `${species.acceptedScientificName} ${species.knowledge.habitat ?? ''} ${species.knowledge.distribution ?? ''}`.toLowerCase();
  if (/rainforest|tropical forest|humid forest|lowland forest|swamp|marsh|wetland|equatorial|monsoon/.test(text)) {
    return 'Tropical/wet-habitat ecology: maintain a moisture gradient with reliable ventilation and allow surfaces/substrate to dry appropriately between moisture events.';
  }
  if (/desert|semi-arid|arid|dry scrub|desert scrub|semi-desert|xeric/.test(text)) {
    return 'Dry-habitat ecology: maintain a predominantly dry enclosure with localised moisture access rather than persistent whole-enclosure saturation.';
  }
  if (/montane|mountain|alpine|high elevation|highland/.test(text)) {
    return 'Montane/high-elevation ecology: provide a meaningful thermal gradient and retain seasonal/locality context instead of assuming lowland tropical conditions.';
  }
  if (/temperate|mediterranean|woodland|deciduous forest|pine woodland|grassland|prairie|savanna|savannah|scrub/.test(text)) {
    return 'Temperate/open-habitat ecology: provide a measurable day/night gradient, strong retreat choice and seasonal photoperiod appropriate to the recognised locality.';
  }
  return 'Use the species distribution and habitat as the environmental starting point. Exact numeric targets should only be added when directly supported by species-level husbandry evidence.';
}

function substrateFor(species: SnakeSpeciesRecord): string[] {
  const lifestyle = new Set(species.knowledge.lifestyle ?? []);
  const text = `${species.knowledge.habitat ?? ''} ${species.knowledge.summary}`.toLowerCase();
  if (lifestyle.has('aquatic') || lifestyle.has('semi-aquatic')) {
    return ['species-appropriate moisture-buffering substrate', 'soil/coconut-fibre or equivalent naturalistic mix', 'leaf litter where biologically appropriate'];
  }
  if (lifestyle.has('fossorial') || lifestyle.has('semi-fossorial')) {
    return ['deep burrowing substrate', 'low-dust soil/sand or wood-based blend suited to the species', 'leaf litter/cover where appropriate'];
  }
  if (/desert|arid|semi-arid|dry scrub|rocky/.test(text)) {
    return ['dry, low-dust naturalistic substrate', 'aspen/paper substrate where appropriate to the species', 'localised humid-retreat substrate when required'];
  }
  if (lifestyle.has('arboreal') || lifestyle.has('semi-arboreal')) {
    return ['moisture-buffering forest substrate', 'coconut fibre/soil-style mix', 'leaf litter or bark where appropriate'];
  }
  return ['species-appropriate low-dust substrate', 'paper-based or naturalistic substrate selected for the species', 'substrate depth matched to normal behaviour'];
}

function retreatFor(species: SnakeSpeciesRecord): string {
  const lifestyle = new Set(species.knowledge.lifestyle ?? []);
  if (lifestyle.has('arboreal') || lifestyle.has('semi-arboreal')) {
    return 'Provide secure terrestrial and elevated retreats, with cover positioned across the usable thermal and humidity gradients.';
  }
  if (lifestyle.has('fossorial') || lifestyle.has('semi-fossorial')) {
    return 'Provide multiple snug ground retreats plus sufficient substrate depth for normal hiding and burrowing behaviour.';
  }
  return 'Provide secure warm and cool retreats plus visual cover so the snake can choose exposure and shelter without remaining exposed.';
}

function lightingFor(species: SnakeSpeciesRecord): string {
  const text = `${species.knowledge.habitat ?? ''} ${species.knowledge.summary}`.toLowerCase();
  if (/nocturnal|crepuscular/.test(text)) {
    return 'Use a predictable day/night cycle with shaded retreats. UVB may be offered where species-specific husbandry supports it, but exposure must remain voluntary.';
  }
  return 'Use a predictable day/night cycle with shaded retreats. Where species-specific evidence supports UVB, provide a controlled gradient with access to shade.';
}

function waterFor(species: SnakeSpeciesRecord): string {
  const lifestyle = new Set(species.knowledge.lifestyle ?? []);
  if (lifestyle.has('aquatic') || lifestyle.has('semi-aquatic')) {
    return 'Provide reliable access to clean water with safe entry/exit and drainage scaled to the animal and enclosure. Aquatic access must not compromise hygiene or enclosure security.';
  }
  return 'Provide clean drinking water in a stable dish at all times, with the size and placement appropriate to the species and enclosure design.';
}

function makeProvisionalProfile(species: SnakeSpeciesRecord): HusbandryProfile {
  const lifestyle = species.knowledge.lifestyle ?? ['unknown'];
  const risk = species.knowledge.riskClass;
  const venomWarning = risk === 'venomous' || risk === 'high-risk'
    ? 'This species is classified as venomous/high-risk. Keeper-facing advice is restricted to environmental planning, legal compliance, professional containment and veterinary/institutional oversight; no casual handling procedure is supplied.'
    : undefined;

  return {
    evidenceLevel: 'limited',
    temperature: {
      seasonal: 'No validated numeric temperature range is stored here yet. Use measured thermal gradients and species/locality-specific professional guidance rather than borrowing numbers from another taxon.',
      notes: climateNotes(species),
    },
    humidity: {
      seasonal: 'No validated numeric humidity target is stored here yet. Use the species habitat as a qualitative guide and establish a measurable moisture gradient without stagnant air.',
      notes: climateNotes(species),
    },
    enclosure: {
      habitatType: lifestyle,
      substrate: substrateFor(species),
      hides: retreatFor(species),
      climbing: lifestyle.includes('arboreal') || lifestyle.includes('semi-arboreal'),
      water: waterFor(species),
      ventilation: 'Provide reliable cross-ventilation appropriate to the enclosure volume. Humidity must never be maintained by trapping stagnant air or permanently wet substrate.',
      lighting: lightingFor(species),
      enrichment: [
        'species-appropriate cover and retreat choice',
        ...(lifestyle.includes('fossorial') || lifestyle.includes('semi-fossorial') ? ['deep substrate for normal burrowing'] : []),
        ...(lifestyle.includes('arboreal') || lifestyle.includes('semi-arboreal') ? ['secure elevated structure'] : []),
        ...(lifestyle.includes('aquatic') || lifestyle.includes('semi-aquatic') ? ['safe water access and aquatic/shoreline complexity'] : []),
      ],
      notes: `${species.acceptedScientificName}: this completion layer is an evidence-limited keeper framework derived from this species' own ecology, lifestyle and risk classification. Exact numeric husbandry values remain intentionally unset until species-level evidence is verified.${venomWarning ? ` ${venomWarning}` : ''}`,
    },
    cohabitation: {
      recommendation: risk === 'venomous' || risk === 'high-risk' ? 'avoid' : 'generally-single',
      rationale: risk === 'venomous' || risk === 'high-risk'
        ? 'Separate containment is the safe default for high-risk/venomous species; any professional breeding management must use authorised facility protocols.'
        : 'Single housing is the conservative companion-animal default unless species-specific evidence and a controlled breeding context support temporary pairing.',
    },
  };
}

export function completeSpeciesHusbandry(species: SnakeSpeciesRecord): SnakeSpeciesRecord {
  if (species.knowledge.husbandry) return species;
  const sourceIds = Array.from(new Set([...(species.knowledge.sourceIds ?? []), 'merckReptileHusbandry2025', 'reptileDatabase2026']));
  return {
    ...species,
    knowledge: {
      ...species.knowledge,
      husbandry: makeProvisionalProfile(species),
      sourceIds,
      reviewedOn,
    },
  };
}
