import { SPECIES_SOURCES, getUnresolvedSpeciesSourceIds } from './speciesSources';
import type { EvidenceLevel, EvidenceScope, HusbandryProfile, SourcedNumericRange, SnakeSpeciesRecord } from './speciesTypes';

export type EvidenceCoverage =
  | 'verified'
  | 'recorded-needs-scoping'
  | 'external-evidence-located'
  | 'evidence-limited'
  | 'context-only'
  | 'unmapped';

export interface EvidenceCoverageResult {
  status: EvidenceCoverage;
  label: string;
  detail: string;
  sourceIds: string[];
}

const TAXONOMY_ONLY_SOURCE_IDS = new Set(['reptileDatabase2026']);
const PROFILE_SCOPE_BY_SOURCE: Record<string, Pick<EvidenceScope, 'basis' | 'scope' | 'caveat'>> = {
  merckReptileHusbandry2025: { basis: 'general-veterinary', scope: 'Merck reptile husbandry framework and selected species/group guidance', caveat: 'Veterinary/group guidance; do not treat every table value as species-specific.' },
  rspcaSnakeCare2026: { basis: 'general-veterinary', scope: 'RSPCA snake welfare and husbandry principles', caveat: 'General welfare framework rather than a universal species-specific numeric prescription.' },
  rspcaCornSnake2026: { basis: 'species-specific', scope: 'Pantherophis guttatus / Corn Snake', caveat: 'Species-specific welfare guidance; not automatic evidence for other Pantherophis species.' },
  rspcaKingsnake2026: { basis: 'genus-level', scope: 'Kingsnake / Lampropeltis group guidance', caveat: 'Species and subspecies variation remains relevant.' },
  rspcaGarterSnake2026: { basis: 'genus-level', scope: 'Thamnophis garter-snake group guidance', caveat: 'Individual species and locality ecology can differ.' },
  reptifilesBlackRatsnake2026: { basis: 'species-specific', scope: 'Pantherophis obsoletus / Black Ratsnake', caveat: 'Species-specific reference used only as a scoped comparator when applied beyond this species.' },
  reptifilesKingsnake2026: { basis: 'genus-level', scope: 'Lampropeltis / kingsnake framework', caveat: 'The source notes variation by subspecies/species.' },
  reptifilesMilksnake2026: { basis: 'genus-level', scope: 'Lampropeltis / milksnake framework', caveat: 'Group guidance; not automatic proof for every Lampropeltis species.' },
  reptifilesBloodPython2017: { basis: 'taxon-level', scope: 'Blood and short-tailed python complex', caveat: 'Secondary keeper reference spanning more than one taxon; exact species scope must remain visible.' },
  reptifilesGopherSnake2026: { basis: 'species-specific', scope: 'Pituophis catenifer / Gopher Snake and Bullsnake', caveat: 'Species-specific reference with locality/form caveats.' },
  herpetonPythonCurtus2026: { basis: 'species-specific', scope: 'Python curtus / Sumatran Short-tailed Python', caveat: 'Keeper guidance using climate context and captive targets; not controlled laboratory consensus.' },
  reptinodeBlackHeadedPython2026: { basis: 'species-specific', scope: 'Aspidites melanocephalus / Black-headed Python', caveat: 'Practical keeper reference rather than a controlled physiological study.' },
  reptitalkBoelensPython2016: { basis: 'species-specific', scope: "Simalia boeleni / Boelen's Python", caveat: 'Experienced-keeper account; practical evidence rather than controlled experimental consensus.' },
  faunaExoticaWhiteLipped2006: { basis: 'species-specific', scope: 'Leiopython albertisii / Northern White-lipped Python', caveat: 'Long-running keeper account; practical evidence rather than controlled research.' },
  austriaElapheClimacophora2020: { basis: 'species-specific', scope: 'Elaphe climacophora / Japanese Rat Snake regulatory benchmark', caveat: 'Government animal-keeping standard; regulatory benchmark is not automatically an optimal-welfare prescription.' },
  zamenisSitulaCaptive2019: { basis: 'species-specific', scope: 'Zamenis situla published captive conditions', caveat: 'Published study conditions are evidence about that study, not universal species targets.' },
  herpetonStilettoSnake2026: { basis: 'species-specific', scope: 'Atractaspis microlepidota / Small-scaled Stiletto Snake', caveat: 'Specialist keeper reference; not cross-applied to other taxa.' },
  reptifilesChildrensPython2026: { basis: 'species-specific', scope: "Antaresia childreni / Children's Python", caveat: 'Species-specific keeper guidance.' },
  nswsChildrensPython2026: { basis: 'species-specific', scope: "Antaresia childreni / Children's Python", caveat: 'Government animal-care cross-check for the species.' },
  reptinodeWoma2026: { basis: 'species-specific', scope: 'Aspidites ramsayi / Woma Python', caveat: 'Species-specific keeper reference.' },
  reptifilesDumerilBoa2026: { basis: 'species-specific', scope: "Acrantophis dumerili / Dumeril's Boa", caveat: 'Species-specific keeper reference.' },
  reptifilesColombianRainbowBoa2026: { basis: 'species-specific', scope: 'Epicrates maurus / Colombian Rainbow Boa', caveat: 'Species-specific keeper reference.' },
  reptifilesSpottedPython2026: { basis: 'species-specific', scope: 'Antaresia maculosa / Spotted Python', caveat: 'Species-specific keeper reference; humidity guidance includes a broad tolerated captive range.' },
  reptifilesBredlsPython2026: { basis: 'species-specific', scope: 'Morelia bredli / Bredl’s Python', caveat: 'Species-specific keeper reference.' },
  reptifilesBurmesePython2026: { basis: 'species-specific', scope: 'Python bivittatus / Burmese Python', caveat: 'Species-specific keeper reference.' },
  reptifilesReticulatedPython2026: { basis: 'species-specific', scope: 'Malayopython reticulatus / Reticulated Python', caveat: 'Species-specific keeper reference with locality and size nuance.' },
  reptifilesBoaConstrictor2023: { basis: 'species-specific', scope: 'Boa constrictor care reference', caveat: 'Locality and taxonomic variation remain relevant.' },
};

