export function normaliseSearchValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[×✕]/g, "x")
    .replace(/[+|/_,.-]+/g, " ")
    .replace(/\s+/g, " ");
}

function queryTokens(value: string): string[] {
  return [...new Set(normaliseSearchValue(value).split(" ").filter(Boolean))];
}

function tokenScore(query: string, candidate: string): number {
  const tokens = queryTokens(query);
  const candidateTokens = queryTokens(candidate);
  if (!tokens.length || !candidateTokens.length) return 0;

  // For a multi-word query, every query token must be represented before a
  // token match is allowed to outrank a genuine whole-name match. This stops
  // queries such as "Arctic Conda" being dominated by separate Arctic/Conda
  // records or unrelated descriptions containing only one word.
  const matched = tokens.filter((token) => candidateTokens.includes(token));
  if (matched.length !== tokens.length) return 0;

  return 250 + Math.min(150, candidateTokens.length - tokens.length <= 0 ? 150 : 100);
}

function prefixTokenScore(query: string, candidate: string): number {
  const tokens = queryTokens(query);
  const candidateTokens = queryTokens(candidate);
  if (!tokens.length || !candidateTokens.length) return 0;
  const matched = tokens.filter((token) => candidateTokens.some((candidateToken) => candidateToken.startsWith(token)));
  if (matched.length !== tokens.length) return 0;
  return 180;
}

/**
 * Keeper-facing search ranking. Exact canonical identity is deliberately much
 * stronger than aliases, components, descriptions, or fuzzy text so a precise
 * genetics term does not get buried under broad matches.
 */
export function scoreSearchCandidate(query: string, candidate: string, tier: "canonical" | "alias" | "secondary" = "secondary"): number {
  const q = normaliseSearchValue(query);
  const c = normaliseSearchValue(candidate);
  if (!q || !c) return 0;

  const base = tier === "canonical" ? 100000 : tier === "alias" ? 90000 : 70000;
  const prefixBase = tier === "canonical" ? 85000 : tier === "alias" ? 76000 : 56000;
  const tokenBase = tier === "canonical" ? 58000 : tier === "alias" ? 50000 : 32000;
  const fuzzyBase = tier === "canonical" ? 40000 : tier === "alias" ? 34000 : 18000;

  if (c === q) return base;
  if (c.startsWith(`${q} `)) return prefixBase + 900;
  if (c.startsWith(q)) return prefixBase;

  const wholeTokenMatch = tokenScore(q, c);
  if (wholeTokenMatch) return tokenBase + wholeTokenMatch;

  const prefixTokenMatch = prefixTokenScore(q, c);
  if (prefixTokenMatch) return fuzzyBase + 500 + prefixTokenMatch;

  if (c.includes(q)) return fuzzyBase;
  return 0;
}

export function scoreTextFields(query: string, fields: string[]): number {
  return Math.max(0, ...fields.map((field) => scoreSearchCandidate(query, field, "secondary")));
}

export type SearchScored<T> = { item: T; score: number };

export function rankSearchResults<T>(query: string, items: T[], getFields: (item: T) => {
  canonical?: string[];
  aliases?: string[];
  secondary?: string[];
}): SearchScored<T>[] {
  const raw = query.trim();
  if (!raw) return items.map((item) => ({ item, score: 0 }));

  return items
    .map((item, index) => {
      const fields = getFields(item);
      const canonicalScore = scoreTextFields(raw, fields.canonical ?? []);
      const aliasScore = scoreTextFields(raw, fields.aliases ?? []);
      const secondaryScore = scoreTextFields(raw, fields.secondary ?? []);
      return { item, score: Math.max(canonicalScore, aliasScore, secondaryScore) - index * 0.0001 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
