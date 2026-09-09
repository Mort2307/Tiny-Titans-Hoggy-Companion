import { getHognosePhenotypeGuide, hognosePhenotypeGuideById } from "../src/data/hognosePhenotypeGuide.ts";
import { fullHognoseMorphTaxonomy } from "../src/data/hognoseMorphFullTaxonomy.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Hognose phenotype guide validation failed: ${message}`);
}

for (const id of ["arctic", "super-arctic", "conda", "super-conda", "albino", "axanthic", "lavender", "caramel", "evans-hypo", "leucistic", "pink-pastel-albino", "pistachio", "sable", "swiss-chocolate", "toffeebelly", "cinnamon", "skullface", "pastel", "lemon-ghost", "symphony", "extreme-red", "woma", "granite", "granite-jungle", "jaguar", "jungle", "purple-line", "green-line", "yellow-line", "shadow", "tiger", "twinspot", "watermelon"]) {
  const guide = hognosePhenotypeGuideById[id];
  assert(guide, `${id} has no phenotype guide`);
  assert(guide.visualDescription.length > 40, `${id} visual description is too thin`);
  assert(guide.identificationMarkers.length > 0, `${id} has no identification markers`);
  assert(guide.differentiators.length > 0, `${id} has no differentiators`);
  assert(guide.identificationCaveat.includes("not proof of genotype"), `${id} is missing the visual-vs-genetic safety rail`);
}

const arctic = getHognosePhenotypeGuide("arctic");
assert(arctic.differentiators.some((item) => /Super Arctic/i.test(item)), "Arctic guide must explicitly distinguish Super Arctic");

const superArctic = getHognosePhenotypeGuide("super-arctic");
assert(superArctic.differentiators.some((item) => /two copies/i.test(item)), "Super Arctic guide must state its two-copy distinction");

const conda = getHognosePhenotypeGuide("conda");
assert(conda.differentiators.some((item) => /Super Conda/i.test(item)), "Conda guide must explicitly distinguish Super Conda");

const superConda = getHognosePhenotypeGuide("super-conda");
assert(superConda.differentiators.some((item) => /almost entirely/i.test(item)), "Super Conda guide must describe extreme pattern reduction");

const combination = fullHognoseMorphTaxonomy.find((entry) => entry.name === "Platinum");
assert(combination?.components?.length, "Platinum should have components for phenotype composition");
const composed = getHognosePhenotypeGuide("platinum", combination?.components);
assert(composed.visualDescription.includes("combined expression"), "Combination phenotype guide should compose component intelligence");

console.log("Western Hognose phenotype identification validation passed.");
