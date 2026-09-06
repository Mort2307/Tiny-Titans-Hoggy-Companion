import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const sources = [
  read("src/data/morphs.ts"),
  read("src/data/hognoseMorphCatalog.ts"),
  read("src/data/hognoseMorphFullTaxonomy.ts"),
  read("src/data/geneticsComboRegistry.ts"),
];
const text = sources.join("\n");

const counts = {
  genes: (text.match(/kind:\s*["']Gene["']/g) ?? []).length,
  supers: (text.match(/kind:\s*["']Super["']/g) ?? []).length,
  combinations: (text.match(/kind:\s*["']Combination["']/g) ?? []).length,
  lineBred: (text.match(/kind:\s*["']Line-bred["']/g) ?? []).length,
  polygenic: (text.match(/kind:\s*["']Polygenic["']/g) ?? []).length,
  projects: (text.match(/kind:\s*["']Project["']/g) ?? []).length,
};

const failures = [];
if (!text.includes('geneId: "conda"') || !text.includes('"Anaconda"')) failures.push("Conda/Anaconda identity contract missing.");
if (!text.includes('name: "Grey Fog"')) failures.push("Grey Fog record missing.");
if (!text.includes("Arctic") || !text.includes("Anaconda")) failures.push("Grey Fog component vocabulary missing.");
if (!text.includes('name: "Platinum"')) failures.push("Platinum record missing.");
if (!text.includes('name: "Superarctic Anaconda"')) failures.push("Superarctic Anaconda record missing.");
if (!text.includes('name: "Superarctic Superconda"')) failures.push("Superarctic Superconda record missing.");
if (!text.includes('name: "Albino Arctic Anaconda"')) failures.push("Albino Arctic Anaconda record missing.");
if (!text.includes('name: "Snow"')) failures.push("Snow record missing.");

console.log("Tiny Titans Hognose genetics audit");
console.log(JSON.stringify(counts, null, 2));
if (failures.length) {
  console.error(`Audit failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Core Hognose identity/combo invariants present. Detailed evidence conflicts remain explicitly represented for review.");
