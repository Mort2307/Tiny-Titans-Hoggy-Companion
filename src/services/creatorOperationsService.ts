import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

type CreatorQaRun = {
  id: string;
  name?: string;
  status?: string;
  generatedAt?: string;
  completedAt?: string;
  commit?: string;
  routes?: number;
  viewports?: Array<{ name: string; width: number; height: number }>;
  screenshots?: number;
  videos?: number;
  failures?: number;
  errors?: number;
  warnings?: number;
  note?: string;
  storagePrefix?: string;
  reportPath?: string;
  qaEvidenceAvailable?: boolean;
  routeSource?: string;
  github?: {
    repository?: string;
    branch?: string;
    path?: string;
    url?: string | null;
    actionsUrl?: string | null;
  } | null;
};

const getCreatorQaRunsCall = httpsCallable<Record<string, never>, { success: boolean; runs: CreatorQaRun[] }>(functions, "getCreatorQaRuns");
const triggerCreatorVisualQaCall = httpsCallable<{ routes?: string; note?: string }, { success: boolean; status: string; workflow: string; actionsUrl: string }>(functions, "triggerCreatorVisualQa");

export async function getCreatorQaRuns(): Promise<CreatorQaRun[]> {
  const result = await getCreatorQaRunsCall({});
  return result.data.runs;
}

export async function triggerCreatorVisualQa(routes = "", note = ""): Promise<{ status: string; workflow: string; actionsUrl: string }> {
  const result = await triggerCreatorVisualQaCall({ routes, note });
  return result.data;
}
