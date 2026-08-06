export type Morph = {

  name: string;

  gene: string;

  category:
    | "Recessive"
    | "Dominant"
    | "Incomplete Dominant"
    | "Co-Dominant"
    | "Polygenic"
    | "Line Bred";

  inheritance: string;

  hetPossible: boolean;

  visualCopiesRequired: number;

  description: string;

};



export const morphs: Morph[] = [


  {
    name: "Albino",
    gene: "Albino",
    category: "Recessive",
    inheritance: "Autosomal Recessive",
    hetPossible: true,
    visualCopiesRequired: 2,
    description:
      "Recessive colour mutation affecting melanin production. Visual animals carry two copies. Carriers are recorded as 100% Het Albino."
  },


  {
    name: "Lavender",
    gene: "Lavender",
    category: "Recessive",
    inheritance: "Autosomal Recessive",
    hetPossible: true,
    visualCopiesRequired: 2,
    description:
      "Recessive colour mutation producing lavender pigmentation."
  },


  {
    name: "Axanthic",
    gene: "Axanthic",
    category: "Recessive",
    inheritance: "Autosomal Recessive",
    hetPossible: true,
    visualCopiesRequired: 2,
    description:
      "Recessive mutation reducing yellow pigmentation."
  },


  {
    name: "Arctic",
    gene: "Arctic",
    category: "Incomplete Dominant",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    visualCopiesRequired: 1,
    description:
      "Incomplete dominant pattern mutation. One copy produces Arctic. Two copies produce Super Arctic. Het Arctic does not exist."
  },


  {
    name: "Super Arctic",
    gene: "Arctic",
    category: "Incomplete Dominant",
    inheritance: "Incomplete Dominant (Super Form)",
    hetPossible: false,
    visualCopiesRequired: 2,
    description:
      "Two copies of Arctic producing enhanced expression. This is not a het."
  },


  {
    name: "Conda",
    gene: "Conda",
    category: "Incomplete Dominant",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    visualCopiesRequired: 1,
    description:
      "Incomplete dominant pattern mutation. One copy produces Conda. Two copies produce Super Conda. Het Conda does not exist."
  },


  {
    name: "Super Conda",
    gene: "Conda",
    category: "Incomplete Dominant",
    inheritance: "Incomplete Dominant (Super Form)",
    hetPossible: false,
    visualCopiesRequired: 2,
    description:
      "Two copies of Conda producing extreme pattern reduction. Not a het."
  },


  {
    name: "Sable",
    gene: "Sable",
    category: "Dominant",
    inheritance: "Autosomal Dominant",
    hetPossible: false,
    visualCopiesRequired: 1,
    description:
      "Dominant mutation producing darker pigmentation."
  },


  {
    name: "Toffee Belly",
    gene: "Toffee Belly",
    category: "Recessive",
    inheritance: "Autosomal Recessive",
    hetPossible: true,
    visualCopiesRequired: 2,
    description:
      "Recessive colour mutation. Visual animals carry two copies."
  }


];