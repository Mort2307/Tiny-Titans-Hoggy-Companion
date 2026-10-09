import type { MorphImageSubmission, MorphSubmissionStatus } from "../types/morphSubmission";
import { getMasterMorphByGeneId, resolveMasterMorph } from "../data/masterMorphDatabase";
import { getSpeciesVisualMorphs } from "../data/species/speciesGenetics";

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

function resolveSubmissionMorph(submission: MorphImageSubmission) {
  const requestedId = submission.morphId?.trim();
  const requestedName = submission.morphName.trim();
  if (submission.speciesId) {
    const speciesMorphs = getSpeciesVisualMorphs(submission.speciesId);
    const listed = speciesMorphs.find((morph) =>
      morph.geneId === requestedId ||
      morph.name.trim().toLowerCase() === requestedName.toLowerCase() ||
      (morph.aliases ?? []).some((alias) => alias.trim().toLowerCase() === requestedName.toLowerCase()),
    );
    if (listed) return listed;

    // Only Western Hognose may use the legacy master resolver for
    // resolver-generated combinations. Other species must never fall through
    // to another species' canonical genetics.
    if (submission.speciesId === "heterodon-nasicus") {
      return requestedId
        ? getMasterMorphByGeneId(requestedId) ?? resolveMasterMorph(requestedId)
        : resolveMasterMorph(requestedName);
    }
    return null;
  }
  return requestedId
    ? getMasterMorphByGeneId(requestedId) ?? resolveMasterMorph(requestedId)
    : resolveMasterMorph(requestedName);
}

/** Validate client-side prerequisites before the server-side approval callable is invoked. */
export function validateMorphSubmissionForApproval(submission: MorphImageSubmission): string | null {
  if (!isAwaitingMorphReview(submission.status)) return "This submission is no longer awaiting review.";
  if (!submission.morphId?.trim() && !submission.morphName.trim()) return "A canonical Morph Library entry is required before approval.";
  const canonical = resolveSubmissionMorph(submission);
  if (!canonical) return `This submission does not match a canonical Morph Library entry for ${submission.speciesName ?? "the selected species"}. Check the species and morph before approving.`;

  // Species-specific catalogues must contain the canonical record. Western
  // Hognose additionally permits resolver-generated canonical combinations.
  if (submission.speciesId && submission.speciesId !== "heterodon-nasicus") {
    const speciesMorphs = getSpeciesVisualMorphs(submission.speciesId);
    if (!speciesMorphs.some((morph) => morph.geneId === canonical.geneId)) {
      return "The resolved morph is not registered for the selected species. Do not approve cross-species imagery.";
    }
  }
  if (!submission.attachment?.path) return "A valid media attachment is required before approval.";
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