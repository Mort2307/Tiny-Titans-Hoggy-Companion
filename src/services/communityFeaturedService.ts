import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityBoardKey, CommunityContentType, CommunityPermission } from "../types/communityEcosystem";

const featuredSubmissions = collection(db, "communityContent");

export type FeaturedSubmissionInput = {
  type: Exclude<CommunityContentType, "marketplace" | "event" | "challenge">;
  title: string;
  summary: string;
  body: string;
  authorId: string;
  authorDisplayName: string;
  imageUrl?: string;
  species?: string;
  morph?: string;
  board?: CommunityBoardKey;
  reason: string;
};

export async function submitForFeatured(input: FeaturedSubmissionInput): Promise<string> {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const body = input.body.trim();
  const reason = input.reason.trim();
  if (!title || title.length < 4) throw new Error("Give your submission a useful title.");
  if (!summary || summary.length < 10) throw new Error("Add a short summary so the community knows what it is.");
  if (!body || body.length < 30) throw new Error("Please provide a little more detail about your submission.");
  if (!reason || reason.length < 10) throw new Error("Tell us why you think this deserves the spotlight.");

  const permissions: CommunityPermission[] = ["featured"];
  if (input.type === "showcase") permissions.push("showcase");
  if (input.type === "project") permissions.push("project");

  const payload = {
    type: input.type,
    title,
    summary,
    body,
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName || "Tiny Titans Keeper",
    imageUrl: input.imageUrl?.trim() || null,
    species: input.species?.trim() || null,
    morph: input.morph?.trim() || null,
    board: input.board || null,
    visibility: "community" as const,
    permissions,
    moderationStatus: "pending" as const,
    featuredUntil: null,
    featureReason: reason,
    engagement: { helpful: 0, likes: 0, comments: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(featuredSubmissions, payload);
  return ref.id;
}
