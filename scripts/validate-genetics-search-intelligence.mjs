import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const searchPath = path.join(root, "src", "intelligence", "v50", "geneticsSearchIntelligence.ts");
const enginePath = path.join(root, "src", "intelligence", "v50", "geneticsSearchEngine.ts");
const registryPath = path.join(root, "src", "data", "geneticsComboRegistry.ts");
const uiPath = path.join(root, "src", "components", "GeneticsIntelligentSearch", "GeneticsIntelligentSearch.tsx");
const speciesAwarePath = path.join(root, "src", "pages", "SpeciesAwareMorphLibrary.tsx");
const search = fs.readFileSync(searchPath, "utf8");
const engine = fs.readFileSync(enginePath, "utf8");
const registry = fs.readFileSync(registryPath, "utf8");
const ui = fs.readFileSync(uiPath, "utf8");
const speciesAware = fs.readFileSync(speciesAwarePath, "utf8");

const requiredSymbols = [
  "searchGeneticsIntelligence",
  "findCalculatorNamedCombination",
  "normaliseComboName",
  "componentSignature",
  "verification",
  "canonicalComponents",
  "commonCombinationName",
  "speciesScientificName",
  "geneId",
];
const findings = [];
for (const symbol of requiredSymbols) {
  if (!search.includes(symbol)) findings.push(`Missing genetics intelligence symbol/contract: ${symbol}`);
}
for (const symbol of ["SPECIES_GENETICS_CATALOGUES", "searchSpeciesGenetics", "speciesScientificName", "hognoseMorphCatalog", "Heterodon nasicus"]) {
  if (!engine.includes(symbol)) findings.push(`Missing species-scoped engine contract: ${symbol}`);
}
for (const symbol of ["searchGeneticsIntelligence", "explainGeneticsSearch", "selectedSpecies", "speciesScientificName", "Arctic Conda", "Grey Fog", "geneId"]) {
  if (!ui.includes(symbol)) findings.push(`Missing intelligent genetics UI contract: ${symbol}`);
}
if (!speciesAware.includes("GeneticsIntelligentSearch")) findings.push("Morph Library entry point does not mount the intelligent genetics resolver.");
if (!registry.includes("Grey Fog")) findings.push("Canonical combo registry no longer contains the expected Grey Fog recognition anchor.");
if (!registry.includes("Arctic Conda")) findings.push("Canonical combo registry no longer contains the Arctic Conda alias anchor.");
if (!search.includes("speciesScientificName?[]") && !search.includes("speciesScientificName?")) findings.push("Search service is missing its species-scope boundary handling.");

console.log(JSON.stringify({
  test: "genetics-search-intelligence-contract",
  evidence: {
    requiredContracts: requiredSymbols.length,
    satisfiedContracts: requiredSymbols.filter((symbol) => search.includes(symbol)).length,
    speciesScopedContracts: ["SPECIES_GENETICS_CATALOGUES", "searchSpeciesGenetics", "speciesScientificName", "hognoseMorphCatalog", "Heterodon nasicus"].filter((symbol) => engine.includes(symbol)).length,
    uiContracts: ["searchGeneticsIntelligence", "explainGeneticsSearch", "selectedSpecies", "speciesScientificName", "Arctic Conda", "Grey Fog", "geneId"].filter((symbol) => ui.includes(symbol)).length,
    greyFogAnchor: registry.includes("Grey Fog"),
    arcticCondaAliasAnchor: registry.includes("Arctic Conda"),
    morphLibraryMounted: speciesAware.includes("GeneticsIntelligentSearch"),
  },
  status: findings.length ? "fail" : "pass",
  findings,
}, null, 2));

if (findings.length) process.exit(1);
