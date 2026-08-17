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
  return queryTokens.every((token) =>
    candidate.split(" ").some((part) => part === token || part.startsWith(token))
  );
}

function sameTokenSet(value: string, queryTokens: string[]): boolean {
  const candidateTokens = tokens(value);
  return candidateTokens.length === queryTokens.length && tokenMatch(value, queryTokens);
}

function scoreMorph(morph: MorphDefinition, query: string, mode: MorphSearchMode): number {
  const q = normaliseSearch(query);
  if (!q) return 0;

  const qTokens = tokens(q);
  const name = normaliseSearch(morph.name);
  const id = normaliseSearch(morph.geneId);
  const aliases = (morph.aliases ?? []).map(normaliseSearch).filter(Boolean);

  // MorphDefinition stores combination relationships as typed components;
  // there is deliberately no loose `contains` field. Component IDs are used
  // here as genetic identity evidence rather than treating arbitrary display
  // text as a match.
  const componentIds = (morph.components ?? [])
    .map((component) => normaliseSearch(component.morphId))
    .filter(Boolean);

  // Exact canonical identity always wins.
  if (name === q || id === q) return 1000;

  // A canonical name beginning with the query is a useful direct match,
  // but only when the query is not merely a token buried inside the name.
  if (name.startsWith(`${q} `)) return 850;
  if (name.startsWith(q)) return 800;

  // Strict selectors are intentionally conservative. A search for
  // "Super Arctic" must not surface "Albino Super Arctic" merely because
  // all query tokens occur somewhere in a longer candidate name.
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

  // General search may use token matching, but it remains deterministic and
  // only returns candidates containing every query token in canonical fields.
  if (componentIds.some((componentId) => tokenMatch(componentId, qTokens))) return 300;
  return -1;
}

export function rankMorphSearch<T extends MorphDefinition>(
  options: T[],
  query: string,
  mode: MorphSearchMode = "strict"
): T[] {
  const q = normaliseSearch(query);
  if (!q) return options;

  return options
    .map((option, index) => ({ option, index, score: scoreMorph(option, q, mode) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.option.name.localeCompare(b.option.name) ||
      a.index - b.index
    )
    .map((item) => item.option);
}

export function morphMatchesQuery(
  morph: MorphDefinition,
  query: string,
  mode: MorphSearchMode = "strict"
): boolean {
  return scoreMorph(morph, query, mode) >= 0;
}
