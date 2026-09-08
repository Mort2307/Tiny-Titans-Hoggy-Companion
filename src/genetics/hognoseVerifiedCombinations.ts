import type { HognoseComponent } from "./hognoseMorphResolver.ts";

const HOGNOSE_MORPHS = "https://hognose-morphs.com/morphs/all";

const component = (
  geneId: string,
  name: string,
  inheritance: HognoseComponent["inheritance"],
  copies: 1 | 2,
  kind: HognoseComponent["kind"] = inheritance === "polygenic" || inheritance === "line_bred" ? "modifier" : "gene",
): HognoseComponent => ({
  geneId,
  name,
  inheritance,
  copies,
  kind,
  aliases: [],
});

const recessive = (geneId: string, name: string) => component(geneId, name, "recessive", 2);
const incomplete = (geneId: string, name: string, copies: 1 | 2 = 1, kind: HognoseComponent["kind"] = copies === 2 ? "super" : "gene") => component(geneId, name, "incomplete_dominant", copies, kind);
const dominant = (geneId: string, name: string) => component(geneId, name, "dominant", 1);
const polygenic = (geneId: string, name: string) => component(geneId, name, "polygenic", 1, "modifier");

export const VERIFIED_HOGNOSE_NAMED_COMBINATIONS: Array<{
  name: string;
  aliases?: string[];
  components: HognoseComponent[];
  sourceUrls: string[];
  notes?: string[];
}> = [
  {
    name: "Banshee Anaconda",
    components: [recessive("evans-hypo", "Evan's Hypo"), incomplete("arctic", "Arctic"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Banshee Superconda",
    components: [recessive("evans-hypo", "Evan's Hypo"), incomplete("arctic", "Arctic"), incomplete("conda", "Conda", 2)],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Stormcloud Anaconda",
    components: [recessive("sable", "Sable"), recessive("axanthic", "Axanthic"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Stormcloud Arctic Anaconda",
    components: [recessive("sable", "Sable"), recessive("axanthic", "Axanthic"), incomplete("arctic", "Arctic"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Lavender Stormcloud Arctic",
    components: [recessive("sable", "Sable"), recessive("axanthic", "Axanthic"), recessive("lavender", "Lavender"), incomplete("arctic", "Arctic")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Maitai Anaconda",
    components: [recessive("sable", "Sable"), recessive("toffeebelly", "Toffeebelly"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Maitai Superarctic",
    components: [recessive("sable", "Sable"), recessive("toffeebelly", "Toffeebelly"), incomplete("arctic", "Arctic", 2)],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Maitai Superarctic Anaconda",
    components: [recessive("sable", "Sable"), recessive("toffeebelly", "Toffeebelly"), incomplete("arctic", "Arctic", 2), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Conda",
    components: [polygenic("red-line", "Red Line"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Arctic",
    components: [polygenic("red-line", "Red Line"), incomplete("arctic", "Arctic")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Arctic Conda",
    components: [polygenic("red-line", "Red Line"), incomplete("arctic", "Arctic"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Albino",
    components: [polygenic("red-line", "Red Line"), recessive("albino", "Albino")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Albino Conda",
    components: [polygenic("red-line", "Red Line"), recessive("albino", "Albino"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Sable",
    components: [polygenic("red-line", "Red Line"), recessive("sable", "Sable")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Arctic Sable",
    components: [polygenic("red-line", "Red Line"), incomplete("arctic", "Arctic"), recessive("sable", "Sable")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Red Line Arctic Albino Anaconda",
    components: [polygenic("red-line", "Red Line"), recessive("albino", "Albino"), incomplete("arctic", "Arctic"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Extreme Red Sunburst",
    components: [polygenic("extreme-red", "Extreme Red"), recessive("albino", "Albino"), recessive("sable", "Sable")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Extreme Red Sunburst Superarctic",
    components: [polygenic("extreme-red", "Extreme Red"), recessive("albino", "Albino"), recessive("sable", "Sable"), incomplete("arctic", "Arctic", 2)],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Sunburst Conda",
    components: [recessive("albino", "Albino"), recessive("sable", "Sable"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Pink Pastel Maitai Arctic Anaconda",
    components: [recessive("pink-pastel-albino", "Pink Pastel Albino"), recessive("sable", "Sable"), recessive("toffeebelly", "Toffeebelly"), incomplete("arctic", "Arctic"), incomplete("conda", "Conda")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Toffee Panda",
    components: [recessive("toffeebelly", "Toffeebelly")],
    sourceUrls: [HOGNOSE_MORPHS],
    notes: ["Source lists the name, but current structured genetics evidence does not establish Panda as an independent locus; only Toffeebelly is retained here rather than inventing a Panda gene."],
  },
  {
    name: "Superconda Snow",
    components: [recessive("albino", "Albino"), recessive("axanthic", "Axanthic"), incomplete("conda", "Conda", 2)],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Superconda Toxic",
    components: [recessive("axanthic", "Axanthic"), recessive("toffeebelly", "Toffeebelly"), incomplete("conda", "Conda", 2)],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Superconda Yeti",
    components: [incomplete("conda", "Conda", 2)],
    sourceUrls: [HOGNOSE_MORPHS],
    notes: ["Yeti is preserved as an unresolved named term; the source-backed Superconda component is retained without fabricating a Yeti locus."],
  },
  {
    name: "Snow Chocolate",
    components: [recessive("swiss-chocolate", "Swiss Chocolate"), recessive("albino", "Albino"), recessive("axanthic", "Axanthic")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Gaverth Green Lemon Ghost",
    components: [polygenic("gaverth-green", "Gaverth Green"), polygenic("lemon-ghost", "Lemon Ghost")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Lavender Oxide",
    components: [recessive("sable", "Sable"), recessive("lavender", "Lavender"), recessive("evans-hypo", "Evan's Hypo")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Toffee Frosted",
    components: [recessive("toffeebelly", "Toffeebelly"), recessive("caramel", "Caramel"), recessive("evans-hypo", "Evan's Hypo")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Paint Maker Anaconda",
    components: [recessive("toffeebelly", "Toffeebelly"), incomplete("conda", "Conda"), polygenic("lemon-ghost", "Lemon Ghost")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Cinnamon Lemon Ghost Extreme Red Anaconda",
    components: [dominant("cinnamon", "Cinnamon"), incomplete("conda", "Conda"), polygenic("lemon-ghost", "Lemon Ghost"), polygenic("extreme-red", "Extreme Red")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
  {
    name: "Sable Cinnamon Anaconda",
    components: [dominant("cinnamon", "Cinnamon"), incomplete("conda", "Conda"), recessive("sable", "Sable")],
    sourceUrls: [HOGNOSE_MORPHS],
  },
];
