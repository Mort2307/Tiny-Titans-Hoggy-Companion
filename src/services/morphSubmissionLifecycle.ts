import type { MorphSubmissionStatus } from "../types/morphSubmission";

/**
 * Canonical moderation transitions for community morph-image submissions.
 * Existing Firestore statuses remain unchanged; this service centralises which
 * transitions are legitimate so Creator/Moderator UI cannot invent its own flow.
 */
const TERMINAL = new Set<MorphSubmissionStatus>(["Rejected", "Removed"]);

export function getAllowedMorphSubmissionTransitions(status: MorphSubmissionStatus): MorphSubmissionStatus[] {
  switch (status) {
    case "Pending":
      return ["NeedsInfo", "Approved", "Rejected"];
    case "NeedsInfo":
      return ["Pending", "Approved", "Rejected"];
    case "Approved":
      return ["Removed"];
    case "Rejected":
      return ["Pending"];
    case "Removed":
      return [];
    default:
      return [];
  }
}

export function canTransitionMorphSubmission(from: MorphSubmissionStatus, to: MorphSubmissionStatus): boolean {
  if (from === to) return true;
  return getAllowedMorphSubmissionTransitions(from).includes(to);
}

export function isTerminalMorphSubmissionStatus(status: MorphSubmissionStatus): boolean {
  return TERMINAL.has(status);
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
