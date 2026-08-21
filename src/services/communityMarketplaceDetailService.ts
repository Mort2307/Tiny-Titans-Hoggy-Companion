import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MarketplaceListing } from "../types/communityMarketplace";

export async function getActiveMarketplaceListing(id: string): Promise<MarketplaceListing | null> {
  if (!id) return null;
  const snapshot = await getDoc(doc(db, "communityMarketplace", id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.status !== "active") return null;
  return { id: snapshot.id, ...(data as Omit<MarketplaceListing, "id">), imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [] };
}
