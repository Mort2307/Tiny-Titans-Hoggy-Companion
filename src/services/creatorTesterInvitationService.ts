import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type CreatorTesterInvitation = {
  id: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  targetUid: string;
  targetEmail: string;
  invitedByUid: string;
  invitedAt?: unknown;
  acceptedAt?: unknown;
  declinedAt?: unknown;
  expiresAt?: unknown;
};

type InvitationResponse = { success: boolean; invitation: CreatorTesterInvitation | null };
type AcceptResponse = { success: boolean; creatorTester: boolean };

const functions = getFunctions(app, "europe-west2");
const getInvitation = httpsCallable<void, InvitationResponse>(functions, "getCreatorTesterInvitation");
const acceptInvitation = httpsCallable<void, AcceptResponse>(functions, "acceptCreatorTesterInvitation");
const declineInvitation = httpsCallable<void, { success: boolean }>(functions, "declineCreatorTesterInvitation");

export async function getCreatorTesterInvitation(): Promise<CreatorTesterInvitation | null> {
  const result = await getInvitation();
  return result.data.invitation;
}

export async function acceptCreatorTesterInvitation(): Promise<void> {
  await acceptInvitation();
  const user = getAuth(app).currentUser;
  if (user) await user.getIdToken(true);
}

export async function declineCreatorTesterInvitation(): Promise<void> {
  await declineInvitation();
}
