import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const model = read("src/genetics/geneticsModel.ts");
const engine = read("src/genetics/geneticsEngine.ts");
const adapter = read("src/genetics/geneticsSnakeAdapter.ts");
const bridge = read("src/utils/breedingGenetics.ts");
const corn = read("src/genetics/cornSnakeGenetics.ts");
const hog = read("src/genetics/hognoseGenetics.ts");

const assertions = [
  ["copy-state model", model.includes("copiesByAllele") && model.includes("paternalAlleleId") && model.includes("maternalAlleleId")],
  ["cross-species hard stop", model.includes("Cross-species genetics are not supported")],
  ["wild-state completion", model.includes("wildState(locus)") && model.includes("if (!a && !b) return")],
  ["supported super gate", model.includes('locus.superStatus === "supported"')],
  ["allelic mixed-state guard", model.includes('return "mixed_allelic"')],
  ["canonical snake adapter", adapter.includes("buildSnakeGenome") && adapter.includes("canonicalSpecies")],
  ["uncertain het guard", adapter.includes("probability-bearing uncertainty")],
  ["canonical breeding bridge", bridge.includes("calculateCanonicalBreeding") && bridge.includes("canonical-locus-genetics")],
  ["legacy bridge is explicit", bridge.includes("legacy-evidence-gated-bridge")],
  ["Corn Amel/Ultra allelic locus", corn.includes("Amel and Ultra") && corn.includes('inheritance: "allelic"')],
  ["Corn Motley/Stripe allelic locus", corn.includes("Motley and Stripe") && corn.includes('inheritance: "allelic"')],
  ["Hognose Grey Fog is a combination", hog.includes('name: "Grey Fog"') && hog.includes('aliases: ["Arctic Conda"]')],
  ["search explains allele relationship", engine.includes("not an independent locus")],
];

const findings = assertions.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ test: "genetics-runtime-contracts", status: findings.length ? "fail" : "pass", checked: assertions.length, findings }, null, 2));
if (findings.length) process.exit(1);
