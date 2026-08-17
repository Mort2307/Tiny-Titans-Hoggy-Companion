import type { MorphImageSubmission, MorphSubmissionStatus } from "../types/morphSubmission";

/** Canonical moderation transitions for community morph-image submissions. */
const TERMINAL = new Set<MorphSubmissionStatus>(["Rejected", "Removed"]);

export function getAllowedMorphSubmissionTransitions(status: MorphSubmissionStatus): MorphSubmissionStatus[] {
  switch (status) {
    case "Pending": return ["NeedsInfo", "Approved", "Rejected"];
    case "NeedsInfo": return ["Pending", "Approved", "Rejected"];
    case "Approved": return ["Removed"];
    case "Rejected": return ["Pending"];
    case "Removed": return [];
    default: return [];
  }
}

export function canTransitionMorphSubmission(from: MorphSubmissionStatus, to: MorphSubmissionStatus): boolean {
  if (from === to) return true;
  return getAllowedMorphSubmissionTransitions(from).includes(to);
}

export function isTerminalMorphSubmissionStatus(status: MorphSubmissionStatus): boolean {
  return TERMINAL.has(status);
}

export function isAwaitingMorphReview(status: MorphSubmissionStatus): boolean {
  return status === "Pending" || status === "NeedsInfo";
}

/** Validate the client-side prerequisites before the server-side approval callable is invoked. */
export function validateMorphSubmissionForApproval(submission: MorphImageSubmission): string | null {
  if (!isAwaitingMorphReview(submission.status)) return "This submission is no longer awaiting review.";
  if (!submission.morphId) return "A canonical Morph Library entry is required before approval.";
  if (!submission.attachment?.path) return "A valid image attachment is required before approval.";
  if (submission.attachment.type !== "image") return "Only image submissions can be approved.";
  if (!submission.photoRequirementsConfirmed) return "The submitter must confirm the photo requirements.";
  if (!submission.factualAccuracyConfirmed) return "The submitter must confirm factual accuracy.";
  return null;
}

export function getMorphSubmissionActionLabel(status: MorphSubmissionStatus): string {
  switch (status) {
    case "Pending": return "Awaiting review";
    case "NeedsInfo": return "Needs information";
    case "Approved": return "Published / approved";
    case "Rejected": return "Rejected";
    case "Removed": return "Removed";
    default: return status;
  }
}