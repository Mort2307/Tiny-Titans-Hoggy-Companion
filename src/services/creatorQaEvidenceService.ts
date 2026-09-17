import { getBytes, ref } from "firebase/storage";
import { storage } from "../firebase/config";
import { getCreatorQaRuns } from "./creatorOperationsService";

export type QaViewport = { name: string; width: number; height: number };
export type QaFinding = { severity: "error" | "warning" | "info"; code: string; message: string };
export type QaVisualResult = {
  route: string;
  viewport: QaViewport;
  responseStatus?: number | null;
  requestedRoute?: string;
  finalUrl?: string;
  metrics?: Record<string, unknown>;
  findings?: QaFinding[];
  runtimeErrors?: string[];
  consoleErrors?: string[];
  requestFailures?: string[];
  viewportScreenshot?: string;
  fullPageScreenshot?: string;
};
export type QaReport = {
  bot: string;
  generatedAt: string;
  baseURL?: string;
  routes: string[];
  viewports: QaViewport[];
  screenshotCount: number;
  videoCount?: number;
  results: QaVisualResult[];
  purpose?: string;
};

export type CreatorQaRun = Awaited<ReturnType<typeof getCreatorQaRuns>>[number] & {
  storagePrefix?: string;
  reportPath?: string;
  qaEvidenceAvailable?: boolean;
  github?: {
    repository?: string;
    branch?: string;
    path?: string;
    url?: string | null;
    actionsUrl?: string | null;
  } | null;
};

export async function getQaRunHistory(): Promise<CreatorQaRun[]> {
  return (await getCreatorQaRuns()) as CreatorQaRun[];
}

export async function getQaRunReport(run: CreatorQaRun): Promise<QaReport> {
  if (!run.reportPath) throw new Error("This QA run has no published visual report.");
  const bytes = await getBytes(ref(storage, run.reportPath));
  return JSON.parse(new TextDecoder().decode(bytes)) as QaReport;
}

function imageMimeType(relativePath: string): string {
  const extension = relativePath.toLowerCase().split(".").pop();
  return extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "webp" ? "image/webp" : "image/png";
}

export async function getQaEvidenceBlobUrl(run: CreatorQaRun, relativePath: string): Promise<string> {
  if (!run.storagePrefix || !relativePath) throw new Error("This QA run does not expose a usable evidence path.");
  const objectPath = `${run.storagePrefix.replace(/\/+$/, "")}/${relativePath.replace(/^\/+/, "")}`;
  const bytes = await getBytes(ref(storage, objectPath));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return URL.createObjectURL(new Blob([copy.buffer], { type: imageMimeType(relativePath) }));
}
