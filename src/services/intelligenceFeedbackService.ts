import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebase/config";

export type IntelligenceFeedbackKind = "helpful" | "not-helpful" | "wrong" | "dismissed" | "acted-on";
export type IntelligenceFeedbackInput = { insightId: string; feedback: IntelligenceFeedbackKind; engineVersion?: string; domain?: string; animalId?: string; destination?: string; note?: string };

const functions = getFunctions(app, "europe-west2");
const recordFeedback = httpsCallable<IntelligenceFeedbackInput, { success: boolean }>(functions, "recordIntelligenceFeedback");

export async function submitIntelligenceFeedback(input: IntelligenceFeedbackInput) {
  const result = await recordFeedback(input);
  return result.data;
}
