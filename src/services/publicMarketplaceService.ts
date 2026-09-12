import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type PublicMarketplaceSeller = {
  displayName: string;
  businessName: string;
  location: string;
  contactEmail: string;
};

export type PublicMarketplaceListing = {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  status: "active";
  isPromoted?: boolean;
  updatedAt?: unknown;
  seller: PublicMarketplaceSeller;
};

type PublicMarketplaceResponse = {
  success: boolean;
  listings: PublicMarketplaceListing[];
};

const functions = getFunctions(app, "europe-west2");

const getPublicListingsCall = httpsCallable<
  Record<string, never>,
  PublicMarketplaceResponse
>(functions, "getPublicMarketplaceListings");

export async function getPublicMarketplaceListings(): Promise<PublicMarketplaceResponse> {
  return (await getPublicListingsCall({})).data;
}
