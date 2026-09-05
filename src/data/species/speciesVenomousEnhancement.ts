import type { HusbandryProfile, SnakeSpeciesRecord } from './speciesTypes';

const specialistSources: Record<string, string[]> = {
  'trimeresurus-insularis': ['trimeresurusInsularisHerpeton2026'],
  'trimeresurus-albolabris': ['trimeresurusAlbolabrisHerpeton2026'],
  'atheris-squamigera': ['atherisSquamigeraHerpeton2026'],
  'bitis-gabonica': ['gaboonHerpeton2026'],
  'bitis-rhinoceros': ['bitisRhinocerosHerpeton2026'],
  'cerastes-cerastes': ['cerastesCerastesHerpeton2026'],
  'naja-kaouthia': ['najaKaouthiaHerpeton2026'],
  'naja-naja': ['najaNajaHerpeton2026'],
};

const numericProfiles: Record<string, HusbandryProfile> = {
  'trimeresurus-albolabris': {
    evidenceLevel: 'moderate',
    temperature: {
      warmSide: { min: 28, max: 30, unit: '°C', context: 'warm elevated perch' },
      coolSide: { min: 21, max: 24, unit: '°C', context: 'cool shaded retreat' },
      night: { min: 19, max: 23, unit: '°C', context: 'night air temperature' },
      notes: 'Species-specific specialist source supports a 24–28°C general air range, 28–30°C warm perch and 21–24°C cool retreat. Preserve vertical and horizontal choice rather than heating the whole enclosure.'
    },
    humidity: {
      target: { min: 70, max: 85, unit: '% RH', context: 'general enclosure cycle' },
      notes: 'Use a fluctuating, well-ventilated humidity cycle. Surfaces and foliage should be able to dry between misting events.'
    },
    enclosure: {
      habitatType: ['arboreal'],
      substrate: ['soil/coconut-fibre style moisture-buffering substrate', 'leaf litter where appropriate'],
      hides: 'Provide secure warm and cool elevated retreats plus dense visual cover; retain a usable lower retreat for inspection and emergency separation.',
      climbing: true,
      water: 'Provide a stable clean water source accessible without compromising enclosure security.',
      ventilation: 'Strong cross-ventilation is required; humidity must not depend on stagnant air.',
      lighting: 'Use a predictable 10–12 hour day/night cycle with dense shade. Any UVB provision must be low-output, measured and optional to the animal.',
      enrichment: ['stable horizontal and diagonal perches', 'dense foliage/visual cover', 'secure elevated retreat'],
      notes: 'Expert-only medically significant venomous species. Protected-contact containment and authorised professional procedures are required; no casual handling protocol is supplied.'
    },
    cohabitation: { recommendation: 'avoid', rationale: 'Solitary containment is the conservative safety baseline for a medically significant arboreal viper.' }
  },
  'atheris-squamigera': {
    evidenceLevel: 'moderate',
    temperature: {
      warmSide: { min: 27, max: 29, unit: '°C', context: 'limited warm zone' },
      coolSide: { min: 21, max: 24, unit: '°C', context: 'cool shaded retreat' },
      night: { min: 18, max: 22, unit: '°C', context: 'night air temperature' },
      notes: 'Species-specific source supports a 23–27°C general enclosure range with a limited 27–29°C warm area and 21–24°C cool retreat. Avoid sustained high whole-enclosure temperatures.'
    },
    humidity: {
      target: { min: 70, max: 85, unit: '% RH', context: 'general enclosure cycle' },
      notes: 'Maintain a humid but strongly ventilated arboreal environment with drying periods rather than constant saturation.'
    },
    enclosure: {
      habitatType: ['arboreal'],
      substrate: ['moisture-buffering forest substrate', 'leaf litter where appropriate'],
      hides: 'Provide multiple secure elevated retreats with dense cover and a lower sheltered retreat.',
      climbing: true,
      water: 'Provide clean water in a stable vessel and maintain safe hydration access without compromising containment.',
      ventilation: 'Strong cross-ventilation is required to keep high humidity from becoming stagnant.',
      lighting: 'Use a predictable 10–12 hour day/night cycle with strong shade. Any UVB should be low-output, measured and optional.',
      enrichment: ['secure branches/perches at multiple heights', 'dense visual cover', 'elevated resting sites'],
      notes: 'Expert-only venomous species. Professional containment and protected-contact servicing are required.'
    },
    cohabitation: { recommendation: 'avoid', rationale: 'Solitary containment is the conservative safety baseline for a medically significant arboreal viper.' }
  },
  'bitis-gabonica': {
    evidenceLevel: 'moderate',
    enclosure: {
      habitatType: ['terrestrial'],
      substrate: ['leaf-litter-rich naturalistic substrate', 'drainage-aware soil/bark blend'],
      hides: 'Provide secure ground retreats at the thermal ends with deep visual cover that still allows the animal to be accounted for before enclosure access.',
      climbing: false,
      water: 'Provide a stable clean water source through secure service access.',
      ventilation: 'Maintain strong, reliable ventilation even where humidity is elevated.',
      lighting: 'Provide a predictable day/night cycle with extensive shaded cover.',
      enrichment: ['leaf-litter cover', 'stable ground retreats', 'clear inspection lanes'],
      notes: 'Species-specific specialist source is used for the environmental and safety framework. No casual handling procedure is supplied.'
    },
    cohabitation: { recommendation: 'avoid', rationale: 'Large medically significant viper; solitary protected containment is the conservative baseline.' }
  },
  'bitis-rhinoceros': {
    evidenceLevel: 'moderate',
    enclosure: {
      habitatType: ['terrestrial'],
      substrate: ['forest-floor substrate with drainage', 'leaf litter where appropriate'],
      hides: 'Provide secure ground retreats and dense visual cover while preserving a clear inspection path.',
      climbing: false,
      water: 'Provide clean water with service access designed around containment.',
      ventilation: 'Strong cross-ventilation is essential in humid conditions.',
      lighting: 'Predictable day/night cycle with extensive shade.',
      enrichment: ['leaf-litter cover', 'secure ground retreats', 'visual barriers'],
      notes: 'Current specialist venomous-care evidence is referenced for environmental planning only. No casual handling procedure is supplied.'
    },
    cohabitation: { recommendation: 'avoid', rationale: 'Solitary protected containment is the conservative baseline for a medically significant viper.' }
  },
  'cerastes-cerastes': {
    evidenceLevel: 'moderate',
    temperature: {
      basking: { min: 32, max: 35, unit: '°C', context: 'limited basking surface' },
      coolSide: { min: 21, max: 24, unit: '°C', context: 'cool retreat' },
      night: { min: 18, max: 22, unit: '°C', context: 'night air temperature' },
      notes: 'Species-specific specialist source supports a limited 32–35°C basking surface, 21–24°C cool retreat and approximately 18–22°C nights. Measure both surface and buried substrate temperatures.'
    },
    humidity: {
      target: { min: 30, max: 45, unit: '% RH', context: 'general enclosure baseline' },
      notes: 'Maintain a dry baseline with a localised humid shed refuge rather than wetting the whole enclosure.'
    },
    enclosure: {
      habitatType: ['terrestrial', 'fossorial'],
      substrate: ['10–15 cm clean diggable desert mix', 'dry low-dust sand/soil blend'],
      hides: 'Provide secure surface retreats and sufficient substrate depth for normal burial behaviour.',
      climbing: false,
      water: 'Provide a stable clean water source appropriate to the enclosure and protected service system.',
      ventilation: 'Strong ventilation is required for a dry, stable environment.',
      lighting: 'Provide a clear 10–12 hour day with full darkness at night; shaded and buried retreats must remain available.',
      enrichment: ['deep diggable substrate', 'surface cover', 'secure buried retreat zones'],
      notes: 'Medically significant desert viper. Display/professional facility species; no casual handling protocol is supplied.'
    },
    cohabitation: { recommendation: 'avoid', rationale: 'Solitary protected containment is the conservative safety baseline.' }
  },
  'naja-kaouthia': {
    evidenceLevel: 'moderate',
    temperature: {
      warmSide: { min: 25, max: 29, unit: '°C', context: 'ambient warm side' },
      basking: { min: 30, max: 32, unit: '°C', context: 'limited basking surface' },
      coolSide: { min: 23, max: 25, unit: '°C', context: 'cool retreat' },
      night: { min: 22, max: 25, unit: '°C', context: 'night air temperature' },
      notes: 'Species-specific specialist source supports 25–29°C ambient air, 30–32°C basking surface, 23–25°C cool hide and 22–25°C nights. Do not maintain the whole enclosure at basking temperature.'
    },
    humidity: {
      target: { min: 55, max: 75, unit: '% RH', context: 'general enclosure baseline' },
      notes: 'Use a ventilated humidity gradient and local humid retreat. Avoid permanently wet floor substrate.'
    },
    enclosure: {
      habitatType: ['terrestrial', 'semi-aquatic'],
      substrate: ['soil-based low-dust substrate', 'cypress-style mulch where appropriate', 'paper during quarantine'],
      hides: 'Provide secure shift-compatible hides at both thermal ends and enough cover for voluntary retreat.',
      climbing: false,
      water: 'Provide clean water in a heavy, stable vessel that can be changed through protected service access.',
      ventilation: 'Reliable cross-ventilation and secure escape-resistant ventilation are mandatory.',
      lighting: 'Provide a distinct 10–12 hour day and full darkness at night with dense shaded cover.',
      enrichment: ['visual cover', 'secure low shelves', 'multiple retreat choices'],
      notes: 'Highly medically significant cobra. Protected professional containment and an established emergency plan are mandatory; no casual handling procedure is supplied.'
    },
    cohabitation: { recommendation: 'avoid', rationale: 'Cobra safety and service control require solitary protected containment.' }
  },
  'naja-naja': {
    evidenceLevel: 'moderate',
    enclosure: {
      habitatType: ['terrestrial', 'semi-aquatic'],
      substrate: ['compactable soil-based substrate', 'paper during quarantine'],
      hides: 'Provide two secure shift-compatible retreats, visual cover and clear inspection lanes.',
      climbing: false,
      water: 'Provide clean water through protected service access.',
      ventilation: 'Secure cross-ventilation with no escape routes or cavity access.',
      lighting: 'Provide a stable day/night cycle with full night darkness and extensive shade.',
      enrichment: ['visual cover', 'secure retreats', 'low fixed shelves where appropriate'],
      notes: 'Current specialist Indian Cobra evidence is used for environmental planning. Exact locality may require adjustment; no casual handling procedure is supplied.'
    },
    cohabitation: { recommendation: 'avoid', rationale: 'Solitary protected containment is the conservative safety baseline for a medically significant cobra.' }
  }
};

export function enhanceVenomousSpecies(species: SnakeSpeciesRecord): SnakeSpeciesRecord {
  const extraSources = specialistSources[species.id] ?? [];
  const existingSources = species.knowledge.sourceIds ?? [];
  const husbandry = numericProfiles[species.id] ?? species.knowledge.husbandry;
  if (!extraSources.length && !husbandry) return species;
  return {
    ...species,
    knowledge: {
      ...species.knowledge,
      sourceIds: Array.from(new Set([...existingSources, ...extraSources])),
      husbandry,
    },
  };
}
