export type RescueSetupForm = {
  name: string; logoUrl: string; heroImageUrl: string; directoryDescription: string;
  website: string; contactEmail: string; phone: string; locationLabel: string;
  postcode: string; region: string; country: string; openingHours: string;
  charityNumber: string; companyNumber: string; localAuthorityLicence: string;
  otherRegistrationNumber: string; registrationAuthority: string;
  registrationsPublic: boolean; directoryVisible: boolean;
};

export const EMPTY_RESCUE_SETUP: RescueSetupForm = {
  name: "", logoUrl: "", heroImageUrl: "", directoryDescription: "", website: "",
  contactEmail: "", phone: "", locationLabel: "", postcode: "", region: "",
  country: "", openingHours: "", charityNumber: "", companyNumber: "",
  localAuthorityLicence: "", otherRegistrationNumber: "", registrationAuthority: "",
  registrationsPublic: false, directoryVisible: true,
};

export function normaliseRescueSetup(
  value: Partial<RescueSetupForm> | null | undefined,
): RescueSetupForm {
  return {
    name: String(value?.name || ""), logoUrl: String(value?.logoUrl || ""),
    heroImageUrl: String(value?.heroImageUrl || ""), directoryDescription: String(value?.directoryDescription || ""),
    website: String(value?.website || ""), contactEmail: String(value?.contactEmail || ""),
    phone: String(value?.phone || ""), locationLabel: String(value?.locationLabel || ""),
    postcode: String(value?.postcode || ""), region: String(value?.region || ""),
    country: String(value?.country || ""), openingHours: String(value?.openingHours || ""),
    charityNumber: String(value?.charityNumber || ""), companyNumber: String(value?.companyNumber || ""),
    localAuthorityLicence: String(value?.localAuthorityLicence || ""),
    otherRegistrationNumber: String(value?.otherRegistrationNumber || ""),
    registrationAuthority: String(value?.registrationAuthority || ""),
    registrationsPublic: value?.registrationsPublic === true,
    directoryVisible: value?.directoryVisible !== false,
  };
}
