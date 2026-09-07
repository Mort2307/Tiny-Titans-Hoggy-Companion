import { normaliseSearch } from "../utils/searchRelevance";

export type UniversalSearchKind =
  | "snake"
  | "morph"
  | "record"
  | "breeding-project"
  | "marketplace"
  | "learning"
  | "community";

export interface UniversalSearchItem {
  id: string;
  kind: UniversalSearchKind;
  title: string;
  subtitle?: string;
  description?: string;
  keywords?: string[];
  route: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface UniversalSearchResult extends UniversalSearchItem {
  score: number;
  matchedOn: string[];
}

function searchableFields(item: UniversalSearchItem): Array<[string, string]> {
  return [
    ["title", item.title],
    ["subtitle", item.subtitle ?? ""],
    ["description", item.description ?? ""],
    ["keywords", (item.keywords ?? []).join(" ")],
  ].map(([field, value]) => [field, normaliseSearch(value)]);
}

function score(item: UniversalSearchItem, query: string): { score: number; matchedOn: string[] } {
  const q = normaliseSearch(query);
  if (!q) return { score: 0, matchedOn: [] };

  const queryTokens = q.split(" ").filter(Boolean);
  const fields = searchableFields(item);
  const matchedOn: string[] = [];
  let total = 0;

  for (const [field, value] of fields) {
    if (!value) continue;
    if (value === q) {
      total += 1000;
      matchedOn.push(field);
      continue;
    }
    if (value.startsWith(`${q} `)) {
      total += 700;
      matchedOn.push(field);
      continue;
    }
    if (value.startsWith(q)) {
      total += 650;
      matchedOn.push(field);
      continue;
    }
    if (value.includes(q)) {
      total += 350;
      matchedOn.push(field);
      continue;
    }
    if (queryTokens.length > 1 && queryTokens.every((token) => value.split(" ").some((part) => part === token))) {
      total += 225;
      matchedOn.push(field);
    }
  }

  if (matchedOn.includes("title")) total += 250;
  if (matchedOn.includes("keywords")) total += 75;

  return { score: total, matchedOn };
}

export function searchTinyTitans(
  items: readonly UniversalSearchItem[],
  query: string,
  options?: { kinds?: readonly UniversalSearchKind[]; limit?: number },
): UniversalSearchResult[] {
  const q = normaliseSearch(query);
  if (!q) return [];

  const allowedKinds = options?.kinds;
  const limit = Math.max(1, options?.limit ?? 30);
  const scoped = items.filter((item) => !allowedKinds || allowedKinds.includes(item.kind));

  const exactTitle = scoped.filter((item) => normaliseSearch(item.title) === q).map((item) => ({ ...item, score: 100000, matchedOn: ["title"] }));
  if (exactTitle.length) return exactTitle.slice(0, limit);

  const exactKeyword = scoped.filter((item) => (item.keywords ?? []).some((keyword) => normaliseSearch(keyword) === q)).map((item) => ({ ...item, score: 90000, matchedOn: ["keywords"] }));
  if (exactKeyword.length) return exactKeyword.slice(0, limit);

  return scoped
    .map((item) => {
      const result = score(item, q);
      return { item, ...result };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map(({ item, score: resultScore, matchedOn }) => ({ ...item, score: resultScore, matchedOn }));
}
