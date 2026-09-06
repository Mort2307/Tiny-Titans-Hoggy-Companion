import { GENETICS_DATABASE } from "../src/genetics/geneticsDatabase.ts";
import { SPECIES_GENETICS_COMBINATION_BACKLOG, SPECIES_GENETICS_COMBINATION_SPECS } from "../src/data/species/speciesGeneticsCombinations.ts";
import { HOGNOSE_GENETICS_DATABASE } from "../src/genetics/hognoseGenetics.ts";

const failures: string[] = [];
const promoted = new Set(SPECIES_GENETICS_COMBINATION_SPECS.map((combo) => `${combo.species}|${combo.name.toLowerCase()}`));

for (const combo of SPECIES_GENETICS_COMBINATION_SPECS) {
  const seenLoci = new Set<string>();
  for (const part of combo.components) {
    const locus = GENETICS_DATABASE.loci.find((candidate) => candidate.id === part.locusId);
    if (!locus) {
      failures.push(`${combo.species}/${combo.name}: missing locus ${part.locusId}`);
      continue;
    }
    if (locus.species !== combo.species) failures.push(`${combo.species}/${combo.name}: cross-species locus ${locus.species}`);
    if (!locus.alleles.some((allele) => allele.id === part.alleleId)) failures.push(`${combo.species}/${combo.name}: missing allele ${part.alleleId} on ${part.locusId}`);
    if (!Number.isInteger(part.copies) || part.copies < 1 || part.copies > 2) failures.push(`${combo.species}/${combo.name}: invalid copy count ${part.copies}`);
    if (seenLoci.has(part.locusId)) failures.push(`${combo.species}/${combo.name}: duplicate locus component ${part.locusId}`);
    seenLoci.add(part.locusId);
  }
}

for (const item of SPECIES_GENETICS_COMBINATION_BACKLOG) if (promoted.has(`${item.species}|${item.name.toLowerCase()}`)) failures.push(`${item.species}/${item.name}: promoted and backlog simultaneously`);

const expected = [
  ["Heterodon nasicus", "Grey Fog", HOGNOSE_GENETICS_DATABASE.combinations.some((combo) => combo.name === "Grey Fog") || GENETICS_DATABASE.combinations.some((combo) => combo.name === "Grey Fog")],
  ["Pantherophis guttatus", "Inferno", promoted.has("Pantherophis guttatus|inferno")],
  ["Pantherophis guttatus", "Hypo Ashy", promoted.has("Pantherophis guttatus|hypo ashy")],
  ["Boa constrictor", "Moon Glow", promoted.has("Boa constrictor|moon glow")],
  ["Python bivittatus", "Blizzard", promoted.has("Python bivittatus|blizzard")],
  ["Python regius", "Whiplash", promoted.has("Python regius|whiplash")],
  ["Morelia spilota", "Snow", promoted.has("Morelia spilota|snow")],
  ["Malayopython reticulatus", "Sun Tiger", promoted.has("Malayopython reticulatus|sun tiger")],
  ["Lampropeltis californiae", "Hybino", promoted.has("Lampropeltis californiae|hybino")],
];
for (const [species, name, ok] of expected) if (!ok) failures.push(`expected combination missing: ${species}/${name}`);

if (failures.length) {
  console.error("Species combination runtime validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Species combination runtime validation passed: ${SPECIES_GENETICS_COMBINATION_SPECS.length} promoted combinations, ${SPECIES_GENETICS_COMBINATION_BACKLOG.length} deferred combinations.`);
