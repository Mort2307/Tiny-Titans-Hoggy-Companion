import type { SourceCitation } from './speciesTypes';

/** Specialist species-level sources added outside the legacy source catalogue. */
export const SPECIES_SPECIALIST_SOURCES: Record<string, SourceCitation> = {
  gaboonViperReptiNode2026: {
    id: 'gaboonViperReptiNode2026',
    title: 'Gaboon Viper — Care Sheet & Morphs',
    publisher: 'ReptiNode',
    url: 'https://reptinode.fr/en/genetics/bitis-gabonica',
    accessedOn: '2026-09-05',
    evidenceLevel: 'moderate',
    notes: 'Species-specific keeper reference covering enclosure, thermal gradient, humidity, water, diet and breeding. Practical captive guidance, not a controlled physiological standard.',
  },
  gaboonViperHerpeton2026: {
    id: 'gaboonViperHerpeton2026',
    title: 'Gaboon Viper',
    publisher: 'Herpeton Academy',
    url: 'https://academy.herpeton.net/en/caresheets/snakes/bitis-gabonica/',
    accessedOn: '2026-09-05',
    evidenceLevel: 'moderate',
    notes: 'Species-specific specialist keeper reference with breeding and health-watch context. Use alongside other evidence and retain practical-source caveats.',
  },
  gaboonViperCaptiveBreeding1984: {
    id: 'gaboonViperCaptiveBreeding1984',
    title: 'Breeding Gaboon Vipers, Bitis gabonica gabonica, in Captivity',
    publisher: 'British Herpetological Society',
    url: 'https://www.thebhs.org/publications/the-herpetological-bulletin/issue-number-47-spring-1994/2510-hb047-05/file',
    accessedOn: '2026-09-05',
    evidenceLevel: 'moderate',
    notes: 'Historical specialist captive-breeding report. Valuable for documented breeding practice but not a universal modern husbandry standard.',
  },
  gaboonViperRhinocerosCaptive1988: {
    id: 'gaboonViperRhinocerosCaptive1988',
    title: 'Captive breeding of Bitis gabonica rhinoceros',
    publisher: 'Litteratura Serpentium',
    url: 'https://www.snakesociety.nl/jaargangen/1988e/Litteratura%20Serpentium%204-1%20182-188%20Rosi%2C%20Captive%20breeding%20of%20Bitis%20gabonica%20rhinoceros.pdf',
    accessedOn: '2026-09-05',
    evidenceLevel: 'limited',
    notes: 'Historical captive record for the rhinoceros subspecies; used as comparative captive evidence only and never as automatic B. gabonica guidance.',
  },
};
