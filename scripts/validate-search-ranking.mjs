import assert from "node:assert/strict";

const normalise = (value) => String(value).toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[×✕+|/_,.-]+/g, " ").replace(/[^a-z0-9\s]+/g, " ").trim().replace(/\s+/g, " ");
const tokens = (value) => [...new Set(normalise(value).split(" ").filter(Boolean))];
const signature = (value) => {
  const parts = tokens(value);
  const counts = new Map();
  let superNext = false;
  for (let i = 0; i < parts.length; i += 1) {
    const token = parts[i];
    if (token === "super") { superNext = true; continue; }
    if (token === "x") continue;
    const attachedSuper = token.startsWith("super") && token.length > 5;
    const base = attachedSuper ? token.slice(5) : token;
    if (!base) continue;
    const copies = attachedSuper || superNext ? 2 : parts[i + 1] === "x" && /^\d+$/.test(parts[i + 2] ?? "") ? Number(parts[i + 2]) : 1;
    counts.set(base, Math.max(counts.get(base) ?? 0, copies));
    superNext = false;
    if (!attachedSuper && copies > 1) i += 2;
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => `${name}#${count}`).join("|");
};
const rank = (items, query) => {
  const q = normalise(query); if (!q) return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return items
    .map((item, index) => {
      const n = normalise(item.name); const a = (item.aliases ?? []).map(normalise); const secondary = [...(item.searchTerms ?? []), item.geneticFormula ?? ""].filter(Boolean).map(normalise);
      const exactCanonical = n === q || normalise(item.geneId ?? "") === q;
      const exactAlias = a.includes(q);
      const exactStructure = secondary.some((field) => signature(field) && signature(field) === signature(q));
      const fuzzy = exactStructure ? 900000 : exactCanonical ? 1000000 : exactAlias ? 750000 : n.startsWith(q) ? 105000 : n.includes(q) ? 9000 : 0;
      return { item, score: fuzzy - index * 0.0001 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" }) || a.index - b.index)
    .map(({ item }) => item);
};

const exactComposition = [
  { name: "Arctic Conda" },
  { name: "Arctic" },
  { name: "Conda" },
  { name: "Albino Arctic" },
  { name: "Super Arctic Conda" },
  { name: "Arctic SuperConda" },
];

assert.equal(rank([{ name: "SuperConda" }, { name: "Super Arctic" }], "SuperConda")[0].name, "SuperConda");
assert.equal(rank([{ name: "SuperConda" }, { name: "Super Arctic" }], "super conda")[0].name, "SuperConda");
assert.equal(rank([{ name: "SuperConda" }, { name: "Super Arctic" }], "SuprConda")[0].name, "SuperConda");
assert.deepEqual(rank(exactComposition, "Arctic Conda"), [{ name: "Arctic Conda" }]);
assert.deepEqual(rank(exactComposition, "arctic conda"), [{ name: "Arctic Conda" }]);
assert.deepEqual(rank(exactComposition, "Arctic+Conda"), [{ name: "Arctic Conda" }]);
assert.deepEqual(rank(exactComposition, "Conda x Arctic"), [{ name: "Arctic Conda" }]);
assert.deepEqual(rank(exactComposition, "Arctic x Conda"), [{ name: "Arctic Conda" }]);
assert.deepEqual(rank([{ name: "Grey Fog", aliases: ["Arctic Conda"] }, { name: "Arctic Conda" }], "Arctic Conda"), [{ name: "Arctic Conda" }, { name: "Grey Fog", aliases: ["Arctic Conda"] }]);
assert.deepEqual(rank([{ name: "Alpha" }, { name: "Zebra" }], ""), [{ name: "Alpha" }, { name: "Zebra" }]);

console.log("Search ranking contract: PASS");
