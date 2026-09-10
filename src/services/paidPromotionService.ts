import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import { getPaidPromotion } from "../config/paidPromotions";

const functions = getFunctions(app, "europe-west2");
const claimPromotionCall = httpsCallable<{ promotionId: string }, { success: boolean; promotionId: string; tier: string; durationDays: number; expiresAt: number }>(functions, "claimPaidPromotion");

export async function claimPaidPromotion(promotionId: string) {
  const promotion = getPaidPromotion(promotionId);
  if (!promotion) throw new Error("Unknown promotion.");
  if (!promotion.enabled) throw new Error("This promotion is not currently available.");
  return (await claimPromotionCall({ promotionId })).data;
}
