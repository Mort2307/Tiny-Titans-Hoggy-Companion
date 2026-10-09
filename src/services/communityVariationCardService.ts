import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MorphSubmissionCategory } from "../types/morphSubmission";

export type ApprovedCommunityVariationCard = {
  id: string;
  speciesId: string;
  speciesName?: string;
  name: string;
  category: MorphSubmissionCategory;
  description: string;
  knownGenetics?: string;
  sourceOrBreeder?: string;
  sourceUrl?: string;
  sourceSubmissionId: string;
  contributorUid?: string;
  reviewerNotes?: string;
  geneticsStatus: "unresolved";
  calculatorEligible: false;
  approvedAt?: unknown;
  approvedBy?: string;
};

export async function getApprovedCommunityVariationCards(speciesId: string): Promise<ApprovedCommunityVariationCard[]> {
  if (!speciesId) return [];
  const snapshot = await getDocs(query(collection(db, "approvedMorphVariations"), where("speciesId", "==", speciesId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...(item.data() as Omit<ApprovedCommunityVariationCard, "id">) }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }));
}
