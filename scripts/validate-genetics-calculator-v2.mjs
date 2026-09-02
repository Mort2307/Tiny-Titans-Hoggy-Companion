import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const checks = [
  ["Calculator mode switch", read("src/pages/Calculator.tsx").includes("Morph Reversal") && read("src/pages/Calculator.tsx").includes("switchMode")],
  ["Reversal panel wired", read("src/pages/Calculator.tsx").includes("<MorphReversalPanel morphs={allMorphs} />")],
  ["Canonical output presentation", read("src/components/ResultCard.tsx").includes("getCanonicalOffspringPresentation")],
  ["Reversal engine", read("src/utils/geneticsReversal.ts").includes("export function reverseMorph")],
  ["Reversal panel resolver", read("src/components/MorphReversalPanel.tsx").includes("reverseMorph")],
  ["Dedicated reversal theme", read("src/components/MorphReversalTheme.css").includes(".morph-reversal-panel") && read("src/components/MorphReversalTheme.css").includes("var(--accent)")],
  ["Build gate", read("package.json").includes("validate:genetics-calculator-v2")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

if (failed.length) {
  console.error(`\nGenetics calculator v2 validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}

console.log("\nGenetics calculator v2 validation passed.");
