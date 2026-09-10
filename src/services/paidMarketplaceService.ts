import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");
const getListingsCall = httpsCallable<Record<string, never>, { success: boolean; listings: Array<Record<string, unknown>> }>(functions, "getPaidMarketplaceListings");
const upsertListingCall = httpsCallable<{ payload: Record<string, unknown> }, { success: boolean; id: string }>(functions, "upsertPaidMarketplaceListing");
const removeListingCall = httpsCallable<{ id: string }, { success: boolean; id: string }>(functions, "removePaidMarketplaceListing");

export async function getPaidMarketplaceListings() { return (await getListingsCall({})).data; }
export async function upsertPaidMarketplaceListing(payload: Record<string, unknown>) { return (await upsertListingCall({ payload })).data; }
export async function removePaidMarketplaceListing(id: string) { return (await removeListingCall({ id })).data; }
