import { calculateGenome, calculateLocus, resolveCombination, type GeneticsDatabase, type LocusDefinition, type ParentGenome } from "../src/genetics/geneticsModel.ts";
import { HOGNOSE_GENETICS_DATABASE } from "../src/genetics/hognoseGenetics.ts";
import { CORN_SNAKE_GENETICS_DATABASE } from "../src/genetics/cornSnakeGenetics.ts";
import { buildSnakeGenome } from "../src/genetics/geneticsSnakeAdapter.ts";
import { calculateSpeciesGeneticsForecast } from "../src/genetics/geneticsForecast.ts";
import type { GeneticsCalculatorInput } from "../src/types/genetics.ts";

const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(`Genetics runtime test failed: ${message}`); };
const approx = (actual: number, expected: number, message: string) => assert(Math.abs(actual - expected) < 0.000001, `${message} (expected ${expected}, got ${actual})`);

const recessive: LocusDefinition = { id: "test-recessive", species: "Test species", name: "Test Recessive", inheritance: "recessive", alleles: [{ id: "wild", name: "Wild type", isWildType: true }, { id: "test", name: "Test" }], superStatus: "not_applicable", evidence: [] };
const dominant: LocusDefinition = { id: "test-dominant", species: "Test species", name: "Test Dominant", inheritance: "dominant", alleles: [{ id: "wild", name: "Wild type", isWildType: true }, { id: "test", name: "Test" }], superStatus: "not_applicable", evidence: [] };
const incomplete: LocusDefinition = { id: "test-incomplete", species: "Test species", name: "Test Incomplete", inheritance: "incomplete_dominant", alleles: [{ id: "wild", name: "Wild type", isWildType: true }, { id: "test", name: "Test" }], superStatus: "supported", superAlleleId: "test", evidence: [] };

const recessiveHetXHet = calculateLocus(recessive, { locusId: recessive.id, paternalAlleleId: "test", maternalAlleleId: "wild" }, { locusId: recessive.id, paternalAlleleId: "test", maternalAlleleId: "wild" }).outcomes;
approx(recessiveHetXHet.find((o) => o.phenotypeStatus === "visual")?.probability ?? 0, 0.25, "recessive het × het visual probability");
approx(recessiveHetXHet.find((o) => o.phenotypeStatus === "heterozygous")?.probability ?? 0, 0.5, "recessive het × het carrier probability");
approx(recessiveHetXHet.find((o) => o.phenotypeStatus === "wild_type")?.probability ?? 0, 0.25, "recessive het × het wild probability");

const dominantXWild = calculateLocus(dominant, { locusId: dominant.id, paternalAlleleId: "test", maternalAlleleId: "wild" }, { locusId: dominant.id, paternalAlleleId: "wild", maternalAlleleId: "wild" }).outcomes;
approx(dominantXWild.find((o) => o.phenotypeStatus === "visual")?.probability ?? 0, 0.5, "dominant × wild visual probability");
approx(dominantXWild.find((o) => o.phenotypeStatus === "wild_type")?.probability ?? 0, 0.5, "dominant × wild wild probability");

const incompleteXIncomplete = calculateLocus(incomplete, { locusId: incomplete.id, paternalAlleleId: "test", maternalAlleleId: "wild" }, { locusId: incomplete.id, paternalAlleleId: "test", maternalAlleleId: "wild" }).outcomes;
approx(incompleteXIncomplete.find((o) => o.superForm)?.probability ?? 0, 0.25, "incomplete dominant super probability");

const cornLocus = CORN_SNAKE_GENETICS_DATABASE.loci.find((locus) => locus.id === "pantherophis-guttatus-amel-locus");
assert(cornLocus, "Corn Snake Amel locus exists");
const allelicCross = calculateLocus(cornLocus, { locusId: cornLocus.id, paternalAlleleId: "amel", maternalAlleleId: "wild" }, { locusId: cornLocus.id, paternalAlleleId: "ultra", maternalAlleleId: "wild" }).outcomes;
assert(allelicCross.length === 4, "Amel × Ultra produces four allelic genotypes");
assert(allelicCross.some((o) => o.phenotypeStatus === "mixed_allelic"), "Amel/Ultra mixed genotype is explicitly marked mixed_allelic");
approx(allelicCross.reduce((sum, outcome) => sum + outcome.probability, 0), 1, "allelic probability total");

