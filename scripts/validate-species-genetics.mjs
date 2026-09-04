import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];

function requireText(file, text, reason) {
  if (!read(file).includes(text)) failures.push(`${file}: ${reason}`);
}

function forbidText(file, text, reason) {
  if (read(file).includes(text)) failures.push(`${file}: ${reason}`);
}

requireText("src/components/Layout/Layout.tsx", "SpeciesAwareMorphLibrary", "the /morph-library shell must use the species-aware library entry point");
requireText("src/components/Layout/Layout.tsx", "SpeciesContextRouteSync", "the app shell must sync species context from snake-specific routes");
requireText("src/components/SnakeTile.tsx", "setSelectedSpeciesId", "snake selection must establish species context before navigation");
requireText("src/components/SnakeTile.tsx", "findSnakeSpecies", "snake selection must resolve persisted species through the canonical registry");
requireText("src/pages/SpeciesMorphLibrary.tsx", "getSpeciesVisualMorphs", "the non-Hognose Morph Library must consume species-scoped genetics");
requireText("src/pages/SpeciesMorphLibrary.tsx", "getSpeciesGeneticsStatus", "the Morph Library must expose honest species genetics coverage");
requireText("src/pages/Calculator.tsx", "getSpeciesGeneticsStatus", "the calculator must gate itself on species genetics coverage");
requireText("src/pages/Calculator.tsx", "const geneticsEnabled = geneticsStatus === \"mapped\"", "partial species catalogues must not unlock the Hognose calculator engine");
requireText("src/data/species/speciesGenetics.ts", "SPECIES_GENETICS_CATALOGUES", "species genetics must be backed by the dedicated species catalogue registry");
requireText("src/data/species/speciesGenetics.ts", '"mapped" | "partial" | "baseline-only"', "genetics coverage must distinguish full, partial and baseline-only species records");

forbidText("src/components/Layout/Header.tsx", "Hoggy Companion", "the in-app brand must be Tiny Titans Reptile Companion");
forbidText("src/components/PwaInstallCard.tsx", "Install Tiny Titans</h3>", "the PWA install surface must use the new app name");
forbidText("src/components/PwaInstallCard.tsx", "Hoggy Companion", "the PWA install surface must not retain the old product name");
forbidText("src/pages/SpeciesMorphLibrary.tsx", "masterMorphDatabase", "species Morph Library must not import the Hognose master database directly");

console.log(`Species genetics contract: ${failures.length ? "FAIL" : "PASS"}`);
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
