import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityBoardKey, CommunityContentType, CommunityPermission } from "../types/communityEcosystem";

export type CreateCommunityContentInput = {
  type: CommunityContentType;
  title: string;
  summary?: string;
  body?: string;
  authorId: string;
  authorDisplayName?: string;
  imageUrl?: string | null;
  tags?: string[];
  species?: string | null;
  morph?: string | null;
  board?: CommunityBoardKey | null;
  permissions?: CommunityPermission[];
};

const MAX_TITLE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 280;
const MAX_BODY_LENGTH = 10_000;

function cleanText(value: string | undefined, maxLength: number): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

export async function createCommunityContent(input: CreateCommunityContentInput): Promise<string> {
  const title = cleanText(input.title, MAX_TITLE_LENGTH);
  if (!title) throw new Error("Please give your community submission a title.");
  if (!input.authorId) throw new Error("You must be signed in to submit community content.");

  const permissions = [...new Set(input.permissions ?? [])];
  const payload = {
    type: input.type,
    title,
    summary: cleanText(input.summary, MAX_SUMMARY_LENGTH) ?? null,
    body: cleanText(input.body, MAX_BODY_LENGTH) ?? null,
    authorId: input.authorId,
    authorDisplayName: cleanText(input.authorDisplayName, 80) ?? null,
    imageUrl: input.imageUrl ?? null,
    tags: [...new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12),
    species: cleanText(input.species ?? undefined, 80) ?? null,
    morph: cleanText(input.morph ?? undefined, 80) ?? null,
    board: input.board ?? null,
    visibility: "community" as const,
    permissions,
    moderationStatus: "pending" as const,
    engagement: { helpful: 0, likes: 0, comments: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(collection(db, "communityContent"), payload);
  return reference.id;
}