function mappedSourceIds(species: SnakeSpeciesRecord): string[] {
  return species.knowledge.sourceIds.filter((id) => !TAXONOMY_ONLY_SOURCE_IDS.has(id));
}

function hasResolvedSourceIds(sourceIds: string[]): boolean {
  return sourceIds.length > 0 && sourceIds.every((id) => Boolean(SPECIES_SOURCES[id]?.url && SPECIES_SOURCES[id].url !== '#'));
}

function chooseProfileScope(species: SnakeSpeciesRecord): EvidenceScope | undefined {
  const ids = mappedSourceIds(species);
  const matching = ids.map((id) => PROFILE_SCOPE_BY_SOURCE[id]).find(Boolean);
  if (!matching) return undefined;
  return {
    ...matching,
    sourceIds: ids,
    reviewedOn: species.knowledge.reviewedOn,
  };
}

export function ensureSpeciesHusbandryEvidence(species: SnakeSpeciesRecord): SnakeSpeciesRecord {
  const husbandry = species.knowledge.husbandry;
  if (!husbandry) return species;
  if (husbandry.evidenceSummary) return species;
  const evidenceSummary = chooseProfileScope(species) ?? {
    basis: 'ecology-only' as const,
    scope: `${species.acceptedScientificName} profile context`,
    sourceIds: [],
    caveat: 'No captive-husbandry source is currently mapped to the profile. Existing values, if present, remain recorded data until individually scoped.',
    reviewedOn: species.knowledge.reviewedOn,
  };
  const enhancedHusbandry: HusbandryProfile = { ...husbandry, evidenceSummary };
  return { ...species, knowledge: { ...species.knowledge, husbandry: enhancedHusbandry } };
}

export function evidenceLabel(status: EvidenceCoverage): string {
  switch (status) {
    case 'verified': return 'Verified evidence scope';
    case 'recorded-needs-scoping': return 'Recorded · scope needs mapping';
    case 'external-evidence-located': return 'Evidence located · mapping pending';
    case 'evidence-limited': return 'Evidence limited';
    case 'context-only': return 'Context only';
    default: return 'Not yet mapped';
  }
}

