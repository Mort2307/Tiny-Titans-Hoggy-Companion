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

function structuredTokens(value: string): Map<string, number> {
  const rawTokens = queryTokens(value);
  const counts = new Map<string, number>();
  let superNext = false;

  for (let index = 0; index < rawTokens.length; index += 1) {
    const token = rawTokens[index];
    if (token === "super") {
      superNext = true;
      continue;
    }

    const attachedSuper = token.startsWith("super") && token.length > 5;
    const baseToken = attachedSuper ? token.slice(5) : token;
    if (!baseToken || baseToken === "x") continue;

    const next = rawTokens[index + 1];
    const explicitCopies = next === "x" && /^\d+$/.test(rawTokens[index + 2] ?? "")
      ? Number(rawTokens[index + 2])
      : undefined;
    const copies = superNext || attachedSuper ? 2 : explicitCopies ?? 1;
    counts.set(baseToken, Math.max(counts.get(baseToken) ?? 0, copies));
    superNext = false;

    if (explicitCopies !== undefined) index += 2;
  }

  return counts;
}

function structuredMatchScore(query: string, candidate: string): number {
  if (!candidate || !looksLikeStructuredIdentity(candidate)) return 0;

  const queryStructure = structuredTokens(query);
  const candidateStructure = structuredTokens(candidate);
  if (!queryStructure.size || !candidateStructure.size) return 0;
  if (queryStructure.size > candidateStructure.size) return 0;

  let exactKeys = true;
  let requestedCountTotal = 0;
  let candidateCountTotal = 0;
  for (const [token, requestedCopies] of queryStructure) {
    const candidateCopies = candidateStructure.get(token);
    if (!candidateCopies || candidateCopies < requestedCopies) return 0;
    requestedCountTotal += requestedCopies;
    candidateCountTotal += candidateCopies;
    if (!candidateStructure.has(token)) exactKeys = false;
  }

  const sameGeneSet = exactKeys && queryStructure.size === candidateStructure.size;
  if (sameGeneSet && requestedCountTotal === candidateCountTotal) return 520;
  if (sameGeneSet) return 490;
  return 430 - Math.max(0, candidateStructure.size - queryStructure.size) * 18;
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

/** Keeper-facing search ranking with deterministic genetic identity short circuits. */
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

  const structured = structuredMatchScore(q, c);
  if (structured) return tier === "secondary" ? 82000 + structured : tokenBase + structured;

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
  const scored = items.map((item, index) => {
    const fields = getFields(item);
    const canonical = fields.canonical ?? [];
    const aliases = fields.aliases ?? [];
    const secondary = fields.secondary ?? [];

    const exactCanonical = canonical.some((field) => normaliseSearchValue(field) === normalizedQuery);
    const exactAlias = aliases.some((field) => normaliseSearchValue(field) === normalizedQuery);
    const exactStructured = secondary.some((field) => normaliseSearchValue(field) === normalizedQuery && looksLikeStructuredIdentity(field));
    const structuredScore = Math.max(0, ...secondary.map((field) => structuredMatchScore(raw, field)));

    let score = Math.max(
      scoreTextFields(raw, canonical, "canonical"),
      scoreTextFields(raw, aliases, "alias"),
      scoreTextFields(raw, secondary, "secondary"),
    );

    if (exactCanonical) score += 400000;
    if (exactStructured) score += 360000;
    if (structuredScore) score = Math.max(score, 82000 + structuredScore);
    if (exactAlias) score += 250000;

    return { item, score: score - index * 0.0001 };
  });

  // Do not let a named phenotype/alias stop the search from surfacing a
  // genetically structured identity that matches the requested components.
  // Exact canonical identity still wins; exact genetic structure is next;
  // aliases and fuzzy text follow behind.
  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
