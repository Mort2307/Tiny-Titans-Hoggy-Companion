import type { MorphComponent } from "../data/morphs.ts";

export type HognoseComponent = {
  geneId: string;
  name: string;
  copies: 1 | 2;
  inheritance: "recessive" | "dominant" | "incomplete_dominant" | "polygenic" | "line_bred" | "allelic" | "unknown";
  kind: "gene" | "super" | "modifier";
  aliases?: string[];
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

const HOGNOSE_MORPHS = "https://www.hognose-morphs.com/morphs/all";
const HOGNOSE_HUB_GUIDE = "https://hognosehub.com/genetics-lab/guide";
const HOGNOSE_HUB_CRYSTAL_DIAMOND = "https://hognosehub.com/genetics-lab/superarctic-coral-superconda";

const gene = (
  geneId: string,
  name: string,
  inheritance: HognoseComponent["inheritance"],
  aliases: string[] = [],
): HognoseComponent => ({ geneId, name, copies: 1, inheritance, kind: "gene", aliases });

const RECESSIVES: HognoseComponent[] = [
  gene("albino", "Albino", "recessive", ["amelanistic", "amel"]),
  gene("axanthic", "Axanthic", "recessive", ["anery", "anerythristic"]),
  gene("caramel", "Caramel", "recessive"),
  gene("evans-hypo", "Evan's Hypo", "recessive", ["evans hypo", "evan's hypo", "dutch hypo", "hypo"]),
  gene("lavender", "Lavender", "recessive", ["lav"]),
  gene("leucistic", "Leucistic", "recessive", ["lucy"]),
  gene("pink-pastel-albino", "Pink Pastel Albino", "recessive", ["ppa", "pink pastel"]),
  gene("pistachio", "Pistachio", "recessive"),
  gene("sable", "Sable", "recessive"),
  gene("swiss-chocolate", "Swiss Chocolate", "recessive", ["swiss choc", "chocolate"]),
  gene("toffeebelly", "Toffeebelly", "recessive", ["toffee belly", "toffee"]),
];

const DOMINANTS: HognoseComponent[] = [
  gene("cinnamon", "Cinnamon", "dominant"),
  gene("skullface", "Skullface", "dominant"),
];

const MODIFIERS: HognoseComponent[] = [
  gene("conda", "Conda", "incomplete_dominant", ["anaconda"]),
  gene("arctic", "Arctic", "incomplete_dominant"),
  gene("antarctic", "Antarctic", "allelic"),
  gene("pastel", "Pastel", "polygenic"),
  gene("lemon-ghost", "Lemon Ghost", "polygenic"),
  gene("symphony", "Symphony", "polygenic"),
  gene("extreme-red", "Extreme Red", "polygenic"),
  gene("woma", "Woma", "polygenic"),
  gene("granite", "Granite", "polygenic"),
  gene("granite-jungle", "Granite Jungle", "polygenic"),
  gene("jaguar", "Jaguar", "line_bred"),
  gene("jungle", "Jungle", "line_bred"),
  gene("purple-line", "Purple Line", "line_bred"),
  gene("green-line", "Green Line", "line_bred"),
  gene("yellow-line", "Yellow Line", "line_bred"),
  gene("shadow", "Shadow", "polygenic"),
  gene("tiger", "Tiger", "polygenic"),
  gene("twinspot", "Twinspot", "polygenic"),
  gene("watermelon", "Watermelon", "polygenic"),
];

const TOKEN_COMPONENTS = [...RECESSIVES, ...DOMINANTS, ...MODIFIERS];
const SUPER_ALIASES: Array<{ token: string; geneId: string; name: string }> = [
  { token: "super arctic", geneId: "arctic", name: "Super Arctic" },
  { token: "superarctic", geneId: "arctic", name: "Super Arctic" },
  { token: "super antarctic", geneId: "antarctic", name: "Super Antarctic" },
  { token: "superantarctic", geneId: "antarctic", name: "Super Antarctic" },
  { token: "super conda", geneId: "conda", name: "Super Conda" },
  { token: "superconda", geneId: "conda", name: "Super Conda" },
];

const CORE_GENE_MAP = new Map(TOKEN_COMPONENTS.flatMap((item) => [item.name, ...(item.aliases ?? [])].map((value) => [normalise(value), item] as const)));

function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[+×x/,;&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signature(components: HognoseComponent[]): string {
  return [...components]
    .sort((a, b) => a.geneId.localeCompare(b.geneId))
    .map((item) => `${item.geneId}:${item.copies}`)
    .join("|");
}

function cloneWithCopies(item: HognoseComponent, copies: 1 | 2, kind: HognoseComponent["kind"]): HognoseComponent {
  return { ...item, copies, kind };
}

const NAMED_COMBINATION_OVERRIDES: Array<{
  name: string;
  aliases?: string[];
  components: HognoseComponent[];
  confidence: HognoseMorphResolution["confidence"];
  sourceUrls?: string[];
  notes?: string[];
}> = [
  {
    name: "Crystal Diamond Superconda",
    aliases: ["Superarctic Coral Superconda"],
    components: [
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(RECESSIVES[4], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_HUB_CRYSTAL_DIAMOND, HOGNOSE_MORPHS],
    notes: ["Crystal Diamond Superconda is explicitly documented as Albino x2 + Lavender x2 + Arctic x2 + Anaconda x2.", "Superarctic and Superconda are two-copy states, not independent loci."],
  },
  {
    name: "Moonstruck",
    aliases: ["Arctic Conda Lavender", "Lavender Arctic Conda"],
    components: [
      cloneWithCopies(RECESSIVES[4], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 1, "gene"),
      cloneWithCopies(MODIFIERS[0], 1, "gene"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
    notes: ["Arctic x1 + Anaconda/Conda x1 + Lavender x2."],
  },
  {
    name: "Grey Fog",
    aliases: ["Arctic Conda", "Arctic Anaconda"],
    components: [
      cloneWithCopies(MODIFIERS[1], 1, "gene"),
      cloneWithCopies(MODIFIERS[0], 1, "gene"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS, HOGNOSE_HUB_GUIDE],
  },
  {
    name: "Platinum",
    aliases: ["Arctic Superconda", "Arctic Super Conda"],
    components: [
      cloneWithCopies(MODIFIERS[1], 1, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS, HOGNOSE_HUB_GUIDE],
  },
  {
    name: "Subzero",
    components: [
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Bub's Daddy",
    aliases: ["Bubs Daddy", "Bub’s Daddy"],
    components: [
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
      cloneWithCopies(MODIFIERS[0], 1, "gene"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Super Daddy",
    aliases: ["Super AAA"],
    components: [
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Super Moon",
    components: [
      cloneWithCopies(RECESSIVES[4], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Candy",
    components: [cloneWithCopies(RECESSIVES[10], 2, "gene"), cloneWithCopies(MODIFIERS[0], 2, "super")],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Toffeeglow Superconda",
    components: [
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(RECESSIVES[10], 2, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Purple Punch Superconda",
    components: [
      cloneWithCopies(RECESSIVES[1], 2, "gene"),
      cloneWithCopies(RECESSIVES[10], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Pink Punch Superconda",
    components: [
      cloneWithCopies(RECESSIVES[10], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Coralburst Arctic Superconda",
    components: [
      cloneWithCopies(RECESSIVES[8], 2, "gene"),
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(RECESSIVES[4], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 1, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Lavender Toxic Superconda",
    components: [
      cloneWithCopies(RECESSIVES[4], 2, "gene"),
      cloneWithCopies(RECESSIVES[1], 2, "gene"),
      cloneWithCopies(RECESSIVES[10], 2, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Toffeeburst Superconda",
    components: [
      cloneWithCopies(RECESSIVES[8], 2, "gene"),
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(RECESSIVES[10], 2, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Toasted Lavender Superconda",
    components: [
      cloneWithCopies(RECESSIVES[8], 2, "gene"),
      cloneWithCopies(RECESSIVES[2], 2, "gene"),
      cloneWithCopies(RECESSIVES[4], 2, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Lemon Ghost Lavender Superconda",
    components: [
      cloneWithCopies(MODIFIERS[4], 1, "modifier"),
      cloneWithCopies(RECESSIVES[4], 2, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Pink Pastel Arctic Anaconda",
    components: [
      cloneWithCopies(RECESSIVES[6], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 1, "gene"),
      cloneWithCopies(MODIFIERS[0], 1, "gene"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Pink Pastel Arctic Superconda",
    components: [
      cloneWithCopies(RECESSIVES[6], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 1, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Snow Chocolate Superconda",
    components: [
      cloneWithCopies(RECESSIVES[9], 2, "gene"),
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(RECESSIVES[1], 2, "gene"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Super Avalanche",
    components: [
      cloneWithCopies(RECESSIVES[0], 2, "gene"),
      cloneWithCopies(RECESSIVES[1], 2, "gene"),
      cloneWithCopies(MODIFIERS[1], 2, "super"),
      cloneWithCopies(MODIFIERS[0], 2, "super"),
    ],
    confidence: "high",
    sourceUrls: [HOGNOSE_MORPHS],
  },
];

const NAMED_BY_KEY = new Map<string, typeof NAMED_COMBINATION_OVERRIDES[number]>();
for (const item of NAMED_COMBINATION_OVERRIDES) {
  NAMED_BY_KEY.set(normalise(item.name), item);
  for (const alias of item.aliases ?? []) NAMED_BY_KEY.set(normalise(alias), item);
}

function toMorphComponents(components: HognoseComponent[]): MorphComponent[] {
  return components.map((component) => ({
    morphId: component.geneId,
    type: component.kind === "super" ? "Super" : component.kind === "modifier" ? "Polygenic" : "Gene",
    copies: component.copies,
  }));
}

function consumeLongestTokens(query: string): HognoseComponent[] {
  let remainder = normalise(query);
  const output: HognoseComponent[] = [];

  const superTokens = [...SUPER_ALIASES].sort((a, b) => b.token.length - a.token.length);
  for (const superToken of superTokens) {
    const escaped = superToken.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "i");
    if (!pattern.test(remainder)) continue;
    const base = TOKEN_COMPONENTS.find((item) => item.geneId === superToken.geneId);
    if (!base) continue;
    output.push(cloneWithCopies(base, 2, "super"));
    remainder = remainder.replace(pattern, " ").replace(/\s+/g, " ").trim();
  }

  const tokens = [...TOKEN_COMPONENTS].sort((a, b) => {
    const aLength = Math.max(a.name.length, ...(a.aliases ?? []).map((value) => value.length));
    const bLength = Math.max(b.name.length, ...(b.aliases ?? []).map((value) => value.length));
    return bLength - aLength;
  });

  for (const item of tokens) {
    const names = [item.name, ...(item.aliases ?? [])].sort((a, b) => b.length - a.length);
    for (const token of names) {
      const escaped = normalise(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "i");
      if (!pattern.test(remainder)) continue;
      output.push(cloneWithCopies(item, item.inheritance === "recessive" ? 2 : 1, item.inheritance === "polygenic" || item.inheritance === "line_bred" ? "modifier" : "gene"));
      remainder = remainder.replace(pattern, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }

  return output;
}

export function resolveHognoseMorphInput(query: string): HognoseMorphResolution {
  const input = query.trim();
  const key = normalise(input);
  const named = NAMED_BY_KEY.get(key);
  if (named) {
    return {
      input,
      matchedName: named.name,
      aliases: named.aliases ?? [],
      components: named.components,
      morphComponents: toMorphComponents(named.components),
      signature: signature(named.components),
      confidence: named.confidence,
      sourceUrls: named.sourceUrls ?? [HOGNOSE_MORPHS, HOGNOSE_HUB_GUIDE],
      notes: named.notes ?? [],
    };
  }

  const components = consumeLongestTokens(input);
  const unmatched = normalise(input)
    .replace(/super arctic|superarctic|super antarctic|superantarctic|super conda|superconda/gi, " ")
    .split(" ")
    .filter(Boolean)
    .filter((token) => !CORE_GENE_MAP.has(token));

  const hasComponents = components.length > 0;
  const unresolved = unmatched.length > 0;
  const confidence: HognoseMorphResolution["confidence"] = !hasComponents
    ? "unresolved"
    : unresolved
      ? "limited"
      : "moderate";

  const notes: string[] = [];
  if (unresolved) notes.push(`Unresolved name token(s): ${unmatched.join(", ")}.`);
  if (components.some((item) => item.geneId === "arctic") && components.some((item) => item.geneId === "antarctic")) {
    notes.push("Arctic and Antarctic occupy the same allelic locus; do not model them as independent loci.");
  }
  if (components.some((item) => item.kind === "modifier")) {
    notes.push("Polygenic/line-bred modifiers are retained for recognition but are not treated as simple Mendelian loci.");
  }

  return {
    input,
    aliases: [],
    components,
    morphComponents: toMorphComponents(components),
    signature: signature(components),
    confidence,
    sourceUrls: [HOGNOSE_MORPHS, HOGNOSE_HUB_GUIDE],
    notes,
  };
}

export function normaliseHognoseMorphName(value: string): string {
  return normalise(value);
}

export function getKnownHognoseNamedCombinations(): string[] {
  return NAMED_COMBINATION_OVERRIDES.map((item) => item.name);
}

export function getKnownHognoseCombinationAliases(): Record<string, string> {
  return Object.fromEntries(
    NAMED_COMBINATION_OVERRIDES.flatMap((item) => (item.aliases ?? []).map((alias) => [alias, item.name] as const)),
  );
}
