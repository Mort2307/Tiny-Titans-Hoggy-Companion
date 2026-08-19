export type MorphSubmissionStatus = "pending" | "under-review" | "approved" | "rejected" | "merged";

export type MorphSubmissionCategory = "single-gene" | "super-form" | "combination" | "polygenic" | "line-bred" | "regional-name" | "unknown";

export type UserMorphSubmission = {
  id: string;
  userId: string;
  submittedName: string;
  region: "global" | "uk" | "usa" | "europe" | "australia" | "other";
  category: MorphSubmissionCategory;
  description: string;
  knownGenetics?: string;
  sourceOrBreeder?: string;
  sourceUrl?: string;
  photoUrl?: string;
  status: MorphSubmissionStatus;
  matchedCanonicalMorphId?: string;
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
};
