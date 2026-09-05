import { SPECIES_SOURCES, getUnresolvedSpeciesSourceIds } from './speciesSources';
import type { EvidenceLevel, EvidenceScope, SourcedNumericRange, SnakeSpeciesRecord } from './speciesTypes';

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

function mappedSourceIds(species: SnakeSpeciesRecord): string[] {
  return species.knowledge.sourceIds.filter((id) => !TAXONOMY_ONLY_SOURCE_IDS.has(id));
}

function hasResolvedSourceIds(sourceIds: string[]): boolean {
  return sourceIds.length > 0 && sourceIds.every((id) => Boolean(SPECIES_SOURCES[id]?.url && SPECIES_SOURCES[id].url !== '#'));
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

export function getRangeEvidenceCoverage(
  range: SourcedNumericRange | undefined,
  species: SnakeSpeciesRecord,
): EvidenceCoverageResult {
  if (range?.evidence) {
    const sourceIds = range.evidence.sourceIds;
    if (hasResolvedSourceIds(sourceIds)) {
      return {
        status: 'verified',
        label: evidenceLabel('verified'),
        detail: `${formatBasis(range.evidence)}.`,
        sourceIds,
      };
    }
    return {
      status: 'recorded-needs-scoping',
      label: evidenceLabel('recorded-needs-scoping'),
      detail: 'A scope object exists, but one or more supporting source records still need to be resolved in the source catalogue.',
      sourceIds,
    };
  }

  if (range) {
    const sourceIds = mappedSourceIds(species);
    return {
      status: sourceIds.length > 0 ? 'recorded-needs-scoping' : 'context-only',
      label: evidenceLabel(sourceIds.length > 0 ? 'recorded-needs-scoping' : 'context-only'),
      detail: sourceIds.length > 0
        ? 'A numeric value is already recorded for this species, but its evidence scope is not attached to the individual value yet.'
        : 'A numeric value exists without a non-taxonomic supporting source trail. It should not be presented as a verified target.',
      sourceIds,
    };
  }

  return getProfileEvidenceCoverage(species, species.knowledge.husbandry?.evidenceLevel);
}

export function getProfileEvidenceCoverage(
  species: SnakeSpeciesRecord,
  evidenceLevel?: EvidenceLevel,
  explicitScope?: EvidenceScope,
): EvidenceCoverageResult {
  const sourceIds = explicitScope?.sourceIds ?? mappedSourceIds(species);

  if (explicitScope) {
    if (hasResolvedSourceIds(sourceIds)) {
      return {
        status: 'verified',
        label: evidenceLabel('verified'),
        detail: `${formatBasis(explicitScope)}.`,
        sourceIds,
      };
    }
    return {
      status: 'recorded-needs-scoping',
      label: evidenceLabel('recorded-needs-scoping'),
      detail: 'The evidence scope is present, but its source trail is not fully resolved yet.',
      sourceIds,
    };
  }

  if (sourceIds.length > 0) {
    return {
      status: 'external-evidence-located',
      label: evidenceLabel('external-evidence-located'),
      detail: 'Tiny Titans has a non-taxonomic source trail for this species, but the current field has not yet been individually scoped to each value.',
      sourceIds,
    };
  }

  if (evidenceLevel === 'limited' || evidenceLevel === 'unknown') {
    return {
      status: 'evidence-limited',
      label: evidenceLabel('evidence-limited'),
      detail: 'Keeper-facing evidence is currently too thin to justify a species-specific numeric target here.',
      sourceIds,
    };
  }

  return {
    status: 'context-only',
    label: evidenceLabel('context-only'),
    detail: 'The profile currently contains taxonomy/ecology context without a mapped captive-husbandry source.',
    sourceIds,
  };
}

export function getSpeciesEvidenceSummary(species: SnakeSpeciesRecord) {
  const husbandry = species.knowledge.husbandry;
  const ranges = [
    husbandry?.temperature?.basking,
    husbandry?.temperature?.warmSide,
    husbandry?.temperature?.coolSide,
    husbandry?.temperature?.night,
    husbandry?.humidity?.target,
    husbandry?.humidity?.acceptable,
  ].filter(Boolean) as SourcedNumericRange[];

  const verifiedRanges = ranges.filter((range) => getRangeEvidenceCoverage(range, species).status === 'verified').length;
  const recordedRanges = ranges.filter((range) => getRangeEvidenceCoverage(range, species).status === 'recorded-needs-scoping').length;
  const unresolvedSourceIds = getUnresolvedSpeciesSourceIds();

  return {
    numericRanges: ranges.length,
    verifiedRanges,
    recordedRanges,
    profile: getProfileEvidenceCoverage(species, husbandry?.evidenceLevel, husbandry?.evidenceSummary),
    hasExternalEvidence: mappedSourceIds(species).length > 0,
    unresolvedSourceIds,
  };
}

function formatBasis(evidence: EvidenceScope): string {
  return `${evidence.basis.replace(/-/g, ' ')} · ${evidence.scope} ${evidence.caveat}`;
}
