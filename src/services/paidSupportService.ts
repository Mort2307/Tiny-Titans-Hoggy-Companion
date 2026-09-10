import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
const functions = getFunctions(app, "europe-west2");
const createCall = httpsCallable<{ subject: string; message: string }, { success: boolean; ticketId: string }>(functions, "createPrioritySupportTicket");
const listCall = httpsCallable<Record<string, never>, { success: boolean; tickets: Array<Record<string, unknown>> }>(functions, "getPrioritySupportTickets");
export async function createPrioritySupportTicket(subject: string, message: string) { return (await createCall({ subject, message })).data; }
export async function getPrioritySupportTickets() { return (await listCall({})).data; }
