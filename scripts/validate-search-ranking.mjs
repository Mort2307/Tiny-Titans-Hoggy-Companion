import assert from "node:assert/strict";

const normalise = (value) => value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[×✕+|/_,.-]+/g, " ").replace(/[^a-z0-9\s]+/g, " ").trim().replace(/\s+/g, " ");
const distance = (a, b) => { const row = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j += 1) { const current = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current; } } return row[b.length]; };
const rank = (items, query) => {
  const q = normalise(query); if (!q) return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const scored = items.map((item, index) => {
    const n = normalise(item.name);
    let score = n === q ? 1000 : n.startsWith(`${q} `) ? 900 : n.startsWith(q) ? 800 : n.split(" ").some((w) => w === q) ? 700 : n.split(" ").some((w) => w.startsWith(q)) ? 650 : n.includes(q) ? 500 : 0;
    if (!score && q.split(" ").length === 1) score = Math.max(...n.split(" ").map((w) => Math.max(0, 250 - distance(w, q) * 50)));
    return { item, score, index };
  });
  const exact = scored.filter((entry) => entry.score === 1000);
  if (exact.length) return exact.sort((a, b) => a.index - b.index).map((entry) => entry.item);
  return scored.filter((x) => x.score > 0).sort((a,b) => b.score - a.score || a.item.name.localeCompare(b.item.name, undefined, { sensitivity:"base" }) || a.index-b.index).map((x)=>x.item);
};

const exactComposition = [
  { name: "Arctic Conda" },
  { name: "Arctic" },
  { name: "Conda" },
  { name: "Albino Arctic" },
  { name: "Super Arctic Conda" },
  { name: "Arctic SuperConda" },
];

const results = rank([{name:"Super Arctic"},{name:"SuperConda"},{name:"Arctic SuperConda"},{name:"Conda"},{name:"Albino"}], "SuperConda");
assert.equal(results[0].name, "SuperConda", "Exact canonical match must rank first");
assert.deepEqual(rank([{name:"Zebra"},{name:"Alpha"}], ""), [{name:"Alpha"},{name:"Zebra"}], "Empty search must alphabetise");
assert.equal(rank([{name:"SuperConda"}], "super conda")[0].name, "SuperConda", "Spacing/case variations must resolve to canonical result");
assert.equal(rank([{name:"SuperConda"},{name:"Super Arctic"}], "SuprConda")[0].name, "SuperConda", "Useful typo must still resolve");
assert.deepEqual(rank(exactComposition, "Arctic Conda"), [{ name: "Arctic Conda" }], "Exact multi-word identity must suppress component and fuzzy neighbours");
assert.deepEqual(rank(exactComposition, "arctic conda"), [{ name: "Arctic Conda" }], "Case variations must preserve the exact identity boundary");
assert.deepEqual(rank(exactComposition, "Arctic+Conda"), [{ name: "Arctic Conda" }], "Genetic composition separators must resolve to the canonical identity");

console.log("Search ranking contract: PASS");
