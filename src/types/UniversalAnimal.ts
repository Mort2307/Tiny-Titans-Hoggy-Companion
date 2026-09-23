export type UniversalAnimalStatus = "active" | "quarantine" | "rehoming" | "sold" | "deceased" | "archived";

export type UniversalAnimalRecord = {
  id: string;
  ownerUid: string;
  name: string;
  speciesId?: string;
  speciesCommonName?: string;
  scientificName?: string;
  animalGroup?: string;
  sex: "male" | "female" | "unknown" | "not-applicable";
  status: UniversalAnimalStatus;
  morphOrColour?: string;
  origin?: string;
  breederOrSource?: string;
  acquisitionDate?: string;
  hatchOrBirthDate?: string;
  identifier?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
