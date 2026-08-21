import { collection, getDocs, limit, query, where, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MarketplaceFilters, MarketplaceListing } from "../types/communityMarketplace";

const listings = collection(db, "communityMarketplace");

function mapListing(id: string, data: DocumentData): MarketplaceListing { return { id, ...(data as Omit<MarketplaceListing, "id">), imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [] }; }

export async function getActiveMarketplaceListings(filters: MarketplaceFilters = {}, maxItems = 60): Promise<MarketplaceListing[]> {
  const constraints = [where("status", "==", "active")];
  if (filters.species) constraints.push(where("species", "==", filters.species));
  if (filters.sex) constraints.push(where("sex", "==", filters.sex));
  if (filters.listingType) constraints.push(where("listingType", "==", filters.listingType));
  if (filters.availability) constraints.push(where("availability", "==", filters.availability));
  const snapshot = await getDocs(query(listings, ...constraints, limit(maxItems)));
  return snapshot.docs.map((item) => mapListing(item.id, item.data())).filter((item) => {
    const price = item.price;
    if (filters.morph && !item.morph?.toLowerCase().includes(filters.morph.toLowerCase())) return false;
    if (filters.minPrice != null && (price == null || price < filters.minPrice)) return false;
    if (filters.maxPrice != null && (price == null || price > filters.maxPrice)) return false;
    return true;
  });
}
