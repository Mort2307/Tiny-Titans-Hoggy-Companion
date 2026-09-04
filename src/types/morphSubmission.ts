export type MorphSubmissionCredit = "name" | "social" | "anonymous";

/** Canonical moderation status for community morph-image submissions. */
export type MorphSubmissionStatus = "Pending" | "Approved" | "Rejected" | "NeedsInfo" | "Removed";

export type MorphImageSubmission = {
  id: string;
  userId?: string;
  speciesId: string;
  speciesName?: string;
  morphId?: string;
  morphName: string;
  description: string;
  geneticsNotes?: string;
  observedTraits?: string;
  proofDetails: string;
  proofReference?: string;
  photoRequirementsConfirmed: boolean;
  factualAccuracyConfirmed: boolean;
  creditType: MorphSubmissionCredit;
  creditName?: string;
  creditSocial?: string;
  attachment: {
    path: string;
    type: "image";
    sizeBytes: number;
  };
  issueFingerprint?: string;
  status: MorphSubmissionStatus;
  submittedAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
  rejectionReason?: string;
};

export type ApprovedMorphImage = {
  id: string;
  speciesId?: string;
  speciesName?: string;
  morphId: string;
  morphName: string;
  imageUrl: string;
  storagePath: string;
  creditType: MorphSubmissionCredit;
  creditName?: string;
  creditSocial?: string;
  sourceSubmissionId: string;
  approvedAt?: unknown;
  approvedBy?: string;
};

/** User-submitted regional terminology is a separate workflow and intentionally
 * keeps its lowercase Firestore status vocabulary. */
export type MorphSubmissionCategory = "single-gene" | "super-form" | "combination" | "polygenic" | "line-bred" | "regional-name" | "unknown";
export type UserMorphSubmissionStatus = "pending" | "under-review" | "approved" | "rejected" | "merged";

export type UserMorphSubmission = {
  id: string;
  userId: string;
  speciesId: string;
  speciesName?: string;
  submittedName: string;
  region: "global" | "uk" | "usa" | "europe" | "australia" | "other";
  category: MorphSubmissionCategory;
  description: string;
  knownGenetics?: string;
  sourceOrBreeder?: string;
  sourceUrl?: string;
  photoUrl?: string;
  status: UserMorphSubmissionStatus;
  matchedCanonicalMorphId?: string;
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
};