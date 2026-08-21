import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityBoardKey, CommunityContent } from "../types/communityEcosystem";

function mapContent(id: string, data: Record<string, unknown>): CommunityContent {
  return { id, ...(data as Omit<CommunityContent, "id">) };
}

export async function getApprovedCommunityContent(maxItems = 30): Promise<CommunityContent[]> {
  const snapshot = await getDocs(query(collection(db, "communityContent"), where("moderationStatus", "==", "approved"), orderBy("createdAt", "desc"), limit(maxItems)));
  return snapshot.docs.map((item) => mapContent(item.id, item.data() as Record<string, unknown>));
}

export async function getApprovedBoardContent(board: CommunityBoardKey, maxItems = 30): Promise<CommunityContent[]> {
  const snapshot = await getDocs(query(collection(db, "communityContent"), where("moderationStatus", "==", "approved"), where("board", "==", board), orderBy("createdAt", "desc"), limit(maxItems)));
  return snapshot.docs.map((item) => mapContent(item.id, item.data() as Record<string, unknown>));
}

export async function getFeaturedCommunityContent(maxItems = 10): Promise<CommunityContent[]> {
  const snapshot = await getDocs(query(collection(db, "communityContent"), where("moderationStatus", "==", "approved"), where("permissions", "array-contains", "featured"), orderBy("createdAt", "desc"), limit(maxItems)));
  return snapshot.docs.map((item) => mapContent(item.id, item.data() as Record<string, unknown>));
}
