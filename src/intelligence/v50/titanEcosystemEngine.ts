export interface EcosystemInput {
  bioactive: boolean;
  plants: readonly string[];
  cleanupCrew: readonly string[];
  lastCleanedDate?: string;
  observationDates?: readonly number[];
}

export interface EcosystemFinding {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "watch";
  confidence: number;
}

export interface PlantIntelligence {
  name: string;
  status: "present" | "unknown";
  note: string;
}

export interface TitanEcosystemSnapshot {
  mode: "bioactive" | "managed-substrate";
  plantCount: number;
  cleanupCrewCount: number;
  plants: readonly PlantIntelligence[];
  findings: readonly EcosystemFinding[];
  coverageScore: number;
  note: string;
}

function daysSince(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const millis = Date.parse(date);
  if (!Number.isFinite(millis)) return undefined;
  return Math.max(0, Math.floor((Date.now() - millis) / 86_400_000));
}

export function buildTitanEcosystemSnapshot(input: EcosystemInput): TitanEcosystemSnapshot {
  const findings: EcosystemFinding[] = [];
  const plants = [...new Set(input.plants.map((name) => name.trim()).filter(Boolean))].map((name) => ({
    name,
    status: "present" as const,
    note: "Presence is recorded from the enclosure profile; plant health is not inferred from presence alone.",
  }));
  const crew = [...new Set(input.cleanupCrew.map((name) => name.trim()).filter(Boolean))];

  if (input.bioactive && crew.length === 0) findings.push({ id: "bioactive-no-crew-record", title: "Bioactive enclosure has no cleanup-crew record", detail: "The enclosure is marked bioactive, but no cleanup organisms are recorded. Tiny Titans is flagging a data gap rather than assuming a living cleanup crew exists.", severity: "watch", confidence: 0.98 });
  if (input.bioactive && plants.length === 0) findings.push({ id: "bioactive-no-plants", title: "Bioactive enclosure has no plant record", detail: "No plants are recorded for this bioactive enclosure. That may be intentional; the system is surfacing missing context, not prescribing a planting scheme.", severity: "info", confidence: 0.97 });

  const cleanDays = daysSince(input.lastCleanedDate);
  if (cleanDays !== undefined && cleanDays > 42) findings.push({ id: "maintenance-age", title: "Last recorded cleaning is more than six weeks ago", detail: `The latest cleaning date is ${cleanDays} days old. Review the enclosure record and actual condition before deciding whether maintenance is due.`, severity: "watch", confidence: 0.94 });

  const observationCoverage = input.observationDates?.length ?? 0;
  const structuralSignals = (input.bioactive ? 1 : 0) + (plants.length ? 1 : 0) + (crew.length ? 1 : 0) + (observationCoverage ? 1 : 0);
  const coverageScore = Math.round((structuralSignals / 4) * 100);

  return {
    mode: input.bioactive ? "bioactive" : "managed-substrate",
    plantCount: plants.length,
    cleanupCrewCount: crew.length,
    plants,
    findings,
    coverageScore,
    note: "The ecosystem layer describes recorded enclosure structure and maintenance context. It does not infer plant health, microbial activity, or causal effects from absence of an observation.",
  };
}
