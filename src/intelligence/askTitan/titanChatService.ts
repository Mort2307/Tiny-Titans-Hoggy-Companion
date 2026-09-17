import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../firebase/config";
import type { TitanAskRequest, TitanAskResponse } from "./titanChatContracts";

const functions = getFunctions(app, "europe-west2");
const askTitanCall = httpsCallable<TitanAskRequest, TitanAskResponse>(functions, "askTitan");

export async function askTitan(request: TitanAskRequest): Promise<TitanAskResponse> {
  const question = request.question.trim();
  if (!question) throw new Error("Enter a question for Titan Intelligence.");
  return (await askTitanCall({ ...request, question })).data;
}
