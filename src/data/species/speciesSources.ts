import type { SourceCitation } from './speciesTypes';

export const SPECIES_SOURCES: Record<string, SourceCitation> = {
  reptileDatabase2026: {
    id: 'reptileDatabase2026',
    title: 'The Reptile Database',
    publisher: 'Uetz, Freed, Aguilar, Reyes, Kudera & Hošek (eds.)',
    url: 'https://www.reptile-database.org/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'high',
    notes: 'Primary taxonomy authority for accepted living reptile names, synonyms, distribution and literature references. Taxonomy remains subject to revision.'
  },
  merckReptileHusbandry2025: {
    id: 'merckReptileHusbandry2025',
    title: 'Management and Husbandry of Reptiles',
    publisher: 'Merck Veterinary Manual',
    url: 'https://www.merckvetmanual.com/exotic-and-laboratory-animals/reptiles/management-and-husbandry-of-reptiles',
    accessedOn: '2026-09-04',
    evidenceLevel: 'high',
    notes: 'Veterinary husbandry reference, reviewed July 2025. Used for general reptile husbandry principles and selected species parameters, never as a substitute for species-specific evidence.'
  },
  reptifilesHognose2026: {
    id: 'reptifilesHognose2026',
    title: 'Hognose Snake Care Guide',
    publisher: 'ReptiFiles',
    url: 'https://reptifiles.com/heterodon-hognose-snake-care/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'moderate',
    notes: 'Current keeper-facing care guide updated July 31, 2026. Western and Eastern Heterodon parameters are separated rather than shared blindly.'
  },
  reptifilesHognoseClimate2026: {
    id: 'reptifilesHognoseClimate2026',
    title: 'Hognose Temperatures, Humidity & Lighting',
    publisher: 'ReptiFiles',
    url: 'https://reptifiles.com/heterodon-hognose-snake-care/hognose-temperatures-humidity-lighting/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'moderate',
    notes: 'Current species-group environmental guidance with separate Western versus Eastern/Southern ranges.'
  },
  reptifilesKingsnake2026: {
    id: 'reptifilesKingsnake2026',
    title: 'Kingsnake Care Sheet',
    publisher: 'ReptiFiles',
    url: 'https://reptifiles.com/kingsnake-care-sheet/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'moderate',
    notes: 'Current kingsnake husbandry guidance covering Mexican Black Kingsnakes and related Lampropeltis.'
  },
  deadpanMbcCare2025: {
    id: 'deadpanMbcCare2025',
    title: 'Mexican Black Kingsnake Care Guide',
    publisher: 'Deadpan Exotics',
    url: 'https://www.deadpanexotics.com/mbkcareguide',
    accessedOn: '2026-09-04',
    evidenceLevel: 'moderate',
    notes: 'September 2025 keeper care guide used as a secondary species-specific cross-check, not as sole authority.'
  },
  xenodonCaptiveHusbandry2021: {
    id: 'xenodonCaptiveHusbandry2021',
    title: 'Captive Husbandry of Xenodon pulcher',
    publisher: 'Herpetoculture Network / Herpetoculture Magazine',
    url: 'https://herpetoculturenetwork.com/captive-husbandry-of-xenodon-pulcher/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'limited',
    notes: 'First-person specialist husbandry account. Useful for environmental behaviour and enclosure design, but explicitly not a prescriptive consensus standard.'
  },
  birminghamXenodon2026: {
    id: 'birminghamXenodon2026',
    title: 'Tricolour Hognose Snake Care Guide',
    publisher: 'Birmingham Reptiles',
    url: 'https://www.birminghamreptiles.co.uk/care/tricolour-hognose-snake',
    accessedOn: '2026-09-04',
    evidenceLevel: 'limited',
    notes: 'UK specialist keeper guide used as a secondary practical reference for Xenodon pulcher.'
  },
  leioheterodonCare2010: {
    id: 'leioheterodonCare2010',
    title: 'Leioheterodon modestus captive care observations',
    publisher: 'Nimo / keeper reference archive',
    url: 'https://nimo.fr/forums/479764-quizz-n-32-leioheterodon-modestus/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'limited',
    notes: 'Older keeper report. Retained as a traceable practical source only; husbandry values should be treated as provisional and revisited as stronger modern evidence appears.'
  },
  greenAnacondaHerpeton2026: {
    id: 'greenAnacondaHerpeton2026',
    title: 'Green Anaconda Care Guide',
    publisher: 'Herpeton Academy',
    url: 'https://academy.herpeton.net/en/caresheets/snakes/eunectes-murinus/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'moderate',
    notes: 'Current specialist care guide emphasising large custom semi-aquatic facilities, heated water and keeper safety.'
  },
  gaboonHerpeton2026: {
    id: 'gaboonHerpeton2026',
    title: 'Gaboon Viper Care Guide',
    publisher: 'Herpeton Academy',
    url: 'https://academy.herpeton.net/en/caresheets/snakes/bitis-gabonica/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'moderate',
    notes: 'Current specialist venomous husbandry reference. The app deliberately omits casual handling procedures.'
  },
  westernDiamondbackReptiNode2026: {
    id: 'westernDiamondbackReptiNode2026',
    title: 'Western Diamondback Rattlesnake Care Sheet',
    publisher: 'ReptiNode',
    url: 'https://reptinode.fr/en/genetics/crotalus-atrox',
    accessedOn: '2026-09-04',
    evidenceLevel: 'limited',
    notes: 'Current specialist husbandry registry used only as a secondary reference. Venomous husbandry remains subject to local law, facility standards and specialist veterinary oversight.'
  },
  leioheterodonVenom2025: {
    id: 'leioheterodonVenom2025',
    title: 'Potential envenomation by Leioheterodon and dentition evidence',
    publisher: 'Journal of Venomous Animals and Toxins including Tropical Diseases / Springer',
    url: 'https://link.springer.com/article/10.1186/s40409-015-0047-2',
    accessedOn: '2026-09-04',
    evidenceLevel: 'high',
    notes: 'Scientific literature source supporting rear-fanged / Duvernoy-gland safety classification; not a husbandry source.'
  }
};
