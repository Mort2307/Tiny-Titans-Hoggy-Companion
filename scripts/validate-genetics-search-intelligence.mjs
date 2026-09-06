import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const searchPath = path.join(root, "src", "intelligence", "v50", "geneticsSearchIntelligence.ts");
const registryPath = path.join(root, "src", "data", "geneticsComboRegistry.ts");
const search = fs.readFileSync(searchPath, "utf8");
const registry = fs.readFileSync(registryPath, "utf8");

const requiredSymbols = [
  "searchGeneticsIntelligence",
  "findCalculatorNamedCombination",
  "normaliseComboName",
  "componentSignature",
  "verification",
  "canonicalComponents",
  "commonCombinationName",
];
const findings = [];
for (const symbol of requiredSymbols) {
  if (!search.includes(symbol)) findings.push(`Missing genetics intelligence symbol/contract: ${symbol}`);
}
if (!registry.includes("Grey Fog")) findings.push("Canonical combo registry no longer contains the expected Grey Fog recognition anchor.");
if (!registry.includes("Arctic Conda")) findings.push("Canonical combo registry no longer contains the Arctic Conda alias anchor.");
if (!search.includes("Display aliases are lookup paths only")) findings.push("Search service is missing its uncertainty/alias boundary documentation.");

console.log(JSON.stringify({
  test: "genetics-search-intelligence-contract",
  evidence: {
    requiredContracts: requiredSymbols.length,
    satisfiedContracts: requiredSymbols.filter((symbol) => search.includes(symbol)).length,
    greyFogAnchor: registry.includes("Grey Fog"),
    arcticCondaAliasAnchor: registry.includes("Arctic Conda"),
  },
  status: findings.length ? "fail" : "pass",
  findings,
}, null, 2));

if (findings.length) process.exit(1);
