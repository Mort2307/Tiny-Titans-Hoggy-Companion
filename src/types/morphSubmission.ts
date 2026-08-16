export type MorphSubmissionCredit = "name" | "social" | "anonymous";

export type MorphSubmissionStatus = "Pending" | "Approved" | "Rejected" | "NeedsInfo" | "Removed";

export type MorphImageSubmission = {
  id: string;
  userId?: string;
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
