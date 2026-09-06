import { GENETICS_DATABASE } from "../src/genetics/geneticsDatabase.ts";
import { SPECIES_GENETICS_COMBINATION_BACKLOG, SPECIES_GENETICS_COMBINATION_SPECS } from "../src/data/species/speciesGeneticsCombinations.ts";

const failures: string[] = [];
const speciesCombos = new Set(SPECIES_GENETICS_COMBINATION_SPECS.map((combo) => `${combo.species}|${combo.name.toLowerCase()}`));

for (const combo of SPECIES_GENETICS_COMBINATION_SPECS) {
  for (const component of combo.components) {
    const locus = GENETICS_DATABASE.loci.find((candidate) => candidate.id === component.locusId);
    if (!locus) {
      failures.push(`${combo.species} ${combo.name}: missing locus ${component.locusId}`);
      continue;
    }
    if (locus.species !== combo.species) failures.push(`${combo.species} ${combo.name}: cross-species locus ${locus.species}/${locus.id}`);
    if (!locus.alleles.some((allele) => allele.id === component.alleleId)) failures.push(`${combo.species} ${combo.name}: missing allele ${component.alleleId} on ${locus.id}`);
    if (!component.copies || component.copies < 1 || component.copies > 2) failures.push(`${combo.species} ${combo.name}: invalid copy count for ${component.alleleId}`);
  }
}

for (const item of SPECIES_GENETICS_COMBINATION_BACKLOG) {
  if (speciesCombos.has(`${item.species}|${item.name.toLowerCase()}`)) failures.push(`${item.species} ${item.name}: appears in both promoted catalogue and backlog`);
}

const expected = [
  "Pantherophis guttatus|inferno",
  "Pantherophis guttatus|hypo ashy",
  "Boa constrictor|ghost",
  "Boa constrictor|junglow",
  "Boa constrictor|moon glow",
  "Python bivittatus|pearl",
  "Python bivittatus|blizzard",
  "Python regius|blizzard",
  "Python regius|cherry bomb",
  "Python regius|sunglow",
  "Python regius|whiplash",
  "Morelia spilota|snow",
  "Malayopython reticulatus|snow",
  "Malayopython reticulatus|sun tiger",
  "Lampropeltis californiae|hybino",
];
for (const key of expected) if (!speciesCombos.has(key)) failures.push(`expected promoted combination missing: ${key}`);

if (failures.length) {
  console.error("Species combination runtime validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Species combination runtime validation passed: ${SPECIES_GENETICS_COMBINATION_SPECS.length} promoted combinations, ${SPECIES_GENETICS_COMBINATION_BACKLOG.length} documented backlog entries.`);
