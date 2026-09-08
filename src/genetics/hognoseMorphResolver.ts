import type { MorphComponent } from "../data/morphs.ts";

export type HognoseComponent = {
  geneId: string;
  name: string;
  copies: 1 | 2;
  inheritance: "recessive" | "dominant" | "incomplete_dominant" | "polygenic" | "line_bred" | "allelic" | "unknown";
  kind: "gene" | "super" | "modifier";
  aliases: string[];
};

export type HognoseMorphResolution = {
  input: string;
  matchedName?: string;
  aliases: string[];
  components: HognoseComponent[];
  morphComponents: MorphComponent[];
  signature: string;
  confidence: "high" | "moderate" | "limited" | "unresolved";
  sourceUrls: string[];
  notes: string[];
};

const HOGNOSE_MORPHS = "https://hognose-morphs.com/morphs/all";
const HOGNOSE_HUB_GUIDE = "https://hognosehub.com/genetics-lab/guide";
const HOGNOSE_HUB_CRYSTAL_DIAMOND = "https://hognosehub.com/genetics-lab/superarctic-coral-superconda";

const makeGene = (geneId: string, name: string, inheritance: HognoseComponent["inheritance"], aliases: string[] = []): HognoseComponent => ({
  geneId,
  name,
  copies: 1,
  inheritance,
  kind: inheritance === "polygenic" || inheritance === "line_bred" ? "modifier" : "gene",
  aliases,
});

const RECESSIVES: HognoseComponent[] = [
  makeGene("albino", "Albino", "recessive", ["amelanistic", "amel"]),
  makeGene("axanthic", "Axanthic", "recessive", ["anery", "anerythristic"]),
  makeGene("caramel", "Caramel", "recessive"),
  makeGene("evans-hypo", "Evan's Hypo", "recessive", ["evans hypo", "evan's hypo", "dutch hypo", "hypo"]),
  makeGene("lavender", "Lavender", "recessive", ["lav"]),
  makeGene("leucistic", "Leucistic", "recessive", ["lucy"]),
  makeGene("pink-pastel-albino", "Pink Pastel Albino", "recessive", ["ppa", "pink pastel"]),
  makeGene("pistachio", "Pistachio", "recessive"),
  makeGene("sable", "Sable", "recessive"),
  makeGene("swiss-chocolate", "Swiss Chocolate", "recessive", ["swiss choc", "chocolate"]),
  makeGene("toffeebelly", "Toffeebelly", "recessive", ["toffee belly", "toffee"]),
];

const DOMINANTS: HognoseComponent[] = [
  makeGene("cinnamon", "Cinnamon", "dominant"),
  makeGene("skullface", "Skullface", "dominant"),
];

const MODIFIERS: HognoseComponent[] = [
  makeGene("conda", "Conda", "incomplete_dominant", ["anaconda"]),
  makeGene("arctic", "Arctic", "incomplete_dominant"),
  makeGene("antarctic", "Antarctic", "allelic"),
  makeGene("pastel", "Pastel", "polygenic"),
  makeGene("lemon-ghost", "Lemon Ghost", "polygenic"),
  makeGene("symphony", "Symphony", "polygenic"),
  makeGene("extreme-red", "Extreme Red", "polygenic"),
  makeGene("woma", "Woma", "polygenic"),
  makeGene("granite", "Granite", "polygenic"),
  makeGene("granite-jungle", "Granite Jungle", "polygenic"),
  makeGene("jaguar", "Jaguar", "line_bred"),
  makeGene("jungle", "Jungle", "line_bred"),
  makeGene("purple-line", "Purple Line", "line_bred"),
  makeGene("green-line", "Green Line", "line_bred"),
  makeGene("yellow-line", "Yellow Line", "line_bred"),
  makeGene("shadow", "Shadow", "polygenic"),
  makeGene("tiger", "Tiger", "polygenic"),
  makeGene("twinspot", "Twinspot", "polygenic"),
  makeGene("watermelon", "Watermelon", "polygenic"),
];

const TOKEN_COMPONENTS = [...RECESSIVES, ...DOMINANTS, ...MODIFIERS];
const SUPER_TOKENS = [
  ["super arctic", "arctic"], ["superarctic", "arctic"],
  ["super antarctic", "antarctic"], ["superantarctic", "antarctic"],
  ["super conda", "conda"], ["superconda", "conda"],
] as const;

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[+×/,;&]/g, " ").replace(/\s+/g, " ").trim();
}

