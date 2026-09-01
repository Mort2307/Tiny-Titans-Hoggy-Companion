import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { app } from "../firebase/config";
import type { FamilyAccessMode, FamilyPermissions } from "./familyPermissionsService";
import type { FamilyAccount } from "./familyService";
import { defaultAdultPermissions, ownerPermissions } from "./familyPermissionsService";

const familyFunctions = getFunctions(app, "europe-west2");

function inferredMode(data: Record<string, unknown> | null): FamilyAccessMode {
  const explicit = data?.accessMode;
  if (explicit === "full" || explicit === "review" || explicit === "sandbox") return explicit;
  const permissions = (data?.permissions ?? {}) as Record<string, unknown>;
  const keys = ["snakes", "weights", "feeding", "sheds", "behaviour", "health", "breeding", "genetics"].flatMap((area) => ["create", "edit", "delete"].map((action) => `${area}.${action}`));
  if (keys.every((key) => permissions[key] === "allow")) return "full";
  if (keys.every((key) => permissions[key] === "deny")) return "sandbox";
  return "review";
}

type ManagerResponse = {
  family: FamilyAccount | null;
  modes: Record<string, FamilyAccessMode>;
};

export async function getFamilyManagerData(_uid: string): Promise<ManagerResponse> {
  const callable = httpsCallable<void, ManagerResponse>(familyFunctions, "getFamilyManagerDataSecure");
  return (await callable()).data;
}

export async function setFamilyMemberAccessMode(ownerUid: string, memberUid: string, mode: FamilyAccessMode): Promise<void> {
  if (!ownerUid) throw new Error("Family Head account is required.");
  const callable = httpsCallable<{ memberUid: string; mode: FamilyAccessMode }, { success: boolean }>(familyFunctions, "setFamilyMemberAccessModeSecure");
  await callable({ memberUid, mode });
}

export function effectiveModePermissions(mode: FamilyAccessMode): FamilyPermissions {
  if (mode === "full") return ownerPermissions;
  const permissions = { ...defaultAdultPermissions } as FamilyPermissions;
  for (const key of Object.keys(permissions) as Array<keyof FamilyPermissions>) permissions[key] = key.endsWith(".view") ? "allow" : mode === "review" ? "verify" : "deny";
  return permissions;
}
