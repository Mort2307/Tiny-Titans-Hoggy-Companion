export type RescueAnimalStatus = "in_care" | "quarantine" | "under_observation" | "adopted" | "transferred" | "deceased";
export type RescueRole = "owner" | "manager" | "staff" | "medical" | "foster" | "viewer";
export type RescueTimelineType = "intake" | "feeding" | "weight" | "shed" | "husbandry" | "medical" | "behaviour" | "transfer" | "note";
export type RescueTimelineEvent = { id:string; type:RescueTimelineType; occurredAt:string; title:string; summary:string; details:string; recordedByUid:string; visibility:"public"|"staff"|"medical" };
export type RescueAnimal = { id:string; organisationId:string; publicPreview:boolean; name:string; speciesCommonName:string; scientificName:string; sex:string; morphOrColour:string; estimatedAge:string; status:RescueAnimalStatus; intakeDate:string; enclosure:string; publicSummary:string; husbandrySummary:string; privateNotes:string; timeline:RescueTimelineEvent[]; createdAt:string; updatedAt:string };
export type RescueOrganisation = { id:string; name:string; ownerUid:string; staffUids:string[]; medicalUids:string[]; fosterUids:string[]; viewerUids:string[]; speciesDiscovered:string[]; createdAt:string; updatedAt:string };
export type RescueAccess = { role:RescueRole|null; canViewFullHistory:boolean; canEdit:boolean; canManageOrganisation:boolean; isMember:boolean };
