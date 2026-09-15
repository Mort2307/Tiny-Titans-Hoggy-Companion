import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

type CreatorQaRun = { id: string; name?: string; status?: string; completedAt?: string; routes?: number; failures?: number; screenshots?: number; note?: string };

const getCreatorQaRunsCall = httpsCallable<Record<string, never>, { success: boolean; runs: CreatorQaRun[] }>(functions, "getCreatorQaRuns");

export async function getCreatorQaRuns(): Promise<CreatorQaRun[]> {
  const result = await getCreatorQaRunsCall({});
  return result.data.runs;
}
