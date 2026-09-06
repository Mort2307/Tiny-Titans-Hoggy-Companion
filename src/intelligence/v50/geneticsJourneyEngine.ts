export interface GeneState {
  geneId: string;
  copies: number;
  status?: "confirmed" | "reported" | "uncertain";
}

export interface ParentRecord {
  id: string;
  name: string;
  genes: readonly GeneState[];
  parentIds?: readonly string[];
}

export interface BreedingOutcomeRecord {
  offspringId: string;
  claimedGenes: readonly GeneState[];
  observedDate?: number | string;
}

export function buildGeneticFamilyTree(records: readonly ParentRecord[]) {
  const nodes = records.map((record) => ({ id: record.id, label: record.name }));
  const edges = records.flatMap((record) => (record.parentIds ?? []).map((parentId) => ({ from: parentId, to: record.id })));
  return { nodes, edges, note: "Only explicit parent IDs are represented; missing ancestry is not inferred." };
}

export function buildGeneticBreadcrumbs(record: ParentRecord, sourceLabel = "Keeper record") {
  return record.genes.map((gene) => ({
    geneId: gene.geneId,
    copies: gene.copies,
    status: gene.status ?? "uncertain",
    source: sourceLabel,
    animalId: record.id,
  }));
}

export function buildGeneticTimeMachine(states: readonly { date: number | string; genes: readonly GeneState[] }[]) {
  return [...states]
    .filter((state) => toMillis(state.date) > 0)
    .sort((a, b) => toMillis(a.date) - toMillis(b.date))
    .map((state) => ({ ...state, timestamp: toMillis(state.date) }));
}

export function buildGeneticWhatIf(parentA: readonly GeneState[], parentB: readonly GeneState[]) {
  const byGene = new Map<string, { a: number; b: number }>();
  for (const gene of parentA) byGene.set(gene.geneId, { a: gene.copies, b: byGene.get(gene.geneId)?.b ?? 0 });
  for (const gene of parentB) byGene.set(gene.geneId, { a: byGene.get(gene.geneId)?.a ?? 0, b: gene.copies });
  return [...byGene.entries()].map(([geneId, copies]) => ({
    geneId,
    parentACopies: copies.a,
    parentBCopies: copies.b,
    possibleOffspringCopies: [0, 1, 2] as const,
    note: "This sandbox describes possible copy states only. Species-specific inheritance rules should be applied by the genetics calculator before presenting probabilities.",
  }));
}

export function compareBreedingOutcomes(expected: readonly GeneState[], observed: readonly GeneState[]) {
  const expectedMap = new Map(expected.map((gene) => [gene.geneId, gene.copies]));
  const observedMap = new Map(observed.map((gene) => [gene.geneId, gene.copies]));
  const allGenes = new Set([...expectedMap.keys(), ...observedMap.keys()]);
  return [...allGenes].map((geneId) => ({
    geneId,
    expectedCopies: expectedMap.get(geneId) ?? 0,
    observedCopies: observedMap.get(geneId) ?? 0,
    difference: (observedMap.get(geneId) ?? 0) - (expectedMap.get(geneId) ?? 0),
  }));
}

export function buildHatchlingContext(ageDays?: number) {
  if (ageDays === undefined || !Number.isFinite(ageDays)) return { mode: "unknown", note: "Age is not recorded; hatchling-specific assumptions are not applied." } as const;
  if (ageDays <= 90) return { mode: "hatchling", note: "Use the dedicated hatchling context alongside real weight, feeding and husbandry records." } as const;
  return { mode: "juvenile-or-older", note: "Hatchling-specific defaults are not applied after the configured hatchling window." } as const;
}

export function compareRecordedOutcome(outcome: BreedingOutcomeRecord, expected: readonly GeneState[]) {
  return {
    offspringId: outcome.offspringId,
    comparison: compareBreedingOutcomes(expected, outcome.claimedGenes),
    observedDate: outcome.observedDate ? toMillis(outcome.observedDate) : undefined,
    boundary: "Observed outcomes are compared with recorded expectations; the comparison does not rewrite the keeper's genetics record.",
  };
}

function toMillis(value: number | string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