export function getRangeEvidenceCoverage(range: SourcedNumericRange | undefined, species: SnakeSpeciesRecord): EvidenceCoverageResult {
  if (range?.evidence) {
    const sourceIds = range.evidence.sourceIds;
    if (hasResolvedSourceIds(sourceIds)) return { status: 'verified', label: evidenceLabel('verified'), detail: `${formatBasis(range.evidence)}.`, sourceIds };
    return { status: 'recorded-needs-scoping', label: evidenceLabel('recorded-needs-scoping'), detail: 'A scope object exists, but one or more supporting source records still need to be resolved in the source catalogue.', sourceIds };
  }
  if (range) {
    const sourceIds = mappedSourceIds(species);
    return {
      status: sourceIds.length > 0 ? 'recorded-needs-scoping' : 'context-only',
      label: evidenceLabel(sourceIds.length > 0 ? 'recorded-needs-scoping' : 'context-only'),
      detail: sourceIds.length > 0
        ? 'A numeric value is already recorded, but its individual evidence scope is not attached yet.'
        : 'A numeric value exists without a non-taxonomic supporting source trail. It must not be presented as a verified target.',
      sourceIds,
    };
  }
  return getProfileEvidenceCoverage(species, species.knowledge.husbandry?.evidenceLevel);
}

export function getProfileEvidenceCoverage(species: SnakeSpeciesRecord, evidenceLevel?: EvidenceLevel, explicitScope?: EvidenceScope): EvidenceCoverageResult {
  const sourceIds = explicitScope?.sourceIds ?? mappedSourceIds(species);
  if (explicitScope) {
    if (hasResolvedSourceIds(sourceIds)) return { status: 'verified', label: evidenceLabel('verified'), detail: `${formatBasis(explicitScope)}.`, sourceIds };
    return { status: 'recorded-needs-scoping', label: evidenceLabel('recorded-needs-scoping'), detail: 'The profile scope exists, but its source trail is not fully resolved yet.', sourceIds };
  }
  if (sourceIds.length > 0) return { status: 'external-evidence-located', label: evidenceLabel('external-evidence-located'), detail: 'Tiny Titans has a non-taxonomic source trail, but the current profile fields have not all been individually scoped.', sourceIds };
  if (evidenceLevel === 'limited' || evidenceLevel === 'unknown') return { status: 'evidence-limited', label: evidenceLabel('evidence-limited'), detail: 'Keeper-facing evidence is currently too thin to justify a species-specific numeric target here.', sourceIds };
  return { status: 'context-only', label: evidenceLabel('context-only'), detail: 'The profile currently contains taxonomy/ecology context without a mapped captive-husbandry source.', sourceIds };
}

export function getSpeciesEvidenceSummary(species: SnakeSpeciesRecord) {
  const husbandry = species.knowledge.husbandry;
  const ranges = [husbandry?.temperature?.basking, husbandry?.temperature?.warmSide, husbandry?.temperature?.coolSide, husbandry?.temperature?.night, husbandry?.humidity?.target, husbandry?.humidity?.acceptable].filter(Boolean) as SourcedNumericRange[];
  const verifiedRanges = ranges.filter((range) => getRangeEvidenceCoverage(range, species).status === 'verified').length;
  const recordedRanges = ranges.filter((range) => getRangeEvidenceCoverage(range, species).status === 'recorded-needs-scoping').length;
  return { numericRanges: ranges.length, verifiedRanges, recordedRanges, profile: getProfileEvidenceCoverage(species, husbandry?.evidenceLevel, husbandry?.evidenceSummary), hasExternalEvidence: mappedSourceIds(species).length > 0, unresolvedSourceIds: getUnresolvedSpeciesSourceIds() };
}

function formatBasis(evidence: EvidenceScope): string {
  return `${evidence.basis.replace(/-/g, ' ')} · ${evidence.scope} ${evidence.caveat}`;
}
