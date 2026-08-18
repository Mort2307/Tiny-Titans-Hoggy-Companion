import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type TesterMutationMode = "read-only" | "sandbox";

export type TesterSandboxContext = {
  enabled: boolean;
  sandboxId?: string;
  ownerUid: string;
};

export type TesterSandbox = TesterSandboxContext & {
  sandboxId: string;
  createdAt: string;
  expiresAt: string;
};

export function assertTesterMutationAllowed(
  mode: TesterMutationMode,
  context: TesterSandboxContext | undefined,
): asserts context is TesterSandboxContext {
  if (mode !== "sandbox") throw new Error("BOT mutation blocked: this test is not declared as sandbox-safe.");
  if (!context?.enabled || !context.sandboxId) throw new Error("BOT mutation blocked: an explicit isolated sandbox context is required.");
  if (!context.ownerUid) throw new Error("BOT mutation blocked: sandbox owner identity is missing.");
}

function createSandboxId(): string {
  return `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSandboxDocumentPath(sandboxId: string, ...segments: string[]): string {
  if (!sandboxId || /(^|[./])\.\.?($|[./])/.test(sandboxId) || sandboxId.includes("users/")) {
    throw new Error("Invalid sandbox identifier.");
  }
  return ["testerSandboxes", sandboxId, ...segments.filter(Boolean)].join("/");
}

export async function createTesterSandbox(ownerUid: string, ttlMinutes = 30): Promise<TesterSandbox> {
  if (!ownerUid) throw new Error("Cannot create a tester sandbox without an owner UID.");
  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0 || ttlMinutes > 120) throw new Error("Tester sandbox TTL must be between 1 and 120 minutes.");

  const sandboxId = createSandboxId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  await setDoc(doc(db, "testerSandboxes", sandboxId), {
    ownerUid,
    purpose: "bot-test",
    syntheticOnly: true,
    createdAt,
    expiresAt,
  });
  return { enabled: true, sandboxId, ownerUid, createdAt, expiresAt };
}

export async function verifyTesterSandbox(context: TesterSandboxContext): Promise<void> {
  assertTesterMutationAllowed("sandbox", context);
  const snapshot = await getDoc(doc(db, "testerSandboxes", context.sandboxId));
  if (!snapshot.exists()) throw new Error("Tester sandbox no longer exists.");
  const data = snapshot.data() as Record<string, unknown>;
  if (data.ownerUid !== context.ownerUid || data.syntheticOnly !== true) throw new Error("Tester sandbox identity or isolation marker is invalid.");
  if (typeof data.expiresAt !== "string" || Date.parse(data.expiresAt) <= Date.now()) throw new Error("Tester sandbox has expired.");
}

export async function writeSandboxDocument(context: TesterSandboxContext, segments: string[], data: Record<string, unknown>): Promise<void> {
  assertTesterMutationAllowed("sandbox", context);
  await verifyTesterSandbox(context);
  if (!segments.length) throw new Error("Sandbox document path is required.");
  await setDoc(doc(db, getSandboxDocumentPath(context.sandboxId, ...segments)), data);
}

export async function readSandboxDocument(context: TesterSandboxContext, segments: string[]): Promise<Record<string, unknown> | null> {
  assertTesterMutationAllowed("sandbox", context);
  await verifyTesterSandbox(context);
  const snapshot = await getDoc(doc(db, getSandboxDocumentPath(context.sandboxId, ...segments)));
  return snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null;
}

export async function deleteSandboxDocument(context: TesterSandboxContext, segments: string[]): Promise<void> {
  assertTesterMutationAllowed("sandbox", context);
  await verifyTesterSandbox(context);
  await deleteDoc(doc(db, getSandboxDocumentPath(context.sandboxId, ...segments)));
}

export async function destroyTesterSandbox(context: TesterSandboxContext): Promise<void> {
  assertTesterMutationAllowed("sandbox", context);
  const snapshot = await getDoc(doc(db, "testerSandboxes", context.sandboxId));
  if (!snapshot.exists()) return;
  const data = snapshot.data() as Record<string, unknown>;
  if (data.ownerUid !== context.ownerUid || data.syntheticOnly !== true) throw new Error("Refusing to destroy a sandbox owned by another identity.");
  await deleteDoc(doc(db, "testerSandboxes", context.sandboxId));
}
