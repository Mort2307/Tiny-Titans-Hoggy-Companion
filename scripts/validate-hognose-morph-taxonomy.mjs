import fs from "node:fs";

const path = "src/data/hognoseMorphFullTaxonomy.ts";
const source = fs.readFileSync(path, "utf8");

const requiredNames = [
  "Red Line", "Red Line Conda", "Red Line Arctic", "Red Line Arctic Conda", "Red Line Albino", "Red Line Albino Conda", "Red Line Sable",
  "Purple Line", "Yellow Line", "Green Line", "Extreme Red", "Watermelon", "Phoenix Red", "Raging Red", "Twinspot", "Microscale Conda",
  "Stormcloud", "Maitai", "Candy Cocktail", "Super Daddy", "Silver Streak", "Yeti", "Super Yeti", "Subzero",
];

const sections = ["geneNames", "lineNames", "namedCombinations", "unverifiedNamedTerms"];
const sectionCounts = Object.fromEntries(sections.map((name) => {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) return [name, 0];
  return [name, (match[1].match(/"(?:[^"\\]|\\.)*"/g) ?? []).length / (name === "geneNames" ? 2 : 1)];
}));
const entryCount = sections.reduce((sum, name) => sum + Number(sectionCounts[name] ?? 0), 0);
const missing = requiredNames.filter((name) => !source.includes(`"${name}"`));
const hasSources = source.includes("HOGNOSE_MORPHS") && source.includes("HOGNOSE_POLYGENIC") && source.includes("REPTINODE");

const sectionValues = Object.fromEntries(sections.map((name) => {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) return [name, []];
  return [name, (match[1].match(/"(?:[^"\\]|\\.)*"/g) ?? []).map((value) => value.slice(1, -1).replace(/\\(["\\\\])/g, "$1"))];
}));

const duplicateOccurrences = new Map();
for (const section of sections) {
  for (const name of sectionValues[section] ?? []) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
    const occurrences = duplicateOccurrences.get(normalized) ?? [];
    occurrences.push(section);
    duplicateOccurrences.set(normalized, occurrences);
  }
}
const duplicates = [...duplicateOccurrences.entries()]
  .filter(([, occurrences]) => occurrences.length > 1)
  .map(([name, occurrences]) => `${name} (${occurrences.join(", ")})`);

console.log(`Western Hognose full taxonomy: ${entryCount} declared reference identities indexed.`);
console.log(`Required sentinel identities: ${requiredNames.length - missing.length}/${requiredNames.length}`);
console.log(`Source catalogue links present: ${hasSources ? "YES" : "NO"}`);

if (duplicates.length) {
  console.warn(`AUDIT NOTICE: ${duplicates.length} duplicate taxonomy identity${duplicates.length === 1 ? "" : "ies"} detected.`);
  duplicates.forEach((duplicate) => console.warn(`- ${duplicate}`));
}

const passed = entryCount >= 150 && missing.length === 0 && hasSources;
if (!passed) {
  if (entryCount < 150) console.error(`FAIL: expected at least 150 taxonomy identities, found ${entryCount}.`);
  if (missing.length) console.error(`FAIL: missing required identities: ${missing.join(", ")}`);
  if (!hasSources) console.error("FAIL: one or more source catalogue links are missing.");
  process.exit(1);
}

console.log("Hognose morph taxonomy validation passed.");
