import type { SnakeSpeciesRecord } from './speciesTypes';

const reviewedOn = '2026-09-05';

/**
 * Human-reviewed specialist overlays for species whose taxonomy-first record
 * now has enough current husbandry evidence to unlock a species-aware profile.
 *
 * These overlays deliberately preserve source disagreement instead of averaging
 * incompatible values into a fake universal target.
 */
export function applySpeciesResearchOverrides(species: SnakeSpeciesRecord): SnakeSpeciesRecord {
  if (species.id !== 'eunectes-murinus') return species;

  return {
    ...species,
    knowledge: {
      ...species.knowledge,
      summary: 'Very large South American semi-aquatic boid. Adult husbandry is a specialist facility-scale planning problem centred on secure construction, a large heated water system, safe drainage and maintenance access.',
      riskClass: 'high-risk',
      husbandry: {
        evidenceLevel: 'moderate',
        evidenceSummary: {
          basis: 'species-specific',
          scope: 'Eunectes murinus / Green Anaconda captive husbandry',
          sourceIds: ['greenAnacondaReptiNode2026', 'greenAnacondaHerpeton2026'],
          caveat: 'Current specialist sources agree on warm tropical conditions and essential aquatic access but differ on whether a focal basking hotspot is required. Tiny Titans therefore keeps the thermal gradient and water temperature distinct and does not invent a single universal basking prescription.',
          reviewedOn,
        },
        temperature: {
          warmSide: { min: 28, max: 32, unit: '°C', context: 'daytime warm-side / gradient; specialist captive reference', evidence: { basis: 'species-specific', scope: 'Eunectes murinus daytime thermal gradient', sourceIds: ['greenAnacondaReptiNode2026', 'greenAnacondaHerpeton2026'], caveat: 'Sources differ in exact placement and emphasis. Use measured gradients and individual response rather than treating this as a single enclosure-wide target.', reviewedOn } },
          coolSide: { min: 24, max: 27, unit: '°C', context: 'daytime cool-side gradient', evidence: { basis: 'species-specific', scope: 'Eunectes murinus daytime cool zone', sourceIds: ['greenAnacondaReptiNode2026'], caveat: 'ReptiNode gives 24–27 °C for the cool side; Herpeton uses a broader ambient framework. Retain the gradient rather than flattening it.', reviewedOn } },
          night: { min: 24, max: 26, unit: '°C', context: 'night range', evidence: { basis: 'species-specific', scope: 'Eunectes murinus night temperature', sourceIds: ['greenAnacondaReptiNode2026', 'greenAnacondaHerpeton2026'], caveat: 'Both current specialist references keep nights warm; no cold-night shortcut is applied.', reviewedOn } },
        },
        humidity: {
          target: { min: 60, max: 90, unit: '% RH', context: 'ambient humidity supported by aquatic setup', evidence: { basis: 'species-specific', scope: 'Eunectes murinus humidity', sourceIds: ['greenAnacondaReptiNode2026', 'greenAnacondaHerpeton2026'], caveat: 'High humidity must be paired with strong ventilation and excellent water hygiene; stagnant saturated air is not treated as inherently beneficial.', reviewedOn } },
          notes: 'The large heated water feature is part of the environmental system. Water quality, filtration/drainage and dry retreat access are as important as the humidity number.'
        },
        enclosure: {
          habitatType: ['semi-aquatic', 'terrestrial'],
          substrate: ['clean, drainable land substrate', 'cypress / tropical moisture-buffering substrate where appropriate'],
          hides: 'Provide secure dry retreats and visual cover sized for the adult animal.',
          climbing: false,
          water: 'A very large, heated pool or aquatic zone allowing full-body immersion is a core requirement. Design safe drainage, filtration and maintenance access before the animal reaches adult size.',
          ventilation: 'Use robust ventilation while retaining tropical humidity; eliminate stagnant wet zones and protect all electrical/heating equipment from direct contact.',
          lighting: 'Predictable day/night cycle with shaded retreats. Specialist sources differ on UVB/lighting emphasis, so lighting is not presented as a species-specific numeric mandate here.',
          enrichment: ['large aquatic zone', 'secure dry haul-out', 'substantial visual cover', 'robust furnishings', 'safe movement space'],
          notes: 'Adult green anaconda housing should be planned as specialist custom infrastructure rather than a standard commercial vivarium. Large females may require room-scale facilities.'
        },
        cohabitation: {
          recommendation: 'generally-single',
          rationale: 'Single housing is the conservative default so feeding, health, water quality and behaviour can be monitored without competition or handling complications.'
        },
      },
      feeding: {
        evidenceLevel: 'moderate',
        dietaryGuild: 'carnivore',
        preyCategories: ['appropriately sized vertebrate whole prey', 'species-appropriate fish where specialist guidance supports it', 'waterfowl / aquatic-associated prey where appropriately sourced'],
        notes: 'Feeding plans should be body-condition led and scale with projected adult size. Specialist sources emphasise safe feeding and water-system hygiene; avoid hand feeding and manage large adults with appropriate personnel.'
      },
      breeding: species.knowledge.breeding,
      safety: {
        ...species.knowledge.safety,
        handlingNotes: 'High-risk giant constrictor. Plan adult restraint, feeding, enclosure maintenance, escape prevention and veterinary transport before the animal reaches large adult size. Specialist guidance recommends competent assistance rather than improvised solo handling.',
      },
      sourceIds: ['reptileDatabase2026', 'greenAnacondaReptiNode2026', 'greenAnacondaHerpeton2026'],
      reviewedOn,
    },
  };
}
