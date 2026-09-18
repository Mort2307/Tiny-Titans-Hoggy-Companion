import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

export type SelfNotificationTestKind = "general" | "feed" | "weight" | "shed" | "health";

export type SelfNotificationTestResult = {
  eventKey: string;
  kind: SelfNotificationTestKind;
  status: "sent" | "no-delivery";
  sentCount: number;
  invalidTokenCount: number;
};

const sendOwnTestCall = httpsCallable<
  { kind: SelfNotificationTestKind },
  SelfNotificationTestResult
>(functions, "sendOwnNotificationTest");

export async function sendOwnNotificationTest(
  kind: SelfNotificationTestKind = "general",
): Promise<SelfNotificationTestResult> {
  return (await sendOwnTestCall({ kind })).data;
}
