import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type CreatorPromoCode = {
  id: string;
  code: string;
  active: boolean;
  percentOff: number;
  maxRedemptions?: number | null;
  timesRedeemed: number;
  expiresAt?: number | null;
  product: string;
  productId: string;
  createdAt: number;
};

const functions = getFunctions(app, "europe-west2");
const listCall = httpsCallable<Record<string, never>, { success: boolean; promotionCodes: CreatorPromoCode[] }>(functions, "listCreatorPromoCodes");
const createCall = httpsCallable<{ code?: string; percentOff: number; maxRedemptions?: number | null; expiresAt?: string | null }, { success: boolean; promotionCode: CreatorPromoCode }>(functions, "createCreatorPromoCode");
const deactivateCall = httpsCallable<{ promotionCodeId: string }, { success: boolean; promotionCode: CreatorPromoCode }>(functions, "deactivateCreatorPromoCode");

export async function listCreatorPromoCodes() { return (await listCall({})).data.promotionCodes; }
export async function createCreatorPromoCode(input: { code?: string; percentOff: number; maxRedemptions?: number | null; expiresAt?: string | null }) { return (await createCall(input)).data.promotionCode; }
export async function deactivateCreatorPromoCode(promotionCodeId: string) { return (await deactivateCall({ promotionCodeId })).data.promotionCode; }
