export type HetPercentage =
  | "100%"
  | "66%"
  | "50%"
  | "33%"
  | "25%";



export type Het = {

  gene: string;

  percentage: HetPercentage;

};





export type GeneCategory =

  | "Recessive"

  | "Incomplete Dominant"

  | "Dominant"

  | "Co-Dominant"

  | "Polygenic"

  | "Line Bred"

  | "Unknown";





export type MorphTrait = {

  name: string;


  category: GeneCategory;


  description: string;


  // Example:
  // Albino = recessive
  // Arctic = incomplete dominant
  // Super Arctic = super form

  superForm?: string;


  alleles?: {

    visual?: string;

    het?: string;

  };


};





export type SnakeGene = {

  gene: string;


  visual:

    | boolean

    | "Possible";


  het?: HetPercentage;


};





export type GeneticsRecord = {

  morphs: MorphTrait[];


  genes: SnakeGene[];


  hets: Het[];


  notes: string;

};