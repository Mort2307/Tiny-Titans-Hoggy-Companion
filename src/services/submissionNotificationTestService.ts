import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { NotificationTestTarget } from "./notificationService";

export type SubmissionNotificationTestKind =
  | "bug"
  | "feedback"
  | "morph-image"
  | "morph-terminology"
  | "behaviour"
  | "mentor"
  | "founder"
  | "community"
  | "feature";

export type SubmissionNotificationTestItem = {
  id: string;
  order: number;
  kind: SubmissionNotificationTestKind;
  label: string;
  description: string;
  status: "pending" | "sent" | "opened" | "accepted" | "failed";
  targetUid: string;
  targetName: string;
  targetEmail: string;
  eventKey?: string;
  sentCount?: number;
  failureCount?: number;
  failureMessage?: string;
  openedAt?: string;
  acceptedAt?: string;
};

export type SubmissionNotificationTestRun = {
  id: string;
  ownerUid: string;
  delayMinutes: number;
  status: "running" | "complete" | "incomplete";
  targetUid: string;
  targetName: string;
  targetEmail: string;
  selectedKinds: SubmissionNotificationTestKind[];
  createdAt?: unknown;
  completedAt?: unknown;
  itemCount: number;
  items: SubmissionNotificationTestItem[];
  summary?: { expected: number; sent: number; opened: number; accepted: number; passed: number; broken: number };
};

const functions = getFunctions(app, "europe-west2");

async function call<TInput, TOutput>(name: string, input: TInput): Promise<TOutput> {
  const callable = httpsCallable<TInput, TOutput>(functions, name);
  const result = await callable(input);
  return result.data;
}

export async function getSubmissionNotificationTestTargets(): Promise<NotificationTestTarget[]> {
  const response = await call<void, { users: NotificationTestTarget[] }>("getNotificationTestUsers", undefined);
  return response.users || [];
}

export function startSubmissionNotificationTest(options: { delayMinutes: number; targetUserId: string; selectedKinds: SubmissionNotificationTestKind[] }) {
  return call<typeof options, SubmissionNotificationTestRun>("startSubmissionNotificationTest", options);
}

export function sendNextSubmissionNotificationTest(runId: string) {
  return call<{ runId: string }, { runId: string; item: SubmissionNotificationTestItem }>("sendNextSubmissionNotificationTest", { runId });
}

export function markSubmissionNotificationTestOpened(runId: string, itemId: string) {
  return call<{ runId: string; itemId: string }, SubmissionNotificationTestRun>("markSubmissionNotificationTestOpened", { runId, itemId });
}

export function markSubmissionNotificationTestAccepted(runId: string, itemId: string) {
  return call<{ runId: string; itemId: string }, SubmissionNotificationTestRun>("markSubmissionNotificationTestAccepted", { runId, itemId });
}

export function finishSubmissionNotificationTest(runId: string) {
  return call<{ runId: string }, SubmissionNotificationTestRun>("finishSubmissionNotificationTest", { runId });
}

export function getSubmissionNotificationTestRun(runId: string) {
  return call<{ runId: string }, SubmissionNotificationTestRun>("getSubmissionNotificationTestRun", { runId });
}
