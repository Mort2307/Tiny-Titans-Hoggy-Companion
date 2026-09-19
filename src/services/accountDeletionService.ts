import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");
const deleteMyAccountCall = httpsCallable<Record<string, never>, { success: boolean; deleted: boolean }>(functions, "deleteMyAccount");
const requestAccountDeletionCall = httpsCallable<{ email: string }, { success: boolean; message: string }>(functions, "requestAccountDeletion");

export async function deleteMyAccount(): Promise<void> {
  await deleteMyAccountCall({});
}

export async function requestAccountDeletion(email: string): Promise<string> {
  const normalised = email.trim().toLowerCase();
  if (!normalised || !normalised.includes("@")) {
    throw new Error("Enter the email address used for your Tiny Titans account.");
  }
  const response = await requestAccountDeletionCall({ email: normalised });
  return response.data.message;
}
