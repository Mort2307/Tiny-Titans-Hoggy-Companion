import fs from "node:fs";

const path = "src/data/hognoseMorphFullTaxonomy.ts";
const source = fs.readFileSync(path, "utf8");

const requiredNames = [
  "Red Line",
  "Red Line Conda",
  "Red Line Arctic",
  "Red Line Arctic Conda",
  "Red Line Albino",
  "Red Line Albino Conda",
  "Red Line Sable",
  "Purple Line",
  "Yellow Line",
  "Green Line",
  "Extreme Red",
  "Watermelon",
  "Phoenix Red",
  "Raging Red",
  "Twinspot",
  "Microscale Conda",
  "Stormcloud",
  "Maitai",
  "Candy Cocktail",
  "Super Daddy",
  "Silver Streak",
  "Yeti",
  "Super Yeti",
  "Subzero",
];

const entryCount = (source.match(/entry\("/g) ?? []).length;
const missing = requiredNames.filter((name) => !source.includes(`entry("${name}"`));
const hasSources = source.includes("HOGNOSE_MORPHS") && source.includes("HOGNOSE_POLYGENIC") && source.includes("REPTIFIT") && source.includes("REPTINODE");
const passed = entryCount >= 150 && missing.length === 0 && hasSources;

console.log(`Western Hognose full taxonomy: ${entryCount} named reference entries indexed.`);
console.log(`Required sentinel identities: ${requiredNames.length - missing.length}/${requiredNames.length}`);
console.log(`Source catalogue links present: ${hasSources ? "YES" : "NO"}`);

if (!passed) {
  if (entryCount < 150) console.error(`FAIL: expected at least 150 taxonomy entries, found ${entryCount}.`);
  if (missing.length) console.error(`FAIL: missing required identities: ${missing.join(", ")}`);
  if (!hasSources) console.error("FAIL: one or more source catalogue URLs are missing.");
  process.exit(1);
}

console.log("Hognose morph taxonomy validation passed.");