function signature(components: HognoseComponent[]): string {
  const totals = new Map<string, number>();
  for (const component of components) totals.set(component.geneId, (totals.get(component.geneId) ?? 0) + component.copies);
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([geneId, copies]) => `${geneId}:${copies}`).join("|");
}

function findGene(geneId: string): HognoseComponent | undefined {
  return TOKEN_COMPONENTS.find((item) => item.geneId === geneId);
}

function withCopies(base: HognoseComponent, copies: 1 | 2, kind: HognoseComponent["kind"]): HognoseComponent {
  return { ...base, copies, kind };
}

const NAMED: Array<{ name: string; aliases?: string[]; components: HognoseComponent[]; sourceUrls: string[]; notes?: string[] }> = [
  { name: "Grey Fog", aliases: ["Arctic Conda", "Arctic Anaconda"], components: [withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS, HOGNOSE_HUB_GUIDE] },
  { name: "Platinum", aliases: ["Arctic Superconda", "Arctic Super Conda"], components: [withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS, HOGNOSE_HUB_GUIDE] },
  { name: "Moonstruck", aliases: ["Arctic Conda Lavender", "Lavender Arctic Conda"], components: [withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Subzero", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Bub's Daddy", aliases: ["Bubs Daddy", "Bub’s Daddy"], components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Super Daddy", aliases: ["Super AAA"], components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Super Moon", components: [withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Candy", components: [withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Toffeeglow Superconda", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Pink Punch Superconda", components: [withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Purple Punch Superconda", components: [withCopies(findGene("axanthic")!, 2, "gene"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Coralburst Arctic Superconda", components: [withCopies(findGene("sable")!, 2, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Lavender Toxic Superconda", components: [withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("axanthic")!, 2, "gene"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Toffeeburst Superconda", components: [withCopies(findGene("sable")!, 2, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Toasted Lavender Superconda", components: [withCopies(findGene("sable")!, 2, "gene"), withCopies(findGene("caramel")!, 2, "gene"), withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Lemon Ghost Lavender Superconda", components: [withCopies(findGene("lemon-ghost")!, 1, "modifier"), withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Pink Pastel Arctic Anaconda", components: [withCopies(findGene("pink-pastel-albino")!, 2, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Pink Pastel Arctic Superconda", components: [withCopies(findGene("pink-pastel-albino")!, 2, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Snow Chocolate Superconda", components: [withCopies(findGene("swiss-chocolate")!, 2, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("axanthic")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Super Avalanche", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("axanthic")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Crystal Diamond Superconda", aliases: ["Superarctic Coral Superconda"], components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_HUB_CRYSTAL_DIAMOND, HOGNOSE_MORPHS], notes: ["Explicitly documented as Albino x2 + Lavender x2 + Arctic x2 + Anaconda x2."] },
  { name: "ATOM", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("caramel")!, 2, "gene"), withCopies(findGene("evans-hypo")!, 2, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Cinnamon Arctic Anaconda", components: [withCopies(findGene("cinnamon")!, 1, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Sunburst Cinnamon Arctic Anaconda", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("sable")!, 2, "gene"), withCopies(findGene("cinnamon")!, 1, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS], notes: ["The current page description explicitly includes Sable even though its structured Contains block omits it; Tiny Titans preserves the conflict in provenance rather than dropping Sable."] },
  { name: "Ultramel Sable Arctic Anaconda", components: [withCopies(findGene("sable")!, 2, "gene"), withCopies(findGene("caramel")!, 2, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Albino Skullface Arctic Anaconda", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("skullface")!, 1, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Albino Skullface Superconda", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("skullface")!, 1, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Skullface Albino Lemon Ghost Anaconda", components: [withCopies(findGene("skullface")!, 1, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("lemon-ghost")!, 1, "modifier"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Woma Lemon Ghost Albino Anaconda", components: [withCopies(findGene("woma")!, 1, "modifier"), withCopies(findGene("lemon-ghost")!, 1, "modifier"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Savannah Anaconda", components: [withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS], notes: ["Savannah is retained as a named-term component without silently inventing an inheritance model; the site lists Savannah as a component but its genetics require separate verification."] },
  { name: "Savannah Albino Anaconda", components: [withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS], notes: ["Savannah component is preserved as an unresolved modifier in this record."] },
  { name: "Symphony Superarctic Anaconda", components: [withCopies(findGene("symphony")!, 1, "modifier"), withCopies(findGene("arctic")!, 2, "super"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Pastel Axanthic Anaconda", components: [withCopies(findGene("pastel")!, 1, "modifier"), withCopies(findGene("axanthic")!, 2, "gene"), withCopies(findGene("conda")!, 1, "gene")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Pastel Toffeeglow Chocolate Superconda", components: [withCopies(findGene("pastel")!, 1, "modifier"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("swiss-chocolate")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Vanilla Cherry Superconda", components: [withCopies(findGene("pastel")!, 1, "modifier"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Tomato Arctic Superconda", components: [withCopies(findGene("cinnamon")!, 1, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("arctic")!, 1, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Purple People Eater Superconda", components: [withCopies(findGene("sable")!, 2, "gene"), withCopies(findGene("lavender")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
  { name: "Toffeeburst Superconda", components: [withCopies(findGene("sable")!, 2, "gene"), withCopies(findGene("albino")!, 2, "gene"), withCopies(findGene("toffeebelly")!, 2, "gene"), withCopies(findGene("conda")!, 2, "super")], sourceUrls: [HOGNOSE_MORPHS] },
];

const NAMED_BY_KEY = new Map<string, (typeof NAMED)[number]>();
for (const item of NAMED) {
  NAMED_BY_KEY.set(normalise(item.name), item);
  for (const alias of item.aliases ?? []) NAMED_BY_KEY.set(normalise(alias), item);
}

function parseTokens(query: string): { components: HognoseComponent[]; remainder: string } {
  let remainder = normalise(query);
  const components: HognoseComponent[] = [];
  for (const [token, geneId] of [...SUPER_TOKENS].sort((a, b) => b[0].length - a[0].length)) {
    const escaped = normalise(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "i");
    if (!pattern.test(remainder)) continue;
    const base = findGene(geneId);
    if (!base) continue;
    components.push(withCopies(base, 2, "super"));
    remainder = remainder.replace(pattern, " ").replace(/\s+/g, " ").trim();
  }
  const tokens = [...TOKEN_COMPONENTS].sort((a, b) => {
    const aLength = Math.max(a.name.length, ...a.aliases.map((item) => item.length));
    const bLength = Math.max(b.name.length, ...b.aliases.map((item) => item.length));
    return bLength - aLength;
  });
  for (const item of tokens) {
    for (const token of [item.name, ...item.aliases].sort((a, b) => b.length - a.length)) {
      const escaped = normalise(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "i");
      if (!pattern.test(remainder)) continue;
      components.push(withCopies(item, item.inheritance === "recessive" ? 2 : 1, item.kind));
      remainder = remainder.replace(pattern, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }
  return { components, remainder };
}

function toMorphComponents(components: HognoseComponent[]): MorphComponent[] {
  return components.map((component) => ({
    morphId: component.geneId,
    type: component.kind === "super" ? "Super" : component.kind === "modifier" ? "Polygenic" : "Gene",
    copies: component.copies,
  }));
}

export function resolveHognoseMorphInput(query: string): HognoseMorphResolution {
  const input = query.trim();
  const named = NAMED_BY_KEY.get(normalise(input));
  if (named) return {
    input,
    matchedName: named.name,
    aliases: named.aliases ?? [],
    components: named.components,
    morphComponents: toMorphComponents(named.components),
    signature: signature(named.components),
    confidence: "high",
    sourceUrls: named.sourceUrls,
    notes: named.notes ?? [],
  };

  const parsed = parseTokens(input);
  const confidence = parsed.components.length === 0 ? "unresolved" : parsed.remainder ? "limited" : "moderate";
  const notes: string[] = [];
  if (parsed.remainder) notes.push(`Unresolved name token(s): ${parsed.remainder.split(" ").join(", ")}.`);
  if (parsed.components.some((item) => item.geneId === "arctic") && parsed.components.some((item) => item.geneId === "antarctic")) notes.push("Arctic and Antarctic are allelic; do not treat them as independent loci.");
  if (parsed.components.some((item) => item.kind === "modifier")) notes.push("Polygenic/line-bred traits are retained for recognition but are not simple Mendelian loci.");

  return {
    input,
    aliases: [],
    components: parsed.components,
    morphComponents: toMorphComponents(parsed.components),
    signature: signature(parsed.components),
    confidence,
    sourceUrls: [HOGNOSE_MORPHS, HOGNOSE_HUB_GUIDE],
    notes,
  };
}

export function getKnownHognoseNamedCombinations(): string[] {
  return NAMED.map((item) => item.name);
}
