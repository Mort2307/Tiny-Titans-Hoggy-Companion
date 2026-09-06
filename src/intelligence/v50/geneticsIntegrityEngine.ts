export interface GeneticsClaim {
  id: string;
  name: string;
  kind?: string;
  verification?: string;
  copies?: number;
  source?: string;
}
export interface GeneticsIntegrityInput {
  claims: readonly GeneticsClaim[];
  parentA?: readonly GeneticsClaim[];
  parentB?: readonly GeneticsClaim[];
  observedOffspring?: readonly GeneticsClaim[];
}
export type GeneticsIntegritySeverity = "info" | "notice" | "watch" | "urgent";
export interface GeneticsIntegrityFinding {
  type: "conflict" | "uncertain" | "impossible" | "supported";
  title: string;
  detail: string;
  confidence: number;
  sourceIds: readonly string[];
  severity: GeneticsIntegritySeverity;
}
function normalise(value: string | undefined): string { return (value ?? "").trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " "); }
export function detectGeneticsConflicts(claims: readonly GeneticsClaim[]): GeneticsIntegrityFinding[] {
  const findings: GeneticsIntegrityFinding[] = [];
  const byName = new Map<string, GeneticsClaim[]>();
  for (const claim of claims) { const key = normalise(claim.name); if (!key) continue; const bucket = byName.get(key) ?? []; bucket.push(claim); byName.set(key, bucket); }
  for (const [name, bucket] of byName) { const statuses = new Set(bucket.map((item) => normalise(item.verification))); if (statuses.has("disputed") || (statuses.has("confirmed") && statuses.has("unverified"))) findings.push({ type: statuses.has("disputed") ? "conflict" : "uncertain", title: `${name} has mixed evidence`, detail: "Tiny Titans is keeping the claim unresolved until its evidence is reconciled.", confidence: statuses.has("disputed") ? 0.98 : 0.9, sourceIds: bucket.map((item) => item.id), severity: statuses.has("disputed") ? "watch" : "notice" }); }
  return findings;
}
function totals(claims: readonly GeneticsClaim[] | undefined): Map<string, number> { const result = new Map<string, number>(); for (const claim of claims ?? []) { const key = normalise(claim.name); if (!key) continue; result.set(key, (result.get(key) ?? 0) + (claim.copies ?? 1)); } return result; }
export function detectImpossibleOffspring(input: GeneticsIntegrityInput): GeneticsIntegrityFinding[] { const parentA = totals(input.parentA); const parentB = totals(input.parentB); const findings: GeneticsIntegrityFinding[] = []; for (const offspring of input.observedOffspring ?? []) { const key = normalise(offspring.name); if (!key) continue; const available = (parentA.get(key) ?? 0) + (parentB.get(key) ?? 0); const requested = offspring.copies ?? 1; if (requested > available && available > 0) findings.push({ type: "impossible", title: `Review recorded ${offspring.name} outcome`, detail: "The recorded parent claims do not provide enough explicit copies to support the recorded offspring claim. Check the source records before changing genetics.", confidence: 0.96, sourceIds: [...(input.parentA ?? []), ...(input.parentB ?? []), offspring].map((item) => item.id), severity: "urgent" }); } return findings; }
export function calculateGeneticIdentityConfidence(claims: readonly GeneticsClaim[]): number { if (!claims.length) return 0; const weights = claims.map((claim) => { switch (normalise(claim.verification)) { case "confirmed": return 1; case "recognised": return 0.85; case "reported": return 0.65; case "unverified": return 0.35; case "disputed": return 0.15; default: return 0.3; } }); return Number((weights.reduce((sum, value) => sum + value, 0) / weights.length).toFixed(3)); }
