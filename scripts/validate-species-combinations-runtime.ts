import { GENETICS_DATABASE, getCombinationByName } from "../src/genetics/geneticsDatabase.ts";
import { SPECIES_GENETICS_COMBINATION_BACKLOG, SPECIES_GENETICS_COMBINATION_SPECS } from "../src/data/species/speciesGeneticsCombinations.ts";
import { HOGNOSE_GENETICS_DATABASE } from "../src/genetics/hognoseGenetics.ts";

const failures: string[] = [];
const promoted = new Set(SPECIES_GENETICS_COMBINATION_SPECS.map((combo) => `${combo.species}|${combo.name.toLowerCase()}`));
for (const combo of SPECIES_GENETICS_COMBINATION_SPECS) {
  const seenLoci = new Set<string>();
  if (!getCombinationByName(combo.species, combo.name)) failures.push(`${combo.species}/${combo.name}: not present in authoritative GENETICS_DATABASE`);
  for (const alias of combo.aliases ?? []) if (!getCombinationByName(combo.species, alias)) failures.push(`${combo.species}/${combo.name}: alias does not resolve: ${alias}`);
  for (const part of combo.components) {
    const locus = GENETICS_DATABASE.loci.find((candidate) => candidate.id === part.locusId);
    if (!locus) { failures.push(`${combo.species}/${combo.name}: missing locus ${part.locusId}`); continue; }
    if (locus.species !== combo.species) failures.push(`${combo.species}/${combo.name}: cross-species locus ${locus.species}`);
    if (!locus.alleles.some((allele) => allele.id === part.alleleId)) failures.push(`${combo.species}/${combo.name}: missing allele ${part.alleleId} on ${part.locusId}`);
    if (!Number.isInteger(part.copies) || part.copies < 1 || part.copies > 2) failures.push(`${combo.species}/${combo.name}: invalid copy count ${part.copies}`);
    if (seenLoci.has(part.locusId)) failures.push(`${combo.species}/${combo.name}: duplicate locus component ${part.locusId}`);
    seenLoci.add(part.locusId);
  }
}
for (const item of SPECIES_GENETICS_COMBINATION_BACKLOG) if (promoted.has(`${item.species}|${item.name.toLowerCase()}`)) failures.push(`${item.species}/${item.name}: promoted and backlog simultaneously`);
const expected = [["Heterodon nasicus", "Grey Fog"], ["Pantherophis guttatus", "Inferno"], ["Pantherophis guttatus", "Hypo Ashy"], ["Boa constrictor", "Moon Glow"], ["Python bivittatus", "Blizzard"], ["Python regius", "Whiplash"], ["Morelia spilota", "Snow"], ["Malayopython reticulatus", "Sun Tiger"], ["Lampropeltis californiae", "Hybino"]];
for (const [species, name] of expected) {
  const ok = species === "Heterodon nasicus" ? HOGNOSE_GENETICS_DATABASE.combinations.some((combo) => combo.name === name) : promoted.has(`${species}|${name.toLowerCase()}`);
  if (!ok) failures.push(`expected combination missing: ${species}/${name}`);
}
if (failures.length) { console.error("Species combination runtime validation failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log(`Species combination runtime validation passed: ${SPECIES_GENETICS_COMBINATION_SPECS.length} promoted combinations, ${SPECIES_GENETICS_COMBINATION_BACKLOG.length} deferred combinations.`);
