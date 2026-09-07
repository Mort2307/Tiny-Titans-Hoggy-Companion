export type SearchableItem = { name: string; [key: string]: unknown };

export function normaliseSearch(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[×✕+|/_,.-]+/g, " ").replace(/[^a-z0-9\s]+/g, " ").trim().replace(/\s+/g, " ");
}

function scoreName(name: string, query: string): number {
  const n = normaliseSearch(name); const q = normaliseSearch(query);
  if (!q) return 0;
  if (n === q) return 1000;
  if (n.startsWith(`${q} `)) return 900;
  if (n.startsWith(q)) return 800;
  const words = n.split(" ");
  if (words.length === 1 && q.split(" ").length === 1 && editDistance(words[0], q) <= 2) return 300;
  if (words.some((word) => word === q)) return 700;
  if (words.some((word) => word.startsWith(q))) return 650;
  if (n.includes(` ${q} `) || n.includes(q)) return 500;
  return 0;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j += 1) { const current = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current; } }
  return row[b.length];
}

export function rankSearchResults<T extends SearchableItem>(items: T[], query: string): T[] {
  const q = normaliseSearch(query);
  if (!q) return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const scored = items.map((item, index) => ({ item, score: scoreName(item.name, q), index }));
  const exact = scored.filter((entry) => entry.score === 1000);
  if (exact.length) return exact.sort((a, b) => a.index - b.index).map((entry) => entry.item);

  return scored.filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" }) || a.index - b.index)
    .map((entry) => entry.item);
}
