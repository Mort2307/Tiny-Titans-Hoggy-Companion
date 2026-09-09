import type { PhenotypeGuide } from "./hognosePhenotypeGuide.ts";

const HOGNOSE_MORPHS = "https://hognose-morphs.com/morphs/all";
const HOGNOSE_RECESSIVE = "https://hognose-morphs.com/morphs/recessive";
const HOGNOSE_INCOMPLETE = "https://hognose-morphs.com/morphs/incomplete-dominant";
const HOGNOSE_POLYGENIC = "https://hognose-morphs.com/morphs/polygenic";
const caveat = "Use appearance as an identification aid, not as proof of genotype. Lighting, age, shed cycle, background genetics and individual expression can overlap; documented genotype and parentage take priority.";
const limited = (description: string, markers: string[], sourceUrls = [HOGNOSE_MORPHS]): PhenotypeGuide => ({
  visualDescription: description,
  identificationMarkers: markers,
  differentiators: ["Published visual expression is less standardised than for the core morphs; use the documented lineage/genotype rather than colour alone."],
  variabilityNotes: ["Expression may vary with line, age, shed cycle and combination."],
  identificationCaveat: caveat,
  sourceUrls,
});

export const hognosePhenotypeExtensionsById: Record<string, PhenotypeGuide> = {
  "antarctic": limited("A cool-toned incomplete-dominant phenotype. The source describes Antarctic as a separate incomplete-dominant mutation allelic to Arctic, with a cooler/metallic expression in compound combinations.", ["Cool grey/metallic tendency", "Cleaner, cooler-looking colour", "Can show stronger metallic character in Arctic/Antarctic combinations"], [HOGNOSE_MORPHS, HOGNOSE_INCOMPLETE]),
  "super-antarctic": limited("The two-copy Antarctic phenotype. Treat this as the homozygous Antarctic state rather than as a separate locus.", ["Enhanced Antarctic expression", "Cool/washed or metallic colour influence"], [HOGNOSE_MORPHS, HOGNOSE_INCOMPLETE]),
  "desert": limited("A recessive colour mutation. In the documented Axanthic Desert Anaconda combination it contributes to a very light overall grey appearance with darker grey patterning.", ["Pale colour expression", "Can contribute to light grey tones in combinations"], ["https://hognose-morphs.com/morph/axanthic-desert-anaconda", HOGNOSE_RECESSIVE]),
  "dutch-hypo": limited("Dutch Hypo is treated by the source as the same morph as Evan's Hypo: a recessive T+ albino form with highly variable colour expression.", ["Tan-on-tan through red-and-white colour range", "Variable reduction of dark pigment"], ["https://www.hognose-morphs.com/morph/evans-hypo", HOGNOSE_RECESSIVE]),
  "true-hypo": limited("A source-listed colour term with limited standardised visual guidance. Do not infer the genotype from a generally lighter appearance alone.", ["Reduced dark appearance may be reported", "Colour can be variable"], [HOGNOSE_POLYGENIC]),
  "savannah": {
    visualDescription: "A recessive colour/pattern mutation described with reddish-brown dorsal patterning, black-bordered blotches, aberrant neck flags, a speckled background, elongated white-bordered face pattern and orange/dark-yellow ventral colour.",
    identificationMarkers: ["Reddish-brown dorsal colour", "Black-bordered blotches", "Aberrant neck flags", "Speckled background", "White-bordered elongated face pattern", "Orange/dark-yellow ventral tones"],
    differentiators: ["Savannah has a distinct dorsal/face/ventral combination of markers; colour alone is not sufficient.", "Savannah is listed by the source as recessive, but unrelated colour or line traits can overlap visually."],
    variabilityNotes: ["Hatchlings start lighter and darken through the years."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/savannah", HOGNOSE_RECESSIVE],
  },
  "phoenix-red": limited("A source-listed polygenic red line selected for colour intensity. Visual identification should be based on the line and family expression rather than a single Mendelian marker.", ["Enhanced red/orange colour influence", "Line-consistent saturation"], [HOGNOSE_POLYGENIC]),
  "raging-red": limited("A source-listed polygenic red line selected for strong red colour expression.", ["Strong red colour influence", "High colour saturation in suitable lines"], [HOGNOSE_POLYGENIC]),
  "spider": limited("A source-listed polygenic/line-bred pattern trait. The source catalogue does not provide a single universally diagnostic visual marker, so identification should be lineage-supported.", ["Distinct line-specific pattern expression", "Aberrant patterning may occur"], [HOGNOSE_POLYGENIC]),
  "yellow-glow": limited("A source-listed colour trait associated with enhanced yellow/golden expression.", ["Brighter yellow/golden tones", "Enhanced yellow colour"], [HOGNOSE_POLYGENIC]),
  "green-phase": limited("A source-listed line/colour term associated with increased green expression.", ["Green/olive influence", "Line-consistent green expression"], [HOGNOSE_POLYGENIC]),
  "citrus": limited("A source-listed colour line associated with citrus-like yellow/orange colour influence.", ["Yellow/orange colour influence", "Brighter warm colour expression"], [HOGNOSE_POLYGENIC]),
  "mocha": limited("A source-listed polygenic colour line associated with mocha/brown colour influence.", ["Mocha/tan/brown colour influence", "Warm muted tones"], [HOGNOSE_POLYGENIC]),
  "orange-albino": limited("A line-bred Albino colour expression selected toward stronger orange tones.", ["Albino red eyes", "Stronger orange colour", "Reduced black pigment"], [HOGNOSE_POLYGENIC]),
  "rbe-pastel": limited("A source-listed pastel line. Treat it as a selective-breeding colour enhancer rather than automatically creating a new Mendelian locus.", ["Brighter colour", "Enhanced saturation", "Line-specific expression"], [HOGNOSE_POLYGENIC]),
  "gaversh-green": limited("Alias-safe placeholder for the Gaverth Green line. The source catalogue lists Gaverth Green as a polygenic trait.", ["Green colour influence", "Line-specific green expression"], [HOGNOSE_POLYGENIC]),
  "gaverth-green": {
    visualDescription: "A polygenic Gaverth Green line selected for green colour expression. In Gaverth Green Lemon Ghost, the source reports increased greens and yellows.",
    identificationMarkers: ["Increased green colour", "Green/yellow saturation", "Line-consistent expression"],
    differentiators: ["Polygenic/line-bred status means appearance alone cannot prove Gaverth Green ancestry."],
    variabilityNotes: ["Expression varies with line and combination."],
    identificationCaveat: caveat,
    sourceUrls: ["https://www.hognose-morphs.com/morph/gaverth-green-lemon-ghost", HOGNOSE_POLYGENIC],
  },
};
