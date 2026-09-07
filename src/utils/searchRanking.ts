export function normaliseSearchValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[×✕]/g, "x")
    .replace(/[+|/_,.-]+/g, " ")
    .replace(/\s+/g, " ");
}

function tokenScore(query: string, candidate: string): number {
  const queryTokens = [...new Set(query.split(" ").filter(Boolean))];
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  if (!queryTokens.length) return 0;
  const matched = queryTokens.filter((token) => candidateTokens.has(token)).length;
  if (!matched) return 0;
  return Math.round((matched / queryTokens.length) * 250);
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
  if (c === q) return tier === "canonical" ? 100000 : tier === "alias" ? 90000 : 70000;
  if (c.startsWith(`${q} `)) return tier === "canonical" ? 85000 : tier === "alias" ? 76000 : 56000;
  if (c.startsWith(q)) return tier === "canonical" ? 82000 : tier === "alias" ? 73000 : 54000;

  const tokens = tokenScore(q, c);
  if (tokens) {
    if (tier === "canonical") return 58000 + tokens;
    if (tier === "alias") return 50000 + tokens;
    return 32000 + tokens;
  }

  if (c.includes(q)) return tier === "canonical" ? 40000 : tier === "alias" ? 34000 : 18000;
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
