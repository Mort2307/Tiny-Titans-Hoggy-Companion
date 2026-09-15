export type PartnerLandingKind = "business" | "rescue";

export type PartnerOpeningHours = {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
};

export type PartnerBusinessDetails = {
  registrationNumber?: string;
  rescueLicenseNumber?: string;
  charityNumber?: string;
  vatNumber?: string;
  insuranceNumber?: string;
  CITESRegistrationNumber?: string;
  responsiblePerson?: string;
};

export type PartnerContactDetails = {
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  townCity?: string;
  countyState?: string;
  postcode?: string;
  country?: string;
};

export type PartnerSocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
};

export type PartnerLandingProfile = {
  id: string;
  ownerUid: string;
  organisationId?: string;
  kind: PartnerLandingKind;
  slug: string;
  publicEnabled: boolean;
  brandName: string;
  logoUrl?: string;
  heroImageUrl?: string;
  tagline: string;
  description: string;
  accentColor: string;
  openingHours: PartnerOpeningHours;
  businessDetails: PartnerBusinessDetails;
  contact: PartnerContactDetails;
  social: PartnerSocialLinks;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  showTinyTitansBadge: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};
