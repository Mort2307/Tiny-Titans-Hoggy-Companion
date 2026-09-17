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

export type TitanAskRequest = {
  question: string;
  animalId?: string;
  workspaceKind?: TitanWorkspaceKind;
  history?: readonly { role: "user" | "model"; content: string }[];
};

export type TitanAskResponse = {
  success: true;
  text: string;
  model: string;
  sources: TitanSource[];
  searchUsed: boolean;
  toolCalls: TitanToolCall[];
  provenance: TitanProvenance;
  usage: TitanUsage;
  access: { effectiveTier: string; source: string; workspaceKind: TitanWorkspaceKind };
};