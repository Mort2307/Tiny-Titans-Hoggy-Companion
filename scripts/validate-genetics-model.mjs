import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  model: path.join(root, "src", "genetics", "geneticsModel.ts"),
  database: path.join(root, "src", "genetics", "geneticsDatabase.ts"),
  corn: path.join(root, "src", "genetics", "cornSnakeGenetics.ts"),
  hog: path.join(root, "src", "genetics", "hognoseGenetics.ts"),
};
for (const [name, file] of Object.entries(files)) if (!fs.existsSync(file)) throw new Error(`Missing genetics ${name} file: ${path.relative(root, file)}`);
const read = (file) => fs.readFileSync(file, "utf8");
const model = read(files.model), corn = read(files.corn), hog = read(files.hog), database = read(files.database);
for (const token of ["EvidenceRecord", "InheritanceModel", "AlleleDefinition", "LocusDefinition", "GeneticState", "calculateLocus", "calculateGenome", "resolveCombination"]) if (!model.includes(token)) throw new Error(`Genetics model missing required contract: ${token}`);
for (const token of ["pantherophis-guttatus-amel-locus", "Amel", "Ultra", "Motley", "Stripe", "inheritance: \"allelic\""]) if (!corn.includes(token)) throw new Error(`Corn Snake allelic model missing: ${token}`);
for (const token of ["Arctic", "Conda", "Grey Fog", "Arctic Conda"]) if (!hog.includes(token)) throw new Error(`Hognose combination model missing: ${token}`);
for (const token of ["CORN_SNAKE_GENETICS_DATABASE", "HOGNOSE_GENETICS_DATABASE", "SPECIES_GENETICS_CATALOGUES_EXPANDED"]) if (!database.includes(token)) throw new Error(`Genetics database registration missing: ${token}`);
if (!model.includes("Cross-species genetics are not supported")) throw new Error("Cross-species safety guard missing");
if (!model.includes("superAlleleId")) throw new Error("Super allele model missing");
console.log("✓ Genetics model contract validated");
console.log("✓ Copy-state / allele-state model present");
console.log("✓ Corn Snake allelic-series model present");
console.log("✓ Hognose combination resolver model present");
console.log("✓ Species-aware catalogue adapter registered");
console.log("✓ Cross-species safety guard present");
