export type MarketplaceListingStatus = "draft" | "pending" | "active" | "reserved" | "sold" | "withdrawn";
export type MarketplaceListingType = "hatchling" | "juvenile" | "adult" | "proven" | "clutch" | "equipment";
export type MarketplaceContactMode = "community-message" | "external-contact";
export type MarketplaceAvailability = "available" | "coming-soon" | "reserved" | "sold";

export type MarketplaceListing = {
  id: string;
  sellerId: string;
  sellerDisplayName: string;
  listingType: MarketplaceListingType;
  status: MarketplaceListingStatus;
  title: string;
  species: string;
  morph?: string;
  sex?: "male" | "female" | "unknown";
  birthDate?: string;
  weightGrams?: number;
  price?: number;
  currency?: string;
  quantity?: number;
  availableFrom?: string;
  availability?: MarketplaceAvailability;
  description: string;
  imageUrls: string[];
  geneticsDisclosure?: string;
  provenanceDisclosure?: string;
  contactMode: MarketplaceContactMode;
  welfareDeclarationAccepted: boolean;
  termsVersion: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type MarketplaceFilters = {
  species?: string;
  morph?: string;
  sex?: MarketplaceListing["sex"];
  listingType?: MarketplaceListingType;
  availability?: MarketplaceAvailability;
  minPrice?: number;
  maxPrice?: number;
};
