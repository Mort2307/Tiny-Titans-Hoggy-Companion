import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const engine = fs.readFileSync(path.join(root, "src/intelligence/v50/geneticsSearchEngine.ts"), "utf8");
const registry = fs.readFileSync(path.join(root, "src/data/geneticsComboRegistry.ts"), "utf8");
const required = ["searchGenetics", "resolveGeneticsQuery", "formatGeneticsResolution", "findCalculatorNamedCombination"];
const findings = required.filter((name) => !engine.includes(`function ${name}`) && !engine.includes(`function ${name}<`)).map((name) => `Missing ${name}`);
if (!registry.includes("Grey Fog") || !registry.includes("Arctic Conda")) findings.push("Grey Fog recognition contract missing");
console.log(JSON.stringify({ test: "genetics-search-engine", status: findings.length ? "fail" : "pass", findings }, null, 2));
if (findings.length) process.exit(1);
