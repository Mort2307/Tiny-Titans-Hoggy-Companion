import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type RescueDirectoryEntry = { id:string; name:string; accountStatus:string; locationLabel:string; postcode:string; region:string; country:string; openingHours:string; website:string; contactEmail:string; description:string; logoUrl:string; heroImageUrl:string; speciesDiscovered:string[]; pilot:boolean; charityNumber:string; companyNumber:string; localAuthorityLicence:string; otherRegistrationNumber:string; registrationAuthority:string; registrationsPublic:boolean };
const functions = getFunctions(app, "europe-west2");
const listDirectoryCall = httpsCallable<{ query?: string }, { success:boolean; organisations:RescueDirectoryEntry[]; count:number }>(functions, "listRescueDirectory");
const updateDirectoryCall = httpsCallable<Record<string, unknown>, { success:boolean }>(functions, "updateRescueDirectoryProfile");
export async function listRescueDirectory(query = ""): Promise<RescueDirectoryEntry[]> { const response = await listDirectoryCall({ query:query.trim() }); return Array.isArray(response.data.organisations) ? response.data.organisations : []; }
export async function updateRescueDirectoryProfile(input:{ name?:string; locationLabel:string; postcode?:string; region?:string; country?:string; website?:string; contactEmail?:string; openingHours?:string; description?:string; logoUrl?:string; heroImageUrl?:string; directoryVisible?:boolean; charityNumber?:string; companyNumber?:string; localAuthorityLicence?:string; otherRegistrationNumber?:string; registrationAuthority?:string; registrationNotes?:string; registrationEvidenceUrl?:string; registrationsPublic?:boolean }) { return (await updateDirectoryCall(input)).data; }
