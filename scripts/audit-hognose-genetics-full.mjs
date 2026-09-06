import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const files = ["src/data/morphs.ts", "src/data/hognoseMorphCatalog.ts", "src/data/hognoseMorphFullTaxonomy.ts", "src/data/geneticsComboRegistry.ts"];
const text = files.map(read).join("\n");
const counts = {
  geneRecords: (text.match(/kind:\s*["']Gene["']/g) ?? []).length,
  superRecords: (text.match(/kind:\s*["']Super["']/g) ?? []).length,
  combinationRecords: (text.match(/kind:\s*["']Combination["']/g) ?? []).length,
  lineBredRecords: (text.match(/kind:\s*["']Line-bred["']/g) ?? []).length,
  polygenicRecords: (text.match(/kind:\s*["']Polygenic["']/g) ?? []).length,
  projectRecords: (text.match(/kind:\s*["']Project["']/g) ?? []).length,
};
const requiredNames = ["Grey Fog", "Platinum", "Superarctic Anaconda", "Superarctic Superconda", "Albino Arctic Anaconda", "Snow"];
const failures = [];
for (const name of requiredNames) if (!text.includes(`name: \"${name}\"`) && !text.includes(`name: '${name}'`)) failures.push(`Missing recognised record: ${name}`);
if (!text.includes('geneId: "conda"') || !text.includes('"Anaconda"')) failures.push("Conda/Anaconda canonical identity contract missing.");
if (failures.length) { console.error(JSON.stringify({ counts, failures }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ counts, status: "core Hognose identity/combo invariants present" }, null, 2));
