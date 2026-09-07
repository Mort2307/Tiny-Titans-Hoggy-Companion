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

function tokenSequenceScore(query: string, candidate: string): number {
  const tokens = queryTokens(query);
  const candidateTokens = queryTokens(candidate);
  if (!tokens.length || !candidateTokens.length || tokens.length > candidateTokens.length) return 0;

  for (let start = 0; start <= candidateTokens.length - tokens.length; start += 1) {
    if (tokens.every((token, offset) => candidateTokens[start + offset] === token)) {
      const exactLengthBonus = candidateTokens.length === tokens.length ? 90 : 45;
      return 310 + exactLengthBonus - Math.max(0, candidateTokens.length - tokens.length) * 10;
    }
  }
  return 0;
}

function tokenScore(query: string, candidate: string): number {
  const tokens = queryTokens(query);
  const candidateTokens = queryTokens(candidate);
  if (!tokens.length || !candidateTokens.length) return 0;

  const matched = tokens.filter((token) => candidateTokens.includes(token));
  if (matched.length !== tokens.length) return 0;

  const extraTokens = Math.max(0, candidateTokens.length - tokens.length);
  return 250 + Math.max(0, 150 - extraTokens * 15);
}

function prefixTokenScore(query: string, candidate: string): number {
  const tokens = queryTokens(query);
  const candidateTokens = queryTokens(candidate);
  if (!tokens.length || !candidateTokens.length) return 0;

  const matched = tokens.filter((token) => candidateTokens.some((candidateToken) => candidateToken.startsWith(token)));
  if (matched.length !== tokens.length) return 0;
  return 180;
}

function looksLikeStructuredIdentity(value: string): boolean {
  return /[+×✕]|\bx\b/i.test(value);
}

/** Keeper-facing search ranking with deterministic identity short circuits. */
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

  const phraseMatch = tokenSequenceScore(q, c);
  if (phraseMatch) return tokenBase + phraseMatch;

  const wholeTokenMatch = tokenScore(q, c);
  if (wholeTokenMatch) return tokenBase + wholeTokenMatch;

  const prefixTokenMatch = prefixTokenScore(q, c);
  if (prefixTokenMatch) return fuzzyBase + 500 + prefixTokenMatch;

  if (c.includes(q)) return fuzzyBase;
  return 0;
}

export function scoreTextFields(query: string, fields: string[], tier: "canonical" | "alias" | "secondary" = "secondary"): number {
  return Math.max(0, ...fields.map((field) => scoreSearchCandidate(query, field, tier)));
}

export type SearchScored<T> = { item: T; score: number };

export function rankSearchResults<T>(query: string, items: T[], getFields: (item: T) => {
  canonical?: string[];
  aliases?: string[];
  secondary?: string[];
}): SearchScored<T>[] {
  const raw = query.trim();
  if (!raw) return items.map((item) => ({ item, score: 0 }));

  const normalizedQuery = normaliseSearchValue(raw);

  // An exact canonical identity is a hard result boundary.
  const exactCanonical = items
    .map((item, index) => ({ item, index, fields: getFields(item) }))
    .filter(({ fields }) => (fields.canonical ?? []).some((field) => normaliseSearchValue(field) === normalizedQuery))
    .map(({ item, index }) => ({ item, score: 100000 - index * 0.0001 }));
  if (exactCanonical.length) return exactCanonical.sort((a, b) => b.score - a.score);

  // Exact alias / recognised-name matches are the next identity boundary.
  const exactAlias = items
    .map((item, index) => ({ item, index, fields: getFields(item) }))
    .filter(({ fields }) => (fields.aliases ?? []).some((field) => normaliseSearchValue(field) === normalizedQuery))
    .map(({ item, index }) => ({ item, score: 90000 - index * 0.0001 }));
  if (exactAlias.length) return exactAlias.sort((a, b) => b.score - a.score);

  // Exact genetic formulas/compositions are treated as structured identities,
  // so "Arctic Conda" resolves directly to "Arctic + Conda" even when the
  // keeper-facing named combination is regional or otherwise differently named.
  const exactStructured = items
    .map((item, index) => ({ item, index, fields: getFields(item) }))
    .filter(({ fields }) => (fields.secondary ?? []).some((field) => looksLikeStructuredIdentity(field) && normaliseSearchValue(field) === normalizedQuery))
    .map(({ item, index }) => ({ item, score: 85000 - index * 0.0001 }));
  if (exactStructured.length) return exactStructured.sort((a, b) => b.score - a.score);

  return items
    .map((item, index) => {
      const fields = getFields(item);
      const canonicalScore = scoreTextFields(raw, fields.canonical ?? [], "canonical");
      const aliasScore = scoreTextFields(raw, fields.aliases ?? [], "alias");
      const secondaryScore = scoreTextFields(raw, fields.secondary ?? [], "secondary");
      const score = Math.max(canonicalScore, aliasScore, secondaryScore);
      return { item, score: score - index * 0.0001 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
