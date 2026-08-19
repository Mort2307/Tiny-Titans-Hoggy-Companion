import type { MasterMorphDefinition } from "./masterMorphDatabase";
import { getRegionalMorphNames, REGIONAL_MORPH_TERMINOLOGY, type MorphRegion, type MorphNameStatus } from "./morphRegionalTerminology";

export const AUDIT_REGIONS: Exclude<MorphRegion, "all">[] = ["global", "uk", "usa", "europe", "australia"];

export type MorphTerminologyAuditRow = {
  morphId: string;
  canonicalName: string;
  regions: Record<Exclude<MorphRegion, "all">, "explicit" | "fallback" | "missing">;
  regionalNames: string[];
  unresolvedNames: string[];
  statuses: MorphNameStatus[];
  needsResearch: boolean;
};

/**
 * Audits the real canonical master database rather than treating the existence
 * of the terminology module itself as coverage. A canonical name is a valid
 * fallback, but it is deliberately reported as fallback coverage so Creator
 * Centre can distinguish researched regional terminology from "no difference
 * currently recorded".
 */
export function buildMorphTerminologyAudit(morphs: MasterMorphDefinition[]) {
  const rows: MorphTerminologyAuditRow[] = morphs.map((morph) => {
    const record = REGIONAL_MORPH_TERMINOLOGY.find((item) => item.canonicalId.toLowerCase() === morph.geneId.toLowerCase());
    const regions = Object.fromEntries(AUDIT_REGIONS.map((region) => {
      const names = getRegionalMorphNames(morph.geneId, region, morph.name);
      const explicit = record?.names.some((name) => name.region === region) ?? false;
      return [region, names.length === 0 ? "missing" : explicit ? "explicit" : "fallback"];
    })) as MorphTerminologyAuditRow["regions"];
    const names = record?.names ?? [];
    const unresolvedNames = names.filter((name) => name.status === "unverified" || name.confidence === "low").map((name) => name.name);
    return {
      morphId: morph.geneId,
      canonicalName: morph.name,
      regions,
      regionalNames: names.filter((name) => name.status !== "preferred").map((name) => name.name),
      unresolvedNames,
      statuses: [...new Set(names.map((name) => name.status))],
      needsResearch: unresolvedNames.length > 0 || AUDIT_REGIONS.some((region) => regions[region] === "missing"),
    };
  });

  const explicit = rows.filter((row) => AUDIT_REGIONS.every((region) => row.regions[region] === "explicit")).length;
  const fallbackOnly = rows.filter((row) => AUDIT_REGIONS.every((region) => row.regions[region] === "fallback")).length;
  const partial = rows.filter((row) => !row.needsResearch && !AUDIT_REGIONS.every((region) => row.regions[region] === "explicit")).length;
  const research = rows.filter((row) => row.needsResearch).length;
  const unresolvedAliases = rows.reduce((total, row) => total + row.unresolvedNames.length, 0);

  return {
    totalMorphs: rows.length,
    fullyExplicit: explicit,
    fallbackOnly,
    mixedCoverage: partial,
    needsResearch: research,
    unresolvedAliases,
    coveragePercent: rows.length === 0 ? 100 : Math.round(((rows.length - research) / rows.length) * 100),
    rows,
  };
}

export function getMorphTerminologyAuditSummary(morphs: MasterMorphDefinition[]) {
  const audit = buildMorphTerminologyAudit(morphs);
  return {
    totalMorphs: audit.totalMorphs,
    coveragePercent: audit.coveragePercent,
    fullyExplicit: audit.fullyExplicit,
    fallbackOnly: audit.fallbackOnly,
    mixedCoverage: audit.mixedCoverage,
    needsResearch: audit.needsResearch,
    unresolvedAliases: audit.unresolvedAliases,
  };
}
