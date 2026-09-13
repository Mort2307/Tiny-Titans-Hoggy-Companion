import { getFunctions, httpsCallable } from "firebase/functions";
import type { MorphImageSubmission, MorphSubmissionStatus } from "../types/morphSubmission";

export type CreatorMorphReviewDraft = Partial<Pick<MorphImageSubmission,
  "speciesId" | "speciesName" | "morphId" | "morphName" | "description" | "geneticsNotes" |
  "observedTraits" | "proofDetails" | "proofReference" | "creditType" | "creditName" |
  "creditSocial" | "allowMorphLibraryLink"
>> & {
  status?: Extract<MorphSubmissionStatus, "Pending" | "NeedsInfo">;
  creatorReviewerNotes?: string;
};

export async function saveMorphSubmissionReview(submissionId: string, draft: CreatorMorphReviewDraft) {
  const functions = getFunctions(undefined, "europe-west2");
  const callable = httpsCallable<{ submissionId: string; draft: CreatorMorphReviewDraft }, { success: boolean; submissionId: string; updatedAt: string | null }>(functions, "saveMorphSubmissionReview");
  const result = await callable({ submissionId, draft });
  return result.data;
}
