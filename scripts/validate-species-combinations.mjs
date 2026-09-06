import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const combinations = read("src/data/species/speciesGeneticsCombinations.ts");
const database = read("src/genetics/geneticsDatabase.ts");
const species = read("src/data/species/speciesGenetics.ts");
const catalogue = read("src/data/species/speciesGeneticsCatalogues.ts");
const calculator = read("src/pages/Calculator.tsx");
const packageJson = read("package.json");

const requiredSupported = [
  ["Corn Hypo Ashy", combinations.includes('["hypo-ashy", "Hypo Ashy"') && combinations.includes('"cinder"), component("Pantherophis guttatus", "hypomelanistic")')],
  ["Corn Inferno", combinations.includes('["inferno", "Inferno"') && combinations.includes('component("Pantherophis guttatus", "amel")')],
  ["Boa Ghost", combinations.includes('["ghost", "Ghost"') && combinations.includes('component("Boa constrictor", "anery-type-1")')],
  ["Boa Red Dragon is backlog only", combinations.includes('name: "Red Dragon"') === false && combinations.includes('name: "Red Dragon"') === false && combinations.includes('name: "Red Dragon"') === false],
  ["Burmese Pearl", combinations.includes('name: "Pearl"') && combinations.includes('component("Python bivittatus", "hypo")')],
  ["Burmese Blizzard", combinations.includes('name: "Blizzard"') && combinations.includes('component("Python bivittatus", "hypo", 2)')],
  ["Ball Blizzard", combinations.includes('name: "Blizzard"') && combinations.includes('component("Python regius", "black-pastel", 2)')],
  ["Ball Cherry Bomb", combinations.includes('name: "Cherry Bomb"') && combinations.includes('component("Python regius", "mojave", 2)')],
  ["Ball Sunglow", combinations.includes('name: "Sunglow"') && combinations.includes('component("Python regius", "ghost")')],
  ["Ball Whiplash", combinations.includes('name: "Whiplash"') && combinations.includes('component("Python regius", "jolt")')],
  ["Carpet Snow", combinations.includes('name: "Snow"') && combinations.includes('component("Morelia spilota", "axanthic")')],
  ["Sand Ghost", combinations.includes('name: "Ghost"') && combinations.includes('component(species, "hypomelanistic")')],
  ["Retic Sun Tiger", combinations.includes('name: "Sun Tiger"') && combinations.includes('component("Malayopython reticulatus", "tiger")')],
  ["Kingsnake Hybino", combinations.includes('name: "Hybino"') && combinations.includes('component("Lampropeltis californiae", "lavender-albino")')],
  ["Hognose Electric remains backlog until loci are authoritative", combinations.includes('name: "Electric"') === false && combinations.includes('name: "Electric"') === false],
];

const structural = [
  ["Database imports species combinations", database.includes('SPECIES_GENETICS_COMBINATIONS')],
  ["Species library imports combination morphs", species.includes('SPECIES_GENETICS_COMBINATION_MORPHS')],
  ["Calculator uses authoritative forecast", calculator.includes('calculateSpeciesGeneticsForecast')],
  ["Each promoted combo is recognised", !/status:\s*"(community_name|unresolved)"/.test(combinations)],
  ["Audit backlog exists", combinations.includes("SPECIES_GENETICS_COMBINATION_BACKLOG")],
  ["Burmese Hypo is incomplete dominant", catalogue.includes('["Hypo", "Incomplete Dominant"]')],
  ["Boa Moon Glow has Moonglow alias", combinations.includes('"Moonglow"') && combinations.includes('["moon-glow", "Moon Glow"')],
  ["Corn Ice Ghost is an alias of Ice", combinations.includes('["ice", "Ice"') && combinations.includes('"Ice Ghost"')],
  ["Build gate includes combination validator", packageJson.includes('validate:species-combinations')],
];

const failed = [...requiredSupported, ...structural].filter(([, ok]) => !ok);
for (const [label, ok] of [...requiredSupported, ...structural]) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
if (failed.length) {
  console.error(`\nSpecies combination validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log("\nSpecies combination validation passed.");
