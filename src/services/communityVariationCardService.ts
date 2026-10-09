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
  geneticsStatus: "unresolved";
  calculatorEligible: false;
  approvedAt?: unknown;
};

function safeHttpUrl(value: unknown): string | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function getApprovedCommunityVariationCards(speciesId: string): Promise<ApprovedCommunityVariationCard[]> {
  if (!speciesId) return [];
  const snapshot = await getDocs(query(collection(db, "approvedMorphVariations"), where("speciesId", "==", speciesId)));
  return snapshot.docs
    .map((item) => { const data = item.data() as Omit<ApprovedCommunityVariationCard, "id">; return { id: item.id, ...data, sourceUrl: safeHttpUrl(data.sourceUrl) }; })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }));
}


export function communityVariationCategoryLabel(category: MorphSubmissionCategory): string {
  switch (category) {
    case "single-gene": return "Possible genetic trait";
    case "super-form": return "Possible super / homozygous form";
    case "combination": return "Possible combination";
    case "polygenic": return "Possible polygenic trait";
    case "line-bred": return "Line-bred / selectively bred variation";
    case "colour-variation": return "Colour variation";
    case "pattern-variation": return "Pattern variation";
    case "locality": return "Locality / geographic form";
    case "regional-name": return "Regional name / alias";
    default: return "Unclassified variation";
  }
}
