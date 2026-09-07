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
  const tokens = queryTokens(value);
  const counts = new Map<string, number>();
  let pendingCopies: number | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "super") {
      pendingCopies = 2;
      continue;
    }
    if (token === "x") continue;

    const attachedSuper = token.startsWith("super") && token.length > 5;
    const baseToken = attachedSuper ? token.slice(5) : token;
    if (!baseToken) continue;

    const next = tokens[index + 1];
    const nextCopies = tokens[index + 2];
    const explicitCopies = next === "x" && /^\d+$/.test(nextCopies ?? "") ? Number(nextCopies) : undefined;
    const copies = attachedSuper || pendingCopies ? 2 : explicitCopies ?? 1;
    counts.set(baseToken, Math.max(counts.get(baseToken) ?? 0, copies));
    pendingCopies = undefined;
    if (explicitCopies !== undefined) index += 2;
  }
  return counts;
}

function isStructured(value: string): boolean {
  return /[+×✕]|\bx\b/i.test(value);
}

/** Returns an order-independent genetic signature; e.g. Arctic x Conda == Conda + Arctic. */
export function getSearchGeneticSignature(value: string): string {
  return [...structuredTokens(value).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([token, copies]) => `${token}#${copies}`)
    .join("|");
}

function structuredMatchScore(query: string, candidate: string): number {
  if (!isStructured(candidate)) return 0;
  const requested = structuredTokens(query);
  const available = structuredTokens(candidate);
  if (!requested.size || !available.size || requested.size > available.size) return 0;

  let totalRequested = 0;
  let totalAvailable = 0;
  for (const [token, copies] of requested) {
    const candidateCopies = available.get(token);
    if (!candidateCopies || candidateCopies < copies) return 0;
    totalRequested += copies;
    totalAvailable += candidateCopies;
  }

  const exactSignature = getSearchGeneticSignature(query) === getSearchGeneticSignature(candidate);
  if (exactSignature && totalRequested === totalAvailable) return 95000;
  if (exactSignature) return 90000;
  return 72000 - Math.max(0, available.size - requested.size) * 1200;
}

function tokenSequenceScore(query: string, candidate: string): number {
  const queryParts = queryTokens(query);
  const candidateParts = queryTokens(candidate);
  if (!queryParts.length || !candidateParts.length || queryParts.length > candidateParts.length) return 0;
  for (let start = 0; start <= candidateParts.length - queryParts.length; start += 1) {
    if (queryParts.every((token, offset) => candidateParts[start + offset] === token)) {
      const exactLength = queryParts.length === candidateParts.length;
      return 52000 + (exactLength ? 5000 : 1000);
    }
  }
  return 0;
}

function tokenScore(query: string, candidate: string): number {
  const queryParts = queryTokens(query);
  const candidateParts = queryTokens(candidate);
  if (!queryParts.length || !candidateParts.length) return 0;
  if (!queryParts.every((token) => candidateParts.includes(token))) return 0;
  return 43000 - Math.max(0, candidateParts.length - queryParts.length) * 750;
}

function prefixTokenScore(query: string, candidate: string): number {
  const queryParts = queryTokens(query);
  const candidateParts = queryTokens(candidate);
  if (!queryParts.length || !candidateParts.length) return 0;
  if (!queryParts.every((token) => candidateParts.some((candidateToken) => candidateToken.startsWith(token)))) return 0;
  return 26000;
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function conservativeTypoScore(query: string, candidate: string): number {
  const queryParts = queryTokens(query);
  const candidateParts = queryTokens(candidate);
  if (queryParts.length !== candidateParts.length || !queryParts.length) return 0;
  const matched = queryParts.every((token) => candidateParts.some((candidateToken) => editDistanceAtMostOne(token, candidateToken)));
  return matched ? 14000 : 0;
}

export function scoreSearchCandidate(query: string, candidate: string, tier: "canonical" | "alias" | "secondary" = "secondary"): number {
  const q = normaliseSearchValue(query);
  const c = normaliseSearchValue(candidate);
  if (!q || !c) return 0;

  const exactBase = tier === "canonical" ? 220000 : tier === "alias" ? 170000 : 120000;
  const prefixBase = tier === "canonical" ? 105000 : tier === "alias" ? 90000 : 70000;

  if (c === q) return exactBase;
  if (getSearchGeneticSignature(q) && getSearchGeneticSignature(q) === getSearchGeneticSignature(c)) {
    return (tier === "secondary" ? 180000 : prefixBase) + 4000;
  }
  if (c.startsWith(`${q} `)) return prefixBase + 1500;
  if (c.startsWith(q)) return prefixBase;

  const structured = structuredMatchScore(q, c);
  if (structured) return Math.max(0, structured + (tier === "secondary" ? 0 : 12000));

  const phrase = tokenSequenceScore(q, c);
  if (phrase) return phrase + (tier === "canonical" ? 8000 : tier === "alias" ? 4000 : 0);

  const wholeTokens = tokenScore(q, c);
  if (wholeTokens) return wholeTokens + (tier === "canonical" ? 6000 : tier === "alias" ? 3000 : 0);

  const prefixTokens = prefixTokenScore(q, c);
  if (prefixTokens) return prefixTokens + (tier === "canonical" ? 4000 : tier === "alias" ? 2000 : 0);

  const typo = conservativeTypoScore(q, c);
  if (typo) return typo + (tier === "canonical" ? 3000 : tier === "alias" ? 1500 : 0);

  if (c.includes(q)) return tier === "canonical" ? 9000 : tier === "alias" ? 7000 : 5000;
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

  return items
    .map((item, index) => {
      const fields = getFields(item);
      const canonical = fields.canonical ?? [];
      const aliases = fields.aliases ?? [];
      const secondary = fields.secondary ?? [];
      const scores = [
        scoreTextFields(raw, canonical, "canonical"),
        scoreTextFields(raw, aliases, "alias"),
        scoreTextFields(raw, secondary, "secondary"),
      ];
      const exactCanonical = canonical.some((field) => normaliseSearchValue(field) === normalizedQuery);
      const exactAlias = aliases.some((field) => normaliseSearchValue(field) === normalizedQuery);
      const exactStructured = secondary.some((field) => getSearchGeneticSignature(field) === getSearchGeneticSignature(raw) && getSearchGeneticSignature(raw));
      let score = Math.max(...scores, 0);
      if (exactCanonical) score += 1_000_000;
      else if (exactStructured) score += 900_000;
      else if (exactAlias) score += 750_000;
      return { item, score: score - index * 0.0001 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