const hogCombo = resolveCombination(HOGNOSE_GENETICS_DATABASE, "Heterodon nasicus", "Grey Fog");
const hogAlias = resolveCombination(HOGNOSE_GENETICS_DATABASE, "Heterodon nasicus", "Arctic Conda");
assert(hogCombo?.id === hogAlias?.id, "Grey Fog reverse alias resolves to the same combination");
assert(hogCombo?.componentLocusIds.length === 2, "Grey Fog contains Arctic + Conda component loci");

const hogDatabase: GeneticsDatabase = HOGNOSE_GENETICS_DATABASE;
const arctic = hogDatabase.loci.find((locus) => locus.id === "heterodon-nasicus-arctic-antarctic");
const conda = hogDatabase.loci.find((locus) => locus.id === "heterodon-nasicus-conda");
assert(arctic && arctic.alleles.some((allele) => allele.id === "arctic") && conda, "Hognose Arctic allele and Conda locus exist");
const greyFogSnake = { id: "test-grey-fog", name: "Grey Fog", species: "Western Hognose", morphs: ["Grey Fog"], hets: [] } as never;
const greyFogGenome = buildSnakeGenome(greyFogSnake, hogDatabase);
assert(greyFogGenome.supported, "Grey Fog snake record remains canonical and supported");
assert(greyFogGenome.genome.states.some((state) => state.locusId === arctic.id) && greyFogGenome.genome.states.some((state) => state.locusId === conda.id), "Grey Fog expands into Arctic/Antarctic and Conda loci");

const parentA: ParentGenome = { species: "Heterodon nasicus", states: [{ locusId: arctic.id, paternalAlleleId: "arctic", maternalAlleleId: "wild" }, { locusId: conda.id, paternalAlleleId: "conda", maternalAlleleId: "wild" }] };
const parentB: ParentGenome = { species: "Heterodon nasicus", states: [] };
const completed = calculateGenome(hogDatabase, parentA, parentB);
assert(completed.length === hogDatabase.loci.length, "calculateGenome covers every registered Hognose locus");
const missingLocus = completed.find((result) => result.locus.id !== arctic.id && result.locus.id !== conda.id);
assert(missingLocus?.outcomes.some((outcome) => outcome.phenotypeStatus === "wild_type" && outcome.probability === 1), "missing parent loci are completed with wild type");

const hognoseInput = (female: GeneticsCalculatorInput["female"], male: GeneticsCalculatorInput["male"]): GeneticsCalculatorInput => ({ female, male });
const knownHetero = hognoseInput({ morphs: ["arctic"], hets: [], knownGeneCopies: { arctic: 1 } }, { morphs: [], hets: [] });
const knownForecast = calculateSpeciesGeneticsForecast("Heterodon nasicus", knownHetero);
assert(knownForecast.offspring.some((outcome) => outcome.certainty === "exact" && outcome.percentage === 50), "known Arctic one-copy × wild produces an exact 50% visual outcome");

const unknownDominant = calculateSpeciesGeneticsForecast("Heterodon nasicus", { female: { morphs: ["arctic"], hets: [] }, male: { morphs: [], hets: [] } });
assert(unknownDominant.offspring.some((outcome) => outcome.certainty === "bounded"), "unknown Arctic copy state remains conditional");
assert(unknownDominant.offspring.every((outcome) => outcome.percentage === undefined), "bounded outcomes do not pretend an exact percentage");

const crossSpeciesInput: ParentGenome = { species: "Pantherophis guttatus", states: [] };
let crossSpeciesRejected = false;
try { calculateGenome(hogDatabase, parentA, crossSpeciesInput); } catch (error) { crossSpeciesRejected = error instanceof Error && error.message.includes("Cross-species genetics are not supported"); }
assert(crossSpeciesRejected, "cross-species breeding is rejected");

console.log("Genetics runtime tests passed: inheritance, super states, alleles, aliases, combination expansion, bounded zygosity, wild completion and species safety.");