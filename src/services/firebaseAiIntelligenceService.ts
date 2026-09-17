import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app } from "../firebase/config";

const DEFAULT_MODEL = "gemini-3.8-flash";

function getModel() {
  const firebaseAI = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(firebaseAI, {
    model: String(import.meta.env.VITE_TT_GEMINI_MODEL || DEFAULT_MODEL),
    systemInstruction: `You are the Tiny Titans Intelligence Explainer. You are an explanation layer over deterministic, evidence-aware reptile intelligence. Never invent records, species facts, diagnoses, causal relationships, credentials or certainty. Do not turn correlation into causation. Do not provide veterinary diagnosis or replace a qualified reptile veterinarian. Explain only the supplied evidence and clearly identify missing information. Treat private rescue, medical and personal records as confidential input and never request unnecessary personal information.`,
  });
}

export async function explainTinyTitansIntelligence(params: {
  title: string;
  evidence: string[];
  question?: string;
  boundary?: string;
}): Promise<string> {
  const evidence = params.evidence.filter(Boolean).slice(0, 24).join("\n");
  if (!evidence) throw new Error("There is not enough recorded evidence to ask Gemini for an explanation yet.");
  const prompt = [
    `Topic: ${params.title}`,
    params.question ? `Question: ${params.question}` : "Request: Explain the recorded pattern in plain, careful language.",
    `Evidence:\n${evidence}`,
    params.boundary || "Only describe what the supplied evidence supports; state uncertainty and missing records explicitly.",
  ].join("\n\n");
  try {
    const result = await getModel().generateContent(prompt);
    const text = result.response.text().trim();
    if (!text) throw new Error("Gemini returned an empty explanation.");
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firebase AI Logic could not generate an explanation.";
    if (/app.?check|permission|403|unauthenticated|not.?configured|firebasevertexai/i.test(message)) {
      throw new Error("Tiny Titans AI is not configured for this app yet. Enable Firebase AI Logic and App Check for the Firebase project, then try again.", { cause: error });
    }
    throw new Error(message, { cause: error });
  }
}

export const TINY_TITANS_GEMINI_MODEL = DEFAULT_MODEL;
