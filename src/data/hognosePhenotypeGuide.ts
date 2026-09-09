import type { MorphComponent } from "./morphs.ts";

export type PhenotypeGuide = {
  /** What a keeper should look for when visually assessing this trait. */
  visualDescription: string;
  /** Distinctive visual markers that are useful during identification. */
  identificationMarkers: string[];
  /** Features that help distinguish this trait from close visual look-alikes. */
  differentiators: string[];
  /** Expression can vary with age, shed, genetics and individual animal. */
  variabilityNotes: string[];
  /** Safety rail: visual appearance alone is not genetic proof. */
  identificationCaveat: string;
  sourceUrls: string[];
};

const HOGNOSE_MORPHS = "https://hognose-morphs.com/morphs/all";
const HOGNOSE_RECESSIVE = "https://hognose-morphs.com/morphs/recessive";
const HOGNOSE_INCOMPLETE_DOMINANT = "https://hognose-morphs.com/morphs/incomplete-dominant";
const HOGNOSE_POLYGENIC = "https://hognose-morphs.com/morphs/polygenic";

const caveat = "Use appearance as an identification aid, not as proof of genotype. Lighting, age, shed cycle, background genetics and individual expression can overlap between morphs; confirmed parentage/genetic records take priority.";

export const hognosePhenotypeGuideById: Record<string, PhenotypeGuide> = {
  "normal": {
    visualDescription: "Wild-type Western Hognose appearance with brown/yellow, brown/green or brown/red background tones, large dorsal blotches, smaller lateral blotches and a usually black or black-spotted belly.",
    identificationMarkers: ["Large dorsal blotches", "Smaller side blotches", "Brown/yellow/green/red-brown base tones", "Usually black or dark spotted belly"],
    differentiators: ["Lacks the consistent defining markers of recognised colour or pattern mutations."],
    variabilityNotes: ["Wild-type colour can vary substantially between individuals and localities."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_MORPHS],
  },
  "albino": {
    visualDescription: "A melanin-reduced appearance with yellow, orange or cream body tones and red or pink eyes.",
    identificationMarkers: ["Red/pink eyes", "Yellow, orange or cream body", "Reduced black/melanin pigmentation"],
    differentiators: ["Red eyes and absence of black pigment distinguish Albino from visually similar pale non-albino animals."],
    variabilityNotes: ["Exact colour intensity can vary with age and additional colour traits."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_MORPHS, HOGNOSE_RECESSIVE],
  },
  "arctic": {
    visualDescription: "Heterozygous Arctic is typically recognised by strong dark or white borders around the dorsal saddles, visible eyebrow markings and a progressively lighter overall appearance with sheds while retaining a recognisable dorsal pattern.",
    identificationMarkers: ["Black or white saddle borders", "Visible eyebrows", "Lightening with age/sheds", "Dorsal pattern remains present, although it can be cleaner or reduced"],
    differentiators: ["Arctic is the one-copy form; Super Arctic is the two-copy form and is generally much lighter and more dramatically altered.", "Do not call a snake Super Arctic merely because it is very pale: two-copy genetics are the reliable distinction."],
    variabilityNotes: ["Arctic expression varies between animals and increases as the snake sheds."],
    identificationCaveat: caveat,
    sourceUrls: ["https://www.hognose-morphs.com/morph/arctic", HOGNOSE_INCOMPLETE_DOMINANT],
  },
  "super-arctic": {
    visualDescription: "The homozygous/two-copy Arctic phenotype. Typically substantially lighter than Arctic, often with a white or very pale background and strong dark patterning on the head and remaining dorsal markings.",
    identificationMarkers: ["Marked overall lightening", "White/pale background", "Strong dark head pattern or dark residual pattern", "May become very reduced-pattern or nearly patternless in some combinations"],
    differentiators: ["Super Arctic is two copies of Arctic. A single-copy Arctic can show borders and eyebrows but normally retains more conventional pattern and colour.", "Super Arctic should be distinguished from pale Axanthic/Snow-type animals by the combination of Arctic expression and genetic context."],
    variabilityNotes: ["The colour transition can be dramatic during the first several sheds.", "Expression is especially influenced by combinations such as Superconda, where dorsal pattern may disappear for a separate genetic reason."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/superarctic-superconda", "https://www.hognose-morphs.com/morph/subzero", HOGNOSE_INCOMPLETE_DOMINANT],
  },
  "conda": {
    visualDescription: "Conda/Anaconda is primarily a pattern-reduction trait. The snake keeps a recognisable dorsal pattern, but the dorsal saddles are reduced, broken up or less numerous than in a comparable non-Conda animal.",
    identificationMarkers: ["Reduced dorsal pattern", "Fewer/smaller dorsal blotches", "More patternless areas along the back"],
    differentiators: ["Conda still normally leaves some dorsal pattern; Super Conda is the two-copy form and can remove the dorsal pattern almost entirely."],
    variabilityNotes: ["The degree of pattern reduction varies by individual and by combinations with other traits."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/candy", HOGNOSE_INCOMPLETE_DOMINANT],
  },
  "super-conda": {
    visualDescription: "The two-copy Conda/Anaconda phenotype. It is primarily identified by extreme dorsal pattern reduction, often producing a completely or almost completely patternless back.",
    identificationMarkers: ["Little to no dorsal pattern", "Patternless or near-patternless back", "Head pattern may remain despite the dorsal pattern loss"],
    differentiators: ["A normal Conda generally retains reduced dorsal blotches; Super Conda can remove the dorsal pattern almost entirely."],
    variabilityNotes: ["Some combinations can retain a narrow dorsal stripe or small residual pattern despite being Super Conda."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/superarctic-superconda", "https://hognose-morphs.com/morph/albino-superconda", HOGNOSE_INCOMPLETE_DOMINANT],
  },
  "axanthic": {
    visualDescription: "A cooler grey/silver phenotype caused by removal or reduction of yellow pigment, often leaving grey, silver, black and muted tones.",
    identificationMarkers: ["Grey/silver overall colour", "Strong reduction of yellow pigment", "Cooler-looking pattern tones"],
    differentiators: ["Axanthic removes yellow pigment; it should not be confused with Arctic, whose key visual clue is saddle bordering/eyebrow expression and progressive lightening."],
    variabilityNotes: ["Colour can range from pale silver-grey to darker grey depending on age and other genetics."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/pastel-axanthic-anaconda", HOGNOSE_RECESSIVE],
  },
  "lavender": {
    visualDescription: "Lavender starts very richly coloured and can mature into a pink-lavender to lavender-grey appearance, with dark ruby eyes and darker colour during stress.",
    identificationMarkers: ["Pink/lavender-grey body colour", "Dark ruby eyes", "Purple/lavender tendency", "Can darken when stressed"],
    differentiators: ["The combination of lavender colour and ruby eyes is more characteristic than simply being pale or purple-toned."],
    variabilityNotes: ["Hatchlings can start much redder and soften after several sheds."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/lavender", HOGNOSE_RECESSIVE],
  },
  "caramel": {
    visualDescription: "A creamy caramel-toned phenotype, commonly accompanied by a notably reduced head pattern and a very clean or nearly absent ventral pattern.",
    identificationMarkers: ["Cream/caramel colour", "Reduced head pattern", "Clean-looking ventral pattern/belly"],
    differentiators: ["The combination of creamy colour plus reduced head and clean belly is more useful than colour alone."],
    variabilityNotes: ["Shade varies from cream through warmer caramel/brown tones, especially in combinations."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/caramel-anaconda", HOGNOSE_RECESSIVE],
  },
  "evans-hypo": {
    visualDescription: "A highly variable T+ albino phenotype ranging from tan-on-tan through red-and-white animals. Despite the name, the source describes it as a T+ albino form rather than a true hypomelanistic mutation.",
    identificationMarkers: ["Warm tan, red or red-and-white colour range", "Very variable expression", "Often softer/more reduced dark pigment than wild type"],
    differentiators: ["Do not treat the word 'Hypo' as proof of a conventional hypomelanistic mechanism; Evan's Hypo is described as a T+ albino form."],
    variabilityNotes: ["This is one of the most variable named colour morphs; visual ID is particularly unreliable without lineage."],
    identificationCaveat: caveat,
    sourceUrls: ["https://www.hognose-morphs.com/morph/evans-hypo", HOGNOSE_RECESSIVE],
  },
  "leucistic": {
    visualDescription: "A very low-pigment, typically white-looking phenotype. This is a visual description only; white animals can also arise from combinations rather than a standalone Leucistic genotype.",
    identificationMarkers: ["Predominantly white appearance", "Very little visible colour pattern"],
    differentiators: ["White colour alone cannot establish Leucistic genotype because several combinations can produce extremely pale animals."],
    variabilityNotes: ["Expression can range from clean white to animals retaining subtle colour or pattern."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_RECESSIVE],
  },
  "pink-pastel-albino": {
    visualDescription: "A Pink Pastel Albino phenotype with a light pink/albino base; when combined with Arctic, look for the white highlights and darker saddle borders described for that combination family.",
    identificationMarkers: ["Pink/albino base colour", "Red eyes", "Light, high-contrast appearance", "Often enhanced further by Pastel/Arctic combinations"],
    differentiators: ["Pink Pastel Albino is distinct from generic Albino by its characteristic lighter/pinker expression; visual confirmation still depends heavily on lineage."],
    variabilityNotes: ["Expression varies considerably in combination with Arctic, Conda and other colour traits."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/pink-pastel-arctic-anaconda", HOGNOSE_RECESSIVE],
  },
  "pistachio": {
    visualDescription: "A recognised recessive colour morph. Visual appearance should be treated as lineage-supported rather than a definitive standalone diagnostic because expression varies and source descriptions are limited.",
    identificationMarkers: ["Greenish/yellow-green tendency may be present", "Distinctive colour expression relative to wild type"],
    differentiators: ["Do not identify Pistachio from a single colour patch; use documented lineage/genotype."],
    variabilityNotes: ["Published visual descriptions are less standardised than for Arctic, Albino or Lavender."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_RECESSIVE],
  },
  "sable": {
    visualDescription: "Sable is especially associated with a strong glossy/iridescent appearance from reflective scales, often layered over warmer brown, red or orange colouration.",
    identificationMarkers: ["Strong iridescent/glossy sheen", "Reflective scales", "Often richer brown/red/orange colouration"],
    differentiators: ["The sheen is a useful clue, but Sable can look very different in combinations."],
    variabilityNotes: ["Expression and colour are highly combination-dependent; iridescence is the most consistent keeper-facing clue."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/lavender-oxide", "https://hognose-morphs.com/morph/sable-cinnamon-anaconda", HOGNOSE_RECESSIVE],
  },
  "swiss-chocolate": {
    visualDescription: "A brown/chocolate-oriented recessive phenotype. A characteristic clue described for combinations is a darker headstamp caused by increased melanin concentration on the head.",
    identificationMarkers: ["Brown/chocolate body tones", "Darker headstamp/head pigmentation", "Warm pink/purple undertones may appear in lighter combinations"],
    differentiators: ["The darker headstamp is particularly useful when distinguishing Swiss Chocolate in pale combinations."],
    variabilityNotes: ["Body shade changes substantially when combined with Albino, Axanthic, Super Arctic or Pastel."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/snow-chocolate", "https://hognose-morphs.com/morph/chocolate-superarctic-anaconda", HOGNOSE_RECESSIVE],
  },
  "toffeebelly": {
    visualDescription: "A warm golden/toffee-oriented phenotype. In combinations it commonly contributes a warm gold-brown base and can be associated with yellow, orange or brown colour expression.",
    identificationMarkers: ["Golden/toffee colour", "Warm yellow-brown or orange tones", "Often rich warm base colour in combinations"],
    differentiators: ["Do not confuse the warm colour alone with the named Toffeebelly genotype; combinations can mimic it."],
    variabilityNotes: ["Colour can vary widely in combinations and may become more intense or shift with age."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/paint-maker-anaconda", "https://hognose-morphs.com/morph/toffeebelly-shadow-arctic", HOGNOSE_RECESSIVE],
  },
  "cinnamon": {
    visualDescription: "A dominant colour/pattern trait commonly associated with rich brown colouration and a notably strong, often full head pattern.",
    identificationMarkers: ["Brown/cinnamon body tones", "Strong or full head pattern", "Dark, well-defined head patterning"],
    differentiators: ["In combinations, a strong head pattern can be a useful Cinnamon clue even when the body colour is changed by other genes."],
    variabilityNotes: ["Expression varies by combination; some animals show much stronger head pattern than others."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/cinnamon-superconda", "https://hognose-morphs.com/morph/cinnamon-arctic-anaconda"],
  },
  "skullface": {
    visualDescription: "A dominant pattern trait best recognised by dramatic reduction of head pattern. Some animals retain a few head blotches, while others have almost none.",
    identificationMarkers: ["Very reduced head pattern", "Clean or nearly clean head", "Some individuals retain small residual head blotches"],
    differentiators: ["Skullface mainly changes the head; it should not be confused with a pattern-reducing Conda, which primarily affects the dorsal body pattern."],
    variabilityNotes: ["Head-pattern reduction can range from substantial to almost complete."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/albino-skullface-arctic-anaconda"],
  },
  "pastel": {
    visualDescription: "A polygenic colour enhancer rather than a simple Mendelian locus. In combinations it commonly intensifies and brightens the animal's existing colours, often becoming more intense with sheds.",
    identificationMarkers: ["Brighter/intensified colours", "Greater saturation", "Enhancement of the underlying morph rather than a fixed standalone pattern"],
    differentiators: ["Pastel is an enhancer trait; it should be evaluated in the context of the underlying base morph rather than treated as a fixed colour template."],
    variabilityNotes: ["Expression can be subtle to strong and is highly dependent on lineage and combination."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/pastel-arctic-anaconda", HOGNOSE_POLYGENIC],
  },
  "lemon-ghost": {
    visualDescription: "A polygenic trait associated with pale yellow/green, ghostly or softened colour expression. In combinations it can add a distinctive green/yellow glow to warm base colours.",
    identificationMarkers: ["Pale yellow/green or softened tones", "Green/yellow glow in combinations", "Reduced visual harshness of underlying colours"],
    differentiators: ["Lemon Ghost is polygenic and expression varies; it should not be promoted to a discrete Mendelian locus."],
    variabilityNotes: ["Expression is line-dependent and can be subtle."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/paint-maker-anaconda", HOGNOSE_POLYGENIC],
  },
  "symphony": {
    visualDescription: "A polygenic pattern trait with a distinctive head/neck marking that can resemble two symmetrical musical notes; high-expression animals may develop a bold dorsal stripe.",
    identificationMarkers: ["Symmetrical musical-note-like head/neck pattern", "Possible single bold dorsal stripe in high-expression animals", "Dark grey/blackish juvenile appearance in some combinations"],
    differentiators: ["The head/neck 'musical notes' pattern is the strongest practical clue."],
    variabilityNotes: ["High-expression and lower-expression animals can look significantly different."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/symphony-superarctic-anaconda", HOGNOSE_POLYGENIC],
  },
  "extreme-red": {
    visualDescription: "A polygenic red enhancer that intensifies red colouration, particularly in Albino-based combinations.",
    identificationMarkers: ["More intense red colour", "Stronger red/orange saturation than the underlying morph"],
    differentiators: ["Extreme Red modifies colour intensity rather than defining a unique structural pattern."],
    variabilityNotes: ["Strength depends heavily on line and combination."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/extreme-red-albino-anaconda", HOGNOSE_POLYGENIC],
  },
  "woma": {
    visualDescription: "A polygenic pattern/colour trait with expression that should be judged in combination rather than from a single fixed visual template.",
    identificationMarkers: ["Characteristic line-bred/pattern influence when strongly expressed", "Often judged relative to the underlying morph"],
    differentiators: ["Woma is not a simple one-pattern Mendelian diagnostic."],
    variabilityNotes: ["High variability is expected in polygenic/line-bred traits."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "granite": {
    visualDescription: "A polygenic pattern trait associated with mottled/granulated visual texture and pattern variation rather than a single fixed colour.",
    identificationMarkers: ["Mottled/granulated pattern appearance", "Increased pattern texture"],
    differentiators: ["Judge against the underlying morph and line because expression is polygenic."],
    variabilityNotes: ["Expression varies substantially between lines."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "granite-jungle": {
    visualDescription: "A Granite/Jungle line combination with stronger pattern complexity and mottled jungle-like expression.",
    identificationMarkers: ["Complex/mottled pattern", "More irregular jungle-like patterning"],
    differentiators: ["The trait is a line/polygenic expression; genotype should be supported by pedigree."],
    variabilityNotes: ["Line expression can vary widely."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "jaguar": {
    visualDescription: "A line-bred pattern trait; visual expression is best judged by the characteristic patterning established in the line rather than a single colour marker.",
    identificationMarkers: ["Irregular/high-contrast pattern expression", "Line-specific pattern characteristics"],
    differentiators: ["Jaguar is line-bred in the Tiny Titans model; appearance alone is insufficient to establish the line."],
    variabilityNotes: ["Strongly line-dependent."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "jungle": {
    visualDescription: "A line-bred pattern trait characterised by irregular/jungle-like patterning.",
    identificationMarkers: ["Irregular pattern", "Broken/complex pattern structure"],
    differentiators: ["Pattern variation is line-dependent and overlaps with other aberrant pattern traits."],
    variabilityNotes: ["Expression differs between lines."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "purple-line": {
    visualDescription: "A line-bred colour trait selected for purple-leaning tones. Identification depends on line expression and pedigree.",
    identificationMarkers: ["Purple/lilac colour influence", "Line-consistent colour expression"],
    differentiators: ["Purple Line should not be inferred from any single purple patch in an unrelated morph."],
    variabilityNotes: ["Line-dependent."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "green-line": {
    visualDescription: "A line-bred colour trait selected for green-toned expression.",
    identificationMarkers: ["Green/olive colour influence", "Line-consistent green expression"],
    differentiators: ["Green colour alone cannot establish Green Line genetics."],
    variabilityNotes: ["Line-dependent."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "yellow-line": {
    visualDescription: "A line-bred colour trait selected for yellow-toned expression.",
    identificationMarkers: ["Strong yellow/golden colour influence", "Line-consistent yellow expression"],
    differentiators: ["Yellow colour occurs in many other morphs; pedigree matters."],
    variabilityNotes: ["Line-dependent."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "shadow": {
    visualDescription: "A polygenic pattern trait associated with dark edging around head pattern and body blotches, creating a shadowed appearance.",
    identificationMarkers: ["Dark/black borders around blotches", "Shadowed appearance", "Can include eyebrow expression"],
    differentiators: ["Look for the dark outlining effect rather than a particular base colour."],
    variabilityNotes: ["Expression varies considerably; Toffeebelly Shadow Arctic is a strong example of how other traits modify it."],
    identificationCaveat: caveat,
    sourceUrls: ["https://hognose-morphs.com/morph/toffeebelly-shadow-arctic", HOGNOSE_POLYGENIC],
  },
  "tiger": {
    visualDescription: "A polygenic pattern trait with banded/striped or tiger-like pattern influence; strength is highly line dependent.",
    identificationMarkers: ["Increased banding/striping influence", "Tiger-like pattern flow"],
    differentiators: ["Do not use a single stripe as proof because Super Arctic/Super Conda and other combinations can also alter dorsal pattern."],
    variabilityNotes: ["Polygenic expression ranges from subtle to strong."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "twinspot": {
    visualDescription: "A polygenic pattern trait associated with paired/twin-spot pattern expression.",
    identificationMarkers: ["Paired spot or mirrored spot patterning", "Repeated/twin visual structures"],
    differentiators: ["Pattern expression should be evaluated across the whole animal and against pedigree."],
    variabilityNotes: ["Expression varies by line."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
  "watermelon": {
    visualDescription: "A polygenic colour trait associated with watermelon-like warm pink/red/green colour influence.",
    identificationMarkers: ["Warm pink/red colour influence", "Possible greenish contrast depending on line"],
    differentiators: ["Watermelon is a line/polygenic trait rather than a single diagnostic colour mutation."],
    variabilityNotes: ["Strongly line-dependent."],
    identificationCaveat: caveat,
    sourceUrls: [HOGNOSE_POLYGENIC],
  },
};

const componentLabel = (component: MorphComponent): string => {
  const copies = component.copies ?? 1;
  return `${component.morphId}${copies === 2 ? " (two-copy/super)" : ""}`;
};

/**
 * Builds keeper-facing visual guidance for any named combination.
 * It intentionally describes component effects without pretending the
 * combination itself is a new gene.
 */
export function composeCombinationPhenotype(components: MorphComponent[]): PhenotypeGuide {
  const guides = components
    .map((component) => hognosePhenotypeGuideById[component.morphId])
    .filter((guide): guide is PhenotypeGuide => Boolean(guide));

  if (!guides.length) {
    return {
      visualDescription: "No verified component-level visual description is currently available for this combination.",
      identificationMarkers: [],
      differentiators: ["Use the recorded genotype and source provenance rather than attempting a visual-only identification."],
      variabilityNotes: ["Visual expression cannot currently be derived safely from the available component records."],
      identificationCaveat: caveat,
      sourceUrls: [],
    };
  }

  const markers = [...new Set(guides.flatMap((guide) => guide.identificationMarkers))].slice(0, 10);
  const differentiators = [...new Set(guides.flatMap((guide) => guide.differentiators))].slice(0, 8);
  const variabilityNotes = [...new Set(guides.flatMap((guide) => guide.variabilityNotes))].slice(0, 8);
  const sourceUrls = [...new Set(guides.flatMap((guide) => guide.sourceUrls))];

  return {
    visualDescription: `Look for the combined expression of ${components.map(componentLabel).join(" + ")}. Component-level visual cues are combined here as identification aids; the named combination is not being treated as a new locus.`,
    identificationMarkers: markers,
    differentiators: differentiators.length ? differentiators : ["Compare the animal with the expected component traits and its documented genotype."],
    variabilityNotes: variabilityNotes.length ? variabilityNotes : ["Combination expression varies with age, shed cycle and background genetics."],
    identificationCaveat: caveat,
    sourceUrls,
  };
}

export function getHognosePhenotypeGuide(geneId: string, components?: MorphComponent[]): PhenotypeGuide {
  return hognosePhenotypeGuideById[geneId] ?? (components ? composeCombinationPhenotype(components) : {
    visualDescription: "No verified visual identification profile has been recorded yet.",
    identificationMarkers: [],
    differentiators: ["Do not make a visual-only identification without a source-supported phenotype description."],
    variabilityNotes: ["Expression information is currently limited."],
    identificationCaveat: caveat,
    sourceUrls: [],
  });
}
