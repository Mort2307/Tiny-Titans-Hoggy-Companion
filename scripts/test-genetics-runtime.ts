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

const wildGenome = (): ParentGenome => ({ species: "Heterodon nasicus", states: hogDatabase.loci.map((locus) => ({
  locusId: locus.id,
  paternalAlleleId: locus.alleles.find((allele) => allele.isWildType)!.id,
  maternalAlleleId: locus.alleles.find((allele) => allele.isWildType)!.id,
})) });
const parentA: ParentGenome = wildGenome();
parentA.states = parentA.states.map((state) => state.locusId === arctic.id ? { ...state, paternalAlleleId: "arctic" } : state.locusId === conda.id ? { ...state, paternalAlleleId: "conda" } : state);
const parentB: ParentGenome = wildGenome();
const completed = calculateGenome(hogDatabase, parentA, parentB);
assert(completed.length === hogDatabase.loci.length, "Explicit parental genotypes cover all registered Hognose loci");
let missingRejected = false;
try { calculateGenome(hogDatabase, { ...parentA, states: parentA.states.filter((state) => state.locusId === arctic.id) }, parentB); }
catch (error) { missingRejected = error instanceof Error && error.message.includes("both parental genotypes must be explicitly documented"); }
assert(missingRejected, "Incomplete parental genotypes fail closed rather than becoming wild type");

const hognoseInput = (female: GeneticsCalculatorInput["female"], male: GeneticsCalculatorInput["male"]): GeneticsCalculatorInput => ({ female, male });
const knownHetero = hognoseInput({ morphs: ["arctic"], hets: [], knownGeneCopies: { arctic: 1 } }, { morphs: [], hets: [] });
const knownForecast = calculateSpeciesGeneticsForecast("Heterodon nasicus", knownHetero);
assert(knownForecast.offspring.length > 0 && knownForecast.hasUnresolvedGenetics && knownForecast.offspring.every((entry) => entry.certainty === "bounded" && entry.percentage === undefined), "Undocumented Arctic genotype produces conditional outcomes, never an invented exact percentage");

const documentedClear = calculateSpeciesGeneticsForecast("Heterodon nasicus", {
  female: { morphs: ["arctic"], hets: [], knownGeneCopies: { arctic: 1 } },
  male: { morphs: [], hets: [], confirmedClearLoci: [arctic.id] },
});
assert(documentedClear.offspring.some((outcome) => outcome.certainty === "exact" && outcome.percentage === 50 && outcome.visualComponents.some((part) => part.geneId === "arctic")), "explicitly documented clear Arctic locus restores a valid 50% offspring forecast");
assert(!documentedClear.hasUnresolvedGenetics, "documented clear state does not silently introduce uncertainty");

const unknownDominant = calculateSpeciesGeneticsForecast("Heterodon nasicus", { female: { morphs: ["arctic"], hets: [] }, male: { morphs: [], hets: [] } });
assert(unknownDominant.offspring.length > 0 && unknownDominant.hasUnresolvedGenetics && unknownDominant.offspring.every((entry) => entry.certainty === "bounded"), "Undocumented Arctic copy states and an untested partner must remain conditional");

// Owner-reported saved-animal regression: Lilith (Super Arctic, 100% het
// Albino, 66% possible het Lavender) x Mort (Arctic, Super Conda, Platinum,
// 100% het Lavender). Platinum is the same Arctic x1 + Conda x2 composition,
// so redundant selected names must not add an impossible third gene copy.
const savedLilithMort = calculateSpeciesGeneticsForecast("Heterodon nasicus", {
  female: { morphs: ["super-arctic"], hets: ["albino", "lavender"], hetPercentages: { albino: "100%", lavender: "66%" } },
  male: { morphs: ["arctic", "super-conda", "platinum"], hets: ["lavender"], hetPercentages: { lavender: "100%" } },
});
assert(savedLilithMort.offspring.length > 0, "Super Arctic x Arctic/Platinum saved pairing must never collapse to zero outcomes");
assert(savedLilithMort.hasUnresolvedGenetics && savedLilithMort.offspring.every((entry) => entry.certainty === "bounded" && entry.percentage === undefined), "Unknown unrecorded loci must mark full Lilith/Mort forecasts conditional, not exact");
assert(savedLilithMort.offspring.some((entry) => entry.visualComponents.some((part) => part.geneId === "arctic" && part.copies === 2)), "Pairing must include Super Arctic offspring");
assert(savedLilithMort.offspring.some((entry) => entry.visualComponents.some((part) => part.geneId === "arctic" && part.copies === 1)), "Pairing must include single-copy Arctic offspring");
assert(savedLilithMort.offspring.some((entry) => entry.visualComponents.some((part) => part.geneId === "conda" && part.copies === 1)), "Super Conda male must pass one Conda allele under the conditional clear-mother baseline");
assert(savedLilithMort.offspring.every((entry) => !entry.visualComponents.some((part) => ["platinum", "super-arctic", "super-conda"].includes(part.geneId))), "Super and Platinum labels must resolve to underlying loci rather than independent genes");
assert(savedLilithMort.offspring.every((entry) => entry.probabilityRange && entry.probabilityRange.min >= 0 && entry.probabilityRange.max <= 100 && entry.probabilityRange.min <= entry.probabilityRange.max), "Conditional probabilities must be genuine 0–100 bounds, not summed mutually exclusive parental scenarios");
const completeSuperCross = calculateSpeciesGeneticsForecast("Heterodon nasicus", {
  female: { morphs: ["super-arctic"], hets: [], confirmedClearLoci: [conda!.id] },
  male: { morphs: ["platinum"], hets: [] },
});
assert(completeSuperCross.offspring.some((entry) => entry.certainty === "exact" && entry.visualComponents.some((part) => part.geneId === "arctic" && part.copies === 2) && entry.visualComponents.some((part) => part.geneId === "conda" && part.copies === 1)), "Documented Super Arctic x Platinum yields exact Super Arctic Conda genotype");
assert(completeSuperCross.offspring.some((entry) => entry.certainty === "exact" && entry.visualComponents.some((part) => part.geneId === "arctic" && part.copies === 1)), "Documented super cross preserves Arctic heterozygous offspring");

const inventedMorph = calculateSpeciesGeneticsForecast("Heterodon nasicus", {
  female: { morphs: ["not-a-documented-inheritance-variant"], hets: [] },
  male: { morphs: [], hets: [] },
});
assert(inventedMorph.offspring.length === 0 && inventedMorph.hasUnresolvedGenetics, "unmapped variation cannot become an invented 100% normal prediction");

const conflictingClear = calculateSpeciesGeneticsForecast("Heterodon nasicus", {
  female: { morphs: ["arctic"], hets: [], knownGeneCopies: { arctic: 1 }, confirmedClearLoci: [arctic.id] },
  male: { morphs: [], hets: [], confirmedClearLoci: [arctic.id] },
});
assert(conflictingClear.offspring.length === 0 && conflictingClear.hasUnresolvedGenetics, "conflicting genetic evidence is withheld instead of silently selecting an interpretation");

const crossSpeciesInput: ParentGenome = { species: "Pantherophis guttatus", states: [] };
let crossSpeciesRejected = false;
try { calculateGenome(hogDatabase, parentA, crossSpeciesInput); } catch (error) { crossSpeciesRejected = error instanceof Error && error.message.includes("Cross-species genetics are not supported"); }
assert(crossSpeciesRejected, "cross-species breeding is rejected");

console.log("Genetics runtime tests passed: inheritance, super states, alleles, aliases, combination expansion, bounded zygosity, explicit genotype requirements and species safety.");