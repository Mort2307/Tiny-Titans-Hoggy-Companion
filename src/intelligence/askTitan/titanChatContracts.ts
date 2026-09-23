export type TitanWorkspaceKind = "personal" | "rescue" | "business" | "seller";
export type TitanProvenanceCategory = "USER_DATA" | "CALCULATED_DATA" | "EXTERNAL_SOURCE" | "COMMUNITY_OBSERVATION" | "VERIFIED_CONTRIBUTOR" | "VETERINARY_SOURCE" | "AI_INTERPRETATION" | "SYSTEM_RULE" | "UNKNOWN";

export type TitanSource = {
  title: string;
  uri: string;
  type: "EXTERNAL_SOURCE";
};

export type TitanToolCall = {
  name: string;
  kind: "user_data" | "calculated_data" | "workspace_context";
};

export type TitanProvenance = {
  categories: TitanProvenanceCategory[];
  userDataUsed: boolean;
  calculatedDataUsed: boolean;
  externalSourcesUsed: boolean;
  aiInterpretationUsed: boolean;
  creatorAuthorshipClaim: boolean;
  statement: string;
};

export type TitanUsage = {
  used: number;
  limit: number;
  remaining: number;
};


export type TitanSpeciesReference = {
  id: string;
  commonName: string;
  scientificName: string;
  animalGroup: string;
  family: string;
  genus: string;
  lifestyle: string[];
  dietaryGuild: string;
  careStatus: string;
  careResolution: string[];
  husbandry: Array<{ label: string; guidance: string; priority: string; basis: string; caveat: string }>;
  healthBaseline: string[];
  healthWatch: Array<{ concern: string; watchFor: string[]; riskFactors: string[]; prevention: string; priority: string; basis: string; caveat: string }>;
  unresolved: string[];
};

export type TitanAskRequest = {
  question: string;
  animalId?: string;
  workspaceKind?: TitanWorkspaceKind;
  history?: readonly { role: "user" | "model"; content: string }[];
  speciesId?: string;
  speciesReference?: TitanSpeciesReference;
};

export type TitanAskResponse = {
  success: true;
  responseId: string;
  text: string;
  model: string;
  sources: TitanSource[];
  searchUsed: boolean;
  toolCalls: TitanToolCall[];
  provenance: TitanProvenance;
  usage: TitanUsage;
  access: { effectiveTier: string; source: string; workspaceKind: TitanWorkspaceKind };
};