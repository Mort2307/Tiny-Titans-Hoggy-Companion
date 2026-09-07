import type { MorphDefinition } from "../data/morphs";

export type MorphSearchMode = "strict" | "combination" | "general";

export function normaliseSearch(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[×✕]/g, "x")
    .replace(/[+,/|]/g, " ")
    .replace(/[^\p{L}\p{N}%+\-x\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normaliseSearch(value).split(" ").filter(Boolean);
}

function tokenMatch(value: string, queryTokens: string[]): boolean {
  const candidate = normaliseSearch(value);
  return queryTokens.every((token) =>
    candidate.split(" ").some((part) => part === token || part.startsWith(token))
  );
}

function sameTokenSet(value: string, queryTokens: string[]): boolean {
  const candidateTokens = tokens(value);
  return candidateTokens.length === queryTokens.length && tokenMatch(value, queryTokens);
}

function sameCompositionTokenSet(a: string, b: string): boolean {
  const left = tokens(a).flatMap((token) => token === "x" ? [] : [token]).sort();
  const right = tokens(b).flatMap((token) => token === "x" ? [] : [token]).sort();
  return left.length > 1 && left.length === right.length && left.every((token, index) => token === right[index]);
}

function scoreMorph(morph: MorphDefinition, query: string, mode: MorphSearchMode): number {
  const q = normaliseSearch(query);
  if (!q) return 0;

  const qTokens = tokens(q);
  const name = normaliseSearch(morph.name);
  const id = normaliseSearch(morph.geneId);
  const aliases = (morph.aliases ?? []).map(normaliseSearch).filter(Boolean);
  const componentIds = (morph.components ?? []).map((component) => normaliseSearch(component.morphId)).filter(Boolean);

  if (name === q || id === q) return 1000;
  if (name.startsWith(`${q} `)) return 850;
  if (name.startsWith(q)) return 800;

  if (sameCompositionTokenSet(name, q) && morph.isCombination) return 980;
  if (sameCompositionTokenSet(aliases.find((alias) => sameCompositionTokenSet(alias, q)) ?? "", q)) return 960;

  if (mode === "strict") {
    if (sameTokenSet(name, qTokens)) return 700;
    if (aliases.some((alias) => alias === q || sameTokenSet(alias, qTokens))) return 650;
    return -1;
  }

  if (aliases.some((alias) => alias === q)) return 650;
  if (aliases.some((alias) => tokenMatch(alias, qTokens))) return 550;

  if (mode === "combination") {
    if (morph.isCombination && componentIds.some((componentId) => tokenMatch(componentId, qTokens))) return 500;
    return -1;
  }

  if (componentIds.some((componentId) => tokenMatch(componentId, qTokens))) return 300;
  return -1;
}

export function rankMorphSearch<T extends MorphDefinition>(options: T[], query: string, mode: MorphSearchMode = "strict"): T[] {
  const q = normaliseSearch(query);
  if (!q) return options;

  const scored = options.map((option, index) => ({ option, index, score: scoreMorph(option, q, mode) }));
  const exact = scored.filter((item) => item.score >= 1000 || (mode !== "strict" && item.score >= 950));
  if (exact.length) return exact.sort((a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name) || a.index - b.index).map((item) => item.option);

  return scored
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name) || a.index - b.index)
    .map((item) => item.option);
}

export function morphMatchesQuery(morph: MorphDefinition, query: string, mode: MorphSearchMode = "strict"): boolean {
  return scoreMorph(morph, query, mode) >= 0;
}
