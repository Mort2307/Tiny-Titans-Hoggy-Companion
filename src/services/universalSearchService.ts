import { normaliseSearchValue, scoreSearchCandidate } from "../utils/searchRanking";

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

function score(item: UniversalSearchItem, query: string): { score: number; matchedOn: string[] } {
  const raw = query.trim();
  if (!raw) return { score: 0, matchedOn: [] };

  const fields: Array<[string, string, "canonical" | "alias" | "secondary"]> = [
    ["title", item.title, "canonical"],
    ["keywords", (item.keywords ?? []).join(" "), "alias"],
    ["subtitle", item.subtitle ?? "", "secondary"],
    ["description", item.description ?? "", "secondary"],
  ];

  const scoredFields = fields
    .map(([field, value, tier]) => ({ field, value, score: scoreSearchCandidate(raw, value, tier) }))
    .filter((field) => field.score > 0);
  if (!scoredFields.length) return { score: 0, matchedOn: [] };

  const best = Math.max(...scoredFields.map((field) => field.score));
  const matchedOn = scoredFields.filter((field) => field.score === best).map((field) => field.field);
  return { score: best, matchedOn };
}

export function searchTinyTitans(
  items: readonly UniversalSearchItem[],
  query: string,
  options?: { kinds?: readonly UniversalSearchKind[]; limit?: number },
): UniversalSearchResult[] {
  const q = normaliseSearchValue(query);
  if (!q) return [];

  const allowedKinds = options?.kinds;
  const limit = Math.max(1, options?.limit ?? 30);
  const scoped = items.filter((item) => !allowedKinds || allowedKinds.includes(item.kind));

  return scoped
    .map((item, index) => {
      const result = score(item, q);
      return { item, score: result.score - index * 0.0001, matchedOn: result.matchedOn };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map(({ item, score: resultScore, matchedOn }) => ({ ...item, score: resultScore, matchedOn }));
}
