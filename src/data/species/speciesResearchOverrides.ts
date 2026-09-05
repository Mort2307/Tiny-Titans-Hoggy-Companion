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
  if (species.id === 'eunectes-murinus') {
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

  if (species.id === 'bitis-gabonica') {
    const coreEvidence = {
      basis: 'species-specific' as const,
      scope: 'Bitis gabonica / Gaboon Viper captive husbandry',
      sourceIds: ['gaboonViperReptiNode2026', 'gaboonViperHerpeton2026'],
      caveat: 'Current specialist keeper sources provide practical species-specific targets. Historical captive records are retained as corroborative context, not as modern universal standards.',
      reviewedOn,
    };
    const thermalEvidence = {
      basis: 'species-specific' as const,
      scope: 'Bitis gabonica thermal gradient',
      sourceIds: ['gaboonViperReptiNode2026'],
      caveat: 'ReptiNode describes a gentle gradient and specifically advises against an intense basking lamp. Historical captive records report broader seasonal ranges, so Tiny Titans does not convert those into a single mandatory hotspot.',
      reviewedOn,
    };
    const humidityEvidence = {
      basis: 'species-specific' as const,
      scope: 'Bitis gabonica enclosure humidity',
      sourceIds: ['gaboonViperReptiNode2026', 'gaboonViperRhinocerosCaptive1988'],
      caveat: 'Current guidance supports a humid forest-floor environment with ventilation; the historical B. g. rhinoceros record is comparative evidence and not automatically identical to B. gabonica.',
      reviewedOn,
    };
    const breedingEvidence = {
      basis: 'species-specific' as const,
      scope: 'Bitis gabonica reproductive biology and captive breeding',
      sourceIds: ['gaboonViperHerpeton2026', 'gaboonViperCaptiveBreeding1984'],
      caveat: 'The species is viviparous. Historical breeding reports document captive reproduction, but breeding conditioning should remain an experienced specialist programme rather than a pet-care prescription.',
      reviewedOn,
    };

    return {
      ...species,
      knowledge: {
        ...species.knowledge,
        summary: 'Large African forest-floor viper. Captive husbandry centres on a gentle thermal gradient, humid but well-ventilated forest-floor conditions, secure floor-focused housing and specialist venomous-animal infrastructure.',
        distribution: 'Sub-Saharan Africa, particularly Central and West African forest regions; locality provenance should remain attached to captive records.',
        habitat: 'Humid lowland and tropical forest, especially leaf-litter-rich forest floor and dense undergrowth.',
        activityPattern: 'nocturnal',
        lifestyle: ['terrestrial'],
        riskClass: 'venomous',
        husbandry: {
          evidenceLevel: 'moderate',
          evidenceSummary: coreEvidence,
          temperature: {
            warmSide: { min: 28, max: 31, unit: '°C', context: 'warm side / gentle thermal gradient', evidence: thermalEvidence },
            coolSide: { min: 23, max: 25, unit: '°C', context: 'cool side', evidence: thermalEvidence },
            night: { min: 20, max: 22, unit: '°C', context: 'night-time drop', evidence: thermalEvidence },
            notes: 'Create a gentle gradient rather than a scorching basking area. ReptiNode reports a warm spot around 32 °C maximum and specifically advises against an intense basking lamp; all heat must be thermostatically controlled and physically guarded.',
          },
          humidity: {
            target: { min: 60, max: 80, unit: '% RH', context: 'humid tropical-forest baseline', evidence: humidityEvidence },
            notes: 'Maintain humidity alongside strong ventilation. Humidity peaks can be useful during sheds, but permanently stagnant saturated air is not a welfare target.'
          },
          enclosure: {
            habitatType: ['terrestrial'],
            substrate: ['coconut fibre / coco-based substrate', 'potting-soil or orchid-bark style naturalistic mix where appropriate', 'sphagnum moss in localised humid areas', 'leaf litter'],
            hides: 'Provide solid, ground-level hides and deep visual cover across the enclosure so the snake can remain cryptic while still allowing safe pre-access confirmation.',
            climbing: false,
            water: 'Provide a large stable bowl of clean water at all times, with service access designed so staff are never required to place hands near the snake.',
            ventilation: 'Use strong, reliable ventilation to support the humid forest-floor environment without creating stagnant wet air. Every service route should preserve enclosure security.',
            lighting: 'Nocturnal forest-floor species: provide a predictable day/night cycle with extensive shaded cover. UVB is not presented as a mandatory species-specific target; optional low-level exposure must always permit avoidance.',
            enrichment: ['deep leaf litter / visual cover', 'multiple secure ground hides', 'forest-floor structure', 'humidity gradient', 'robust furnishings'],
            notes: 'Current specialist guidance gives an adult enclosure reference of about 150 × 75 × 60 cm, with floor area prioritised over height. For a medically significant viper, lockable closures, protected service access / shift-box capability, escape prevention and institutional-quality emergency planning are fundamental design requirements.'
          },
          cohabitation: {
            recommendation: 'generally-single',
            rationale: 'Gaboon vipers are solitary in the wild and medically significant. Individual housing is the conservative captive baseline because it simplifies feeding, health surveillance, servicing and emergency control.'
          },
        },
        feeding: {
          evidenceLevel: 'moderate',
          dietaryGuild: 'carnivore',
          preyCategories: ['appropriately sized rats or mice', 'larger whole prey only where justified by adult size and specialist programme'],
          notes: 'Species-specific keeper guidance describes a slow metabolism and recommends widely spaced meals, roughly one appropriately sized prey item every 2–4 weeks depending on age, with adults generally spaced farther apart. Body condition should determine adjustment; avoid overfeeding and prey escalation.',
          evidenceSummary: { basis: 'species-specific', scope: 'Bitis gabonica captive feeding', sourceIds: ['gaboonViperReptiNode2026', 'gaboonViperHerpeton2026'], caveat: 'Feeding frequency is practical specialist guidance rather than a controlled universal schedule. Venomous feeding and servicing procedures belong in an authorised specialist programme.', reviewedOn }
        },
        breeding: {
          evidenceLevel: 'moderate',
          evidenceSummary: breedingEvidence,
          notes: 'Viviparous. Current specialist guidance reports large litters and emphasises the hazards of fully venomous neonates. Historical captive breeding reports document successful reproduction, while field/ecology sources place reproduction in a seasonal rainfall context.',
          seasonalCycling: 'Seasonal reproductive conditioning may be used only in an established specialist programme with locality-aware environmental planning; do not turn one historical breeding schedule into a universal prescription.'
        },
        safety: {
          medicallySignificantVenom: true,
          rearFangedOrVenomDelivery: false,
          handlingNotes: 'Medically significant viper with potentially severe envenomation. Tiny Titans provides no casual hand-handling protocol. Housing, feeding, servicing, escape response, veterinary transport and emergency plans should be designed around competent specialist personnel, secure containment and lawful access to appropriate emergency resources.'
        },
        sourceIds: ['reptileDatabase2026', 'gaboonViperReptiNode2026', 'gaboonViperHerpeton2026', 'gaboonViperCaptiveBreeding1984'],
        reviewedOn,
      },
    };
  }

  return species;
}
