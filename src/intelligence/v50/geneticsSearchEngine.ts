import { calculatorNamedCombinations, findCalculatorNamedCombination, normaliseComboName } from "../../data/geneticsComboRegistry";
import { morphs, type MorphDefinition } from "../../data/morphs";

export type GeneticsMatchKind = "canonical" | "alias" | "combination" | "fuzzy";

export interface GeneticsMatch {
  record: MorphDefinition;
  matchKind: GeneticsMatchKind;
  matchedQuery: string;
  score: number;
}

function normalise(value: string): string {
  return normaliseComboName(value).replace(/[+×x]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreName(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (candidate === query) return 100;
  if (candidate.startsWith(query)) return 88;
  if (candidate.includes(query)) return 72;
  const q = new Set(query.split(" ").filter(Boolean));
  const c = new Set(candidate.split(" ").filter(Boolean));
  const overlap = [...q].filter((token) => c.has(token)).length;
  return q.size ? Math.round((overlap / q.size) * 60) : 0;
}

function candidates(): MorphDefinition[] {
  return [...morphs, ...calculatorNamedCombinations.filter((combo) => !morphs.some((morph) => morph.geneId === combo.geneId))];
}

/**
 * Single canonical search engine for morph names, aliases and recognised
 * combinations. It never changes the underlying genetic record.
 */
export function searchGenetics(query: string): GeneticsMatch[] {
  const raw = query.trim();
  const q = normalise(raw);
  if (!q) return [];

  const exactCombination = findCalculatorNamedCombination(raw);
  if (exactCombination) return [{ record: exactCombination, matchKind: "combination", matchedQuery: raw, score: 100 }];

  const matches: GeneticsMatch[] = [];
  for (const record of candidates()) {
    const canonical = normalise(record.name);
    const aliasScores = (record.aliases ?? []).map((alias) => scoreName(q, normalise(alias)));
    const canonicalScore = scoreName(q, canonical);
    const bestAlias = Math.max(0, ...aliasScores);
    const score = Math.max(canonicalScore, bestAlias);
    if (score <= 0) continue;
    matches.push({ record, matchKind: canonicalScore >= bestAlias ? (record.isCombination ? "combination" : "canonical") : "alias", matchedQuery: raw, score });
  }

  return matches.sort((a, b) => b.score - a.score || a.record.name.localeCompare(b.record.name)).slice(0, 12);
}

export function resolveGeneticsQuery(query: string): GeneticsMatch | undefined {
  return searchGenetics(query)[0];
}

export function formatGeneticsResolution(match: GeneticsMatch): string {
  const { record } = match;
  const components = (record.components ?? []).map((component) => `${component.morphId}${component.copies && component.copies > 1 ? ` ×${component.copies}` : ""}`);
  if (record.isCombination) return `${record.name} [${components.join(" + ")}]`;
  return `${record.name} [${record.kind}]`;
}
