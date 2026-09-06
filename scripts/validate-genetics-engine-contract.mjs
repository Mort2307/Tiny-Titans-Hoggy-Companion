import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  engine: fs.readFileSync(path.join(root, "src/intelligence/v50/geneticsSearchEngine.ts"), "utf8"),
  adapter: fs.readFileSync(path.join(root, "src/intelligence/v50/geneticsSearchIntelligence.ts"), "utf8"),
  registry: fs.readFileSync(path.join(root, "src/data/geneticsComboRegistry.ts"), "utf8"),
  workspace: fs.readFileSync(path.join(root, "src/components/TitanIntelligence/TitanGeneticsWorkspace.tsx"), "utf8"),
};
const required = [
  ["canonical search", "searchGenetics"],
  ["query resolver", "resolveGeneticsQuery"],
  ["presentation formatter", "formatGeneticsResolution"],
  ["evidence adapter", "searchGeneticsIntelligence"],
  ["Grey Fog", "Grey Fog"],
  ["Arctic Conda alias", "Arctic Conda"],
  ["confidence", "confidence"],
];
const findings = required.filter(([, token]) => !Object.values(files).some((content) => content.includes(token))).map(([name]) => `Missing ${name}`);
for (const token of ["aliases", "components", "verification"]) if (!files.registry.includes(token)) findings.push(`Registry missing ${token}`);
console.log(JSON.stringify({ test: "genetics-engine-contract", status: findings.length ? "fail" : "pass", findings }, null, 2));
if (findings.length) process.exit(1);
