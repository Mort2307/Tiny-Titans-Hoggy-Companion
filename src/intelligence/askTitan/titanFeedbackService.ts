import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../firebase/config";
import type { TitanWorkspaceKind } from "./titanChatContracts";

const functions = getFunctions(app, "europe-west2");

type TitanFeedbackResponse = { success: boolean; rating: "helpful" | "not_helpful" };

export async function recordTitanFeedback(responseId: string, rating: "helpful" | "not_helpful", workspaceKind: TitanWorkspaceKind): Promise<TitanFeedbackResponse> {
  const call = httpsCallable<{ responseId: string; rating: "helpful" | "not_helpful"; workspaceKind: TitanWorkspaceKind }, TitanFeedbackResponse>(functions, "recordTitanFeedback");
  return (await call({ responseId, rating, workspaceKind })).data;
}