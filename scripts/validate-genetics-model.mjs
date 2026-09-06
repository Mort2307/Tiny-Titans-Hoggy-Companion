import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modelPath = path.join(root, "src", "genetics", "geneticsModel.ts");
const databasePath = path.join(root, "src", "genetics", "geneticsDatabase.ts");
const cornPath = path.join(root, "src", "genetics", "cornSnakeGenetics.ts");
const hogPath = path.join(root, "src", "genetics", "hognoseGenetics.ts");

for (const file of [modelPath, databasePath, cornPath, hogPath]) {
  if (!fs.existsSync(file)) throw new Error(`Missing genetics model file: ${path.relative(root, file)}`);
}

const model = fs.readFileSync(modelPath, "utf8");
const corn = fs.readFileSync(cornPath, "utf8");
const hog = fs.readFileSync(hogPath, "utf8");
const database = fs.readFileSync(databasePath, "utf8");

const requiredModelTokens = [
  "EvidenceRecord",
  "InheritanceModel",
  "AlleleDefinition",
  "LocusDefinition",
  "GeneticState",
  "calculateLocus",
  "calculateGenome",
  "resolveCombination",
];
for (const token of requiredModelTokens) {
  if (!model.includes(token)) throw new Error(`Genetics model missing required token: ${token}`);
}

for (const token of ["amel-locus", "ultra", "motley", "stripe", "inheritance: \"allelic\""]) {
  if (!corn.includes(token)) throw new Error(`Corn allelic model missing: ${token}`);
}
for (const token of ["Arctic", "Conda", "Grey Fog", "Arctic Conda"]) {
  if (!hog.includes(token)) throw new Error(`Hognose model missing: ${token}`);
}
if (!database.includes("CORN_SNAKE_GENETICS_DATABASE")) throw new Error("Corn genetics database is not registered");
if (!database.includes("HOGNOSE_GENETICS_DATABASE")) throw new Error("Hognose genetics database is not registered");
if (model.includes("Cross-species genetics are not supported")) {
  console.log("✓ Cross-species safety guard present");
}
console.log("✓ Genetics model contract validated");
console.log("✓ Allelic-series model present");
console.log("✓ Hognose combination model present");
console.log("✓ Species-aware database registration present");
