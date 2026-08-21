import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MarketplaceListing, MarketplaceListingStatus } from "../types/communityMarketplace";

const listings = collection(db, "communityMarketplace");

export function validateMarketplaceListing(input: Partial<MarketplaceListing>): string[] {
  const errors: string[] = [];
  if (!input.title?.trim()) errors.push("A clear listing title is required.");
  if (!input.species?.trim()) errors.push("Species must be specified.");
  if (!input.description?.trim()) errors.push("A useful description is required.");
  if (!input.sellerId) errors.push("Seller identity is required.");
  if (!input.welfareDeclarationAccepted) errors.push("The welfare declaration must be accepted.");
  if (!input.termsVersion) errors.push("Marketplace terms must be acknowledged.");
  if (input.price != null && (!Number.isFinite(input.price) || input.price < 0)) errors.push("Price must be zero or a positive number.");
  if (input.quantity != null && (!Number.isInteger(input.quantity) || input.quantity < 1)) errors.push("Quantity must be a positive whole number.");
  return errors;
}

export async function createMarketplaceListing(input: MarketplaceListing): Promise<string> {
  const errors = validateMarketplaceListing(input);
  if (errors.length) throw new Error(errors.join(" "));
  const ref = await addDoc(listings, { ...input, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateMarketplaceListingStatus(listingId: string, status: MarketplaceListingStatus): Promise<void> {
  if (!listingId) throw new Error("A listing ID is required.");
  await updateDoc(doc(listings, listingId), { status, updatedAt: serverTimestamp() });
}
