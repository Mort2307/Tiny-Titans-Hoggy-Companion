// Tiny Titans knowledge-status model
// Describes the strength and maturity of a terminology or morph claim.
// This is intentionally separate from the definition itself so the UI can
// surface uncertainty without changing the user's normal explanation.

export type KnowledgeStatus =
  | "established"
  | "widelyAccepted"
  | "communityTerm"
  | "emerging"
  | "disputed"
  | "insufficientEvidence";

export interface KnowledgeStatusInfo {
  status: KnowledgeStatus;
  label: string;
  summary: string;
  evidenceNote?: string;
  communityNote?: string;
  tinyTitansApproach?: string;
  lastReviewed?: string;
}

export const KNOWLEDGE_STATUS_INFO: Record<KnowledgeStatus, KnowledgeStatusInfo> = {
  established: {
    status: "established",
    label: "Established",
    summary: "The underlying concept or information is well established.",
  },
  widelyAccepted: {
    status: "widelyAccepted",
    label: "Widely accepted",
    summary: "This is widely accepted across the international keeper and breeding community.",
  },
  communityTerm: {
    status: "communityTerm",
    label: "Community terminology",
    summary: "This term is widely used by keepers and breeders, although it is not necessarily a formal scientific classification.",
  },
  emerging: {
    status: "emerging",
    label: "Emerging",
    summary: "This is a developing area where understanding or terminology is still evolving.",
  },
  disputed: {
    status: "disputed",
    label: "Disputed",
    summary: "There is meaningful disagreement about the interpretation, terminology or inheritance involved.",
  },
  insufficientEvidence: {
    status: "insufficientEvidence",
    label: "Insufficient evidence",
    summary: "There is not currently enough reliable evidence to present a stronger claim as fact.",
  },
};

export interface KnowledgeNote {
  status: KnowledgeStatus;
  evidenceNote?: string;
  communityNote?: string;
  tinyTitansApproach?: string;
  lastReviewed?: string;
}

/**
 * Builds the small contextual note shown only when a term has useful
 * uncertainty, community terminology or evidence context to disclose.
 */
export function hasKnowledgeNote(note?: KnowledgeNote): boolean {
  if (!note) return false;
  return Boolean(
    note.evidenceNote ||
      note.communityNote ||
      note.tinyTitansApproach ||
      note.lastReviewed ||
      note.status !== "established",
  );
}
