import type { MorphDefinition } from "../data/morphs";

export type MorphSearchMode = "strict" | "combination" | "general";

export function normaliseSearch(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[^\p{L}\p{N}%+\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normaliseSearch(value).split(" ").filter(Boolean);
}

function tokenMatch(value: string, queryTokens: string[]): boolean {
  const candidate = normaliseSearch(value);
  return queryTokens.every((token) => candidate.split(" ").some((part) => part === token || part.startsWith(token)));
}

function scoreMorph(morph: MorphDefinition, query: string, mode: MorphSearchMode): number {
  const q = normaliseSearch(query);
  if (!q) return 0;
  const qTokens = tokens(q);
  const name = normaliseSearch(morph.name);
  const id = normaliseSearch(morph.geneId);
  const aliases = (morph.aliases ?? []).map(normaliseSearch).filter(Boolean);
  const directFields = [name, id];
  const combinationFields = [name, id, ...(morph.contains ?? []).map(normaliseSearch)];

  if (name === q || id === q) return 1000;
  if (directFields.some((field) => field === q)) return 900;
  if (name.startsWith(`${q} `) || name.startsWith(q)) return 800;
  if (tokenMatch(name, qTokens)) return 700;
  if (mode !== "strict" && aliases.some((alias) => alias === q)) return 650;
  if (mode !== "strict" && aliases.some((alias) => tokenMatch(alias, qTokens))) return 550;

  if (mode === "combination") {
    if (morph.isCombination && combinationFields.some((field) => tokenMatch(field, qTokens))) return 500;
    return -1;
  }

  if (mode === "strict") return -1;
  if (combinationFields.some((field) => tokenMatch(field, qTokens))) return 300;
  return -1;
}

export function rankMorphSearch<T extends MorphDefinition>(options: T[], query: string, mode: MorphSearchMode = "strict"): T[] {
  const q = normaliseSearch(query);
  if (!q) return options;

  return options
    .map((option, index) => ({ option, index, score: scoreMorph(option, q, mode) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name) || a.index - b.index)
    .map((item) => item.option);
}

export function morphMatchesQuery(morph: MorphDefinition, query: string, mode: MorphSearchMode = "strict"): boolean {
  return scoreMorph(morph, query, mode) >= 0;
}
