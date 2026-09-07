import { scoreSearchCandidate } from "./searchRanking";

export type SearchableItem = { name: string; [key: string]: unknown };

export function normaliseSearch(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[×✕+|/_,.-]+/g, " ").replace(/[^a-z0-9\s]+/g, " ").trim().replace(/\s+/g, " ");
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function scoreItem(item: SearchableItem, query: string): number {
  const aliases = stringArray(item.aliases);
  const keywords = stringArray(item.keywords);
  const contains = stringArray(item.contains);
  const searchTerms = stringArray(item.searchTerms);
  const geneticFormula = typeof item.geneticFormula === "string" ? [item.geneticFormula] : [];
  const directFormula = typeof item.directFormula === "string" ? [item.directFormula] : [];

  const scores = [
    scoreSearchCandidate(query, item.name, "canonical"),
    ...aliases.map((value) => scoreSearchCandidate(query, value, "alias")),
    ...keywords.map((value) => scoreSearchCandidate(query, value, "alias")),
    ...contains.map((value) => scoreSearchCandidate(query, value, "secondary")),
    ...searchTerms.map((value) => scoreSearchCandidate(query, value, "secondary")),
    ...geneticFormula.map((value) => scoreSearchCandidate(query, value, "secondary")),
    ...directFormula.map((value) => scoreSearchCandidate(query, value, "secondary")),
  ];

  const best = Math.max(0, ...scores);
  if (best > 0) return best;

  const q = normaliseSearch(query);
  if (q.split(" ").length !== 1) return 0;
  const name = normaliseSearch(item.name);
  const distance = Math.min(...name.split(" ").map((word) => editDistance(word, q)));
  return distance <= 2 ? Math.max(1, 300 - distance * 50) : 0;
}

export function rankSearchResults<T extends SearchableItem>(items: T[], query: string): T[] {
  const q = normaliseSearch(query);
  if (!q) return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return items
    .map((item, index) => ({ item, score: scoreItem(item, q), index }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" }) || a.index - b.index)
    .map((entry) => entry.item);
}
