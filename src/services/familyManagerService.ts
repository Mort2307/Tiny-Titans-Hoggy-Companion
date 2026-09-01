import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "../firebase/config";
import { getFamilyForUser, type FamilyAccount } from "./familyService";
import type { FamilyAccessMode, FamilyPermissions } from "./familyPermissionsService";
import { defaultAdultPermissions, ownerPermissions } from "./familyPermissionsService";

const permissionRef = (familyId: string, uid: string) => doc(db, "families", familyId, "permissions", uid);

function inferredMode(data: Record<string, unknown> | null): FamilyAccessMode {
  const explicit = data?.accessMode;
  if (explicit === "full" || explicit === "review" || explicit === "sandbox") return explicit;
  const permissions = (data?.permissions ?? {}) as Record<string, unknown>;
  const keys = ["snakes", "weights", "feeding", "sheds", "behaviour", "health", "breeding", "genetics"].flatMap((area) => ["create", "edit", "delete"].map((action) => `${area}.${action}`));
  if (keys.every((key) => permissions[key] === "allow")) return "full";
  if (keys.every((key) => permissions[key] === "deny")) return "sandbox";
  return "review";
}

export async function getFamilyManagerData(uid: string): Promise<{ family: FamilyAccount | null; modes: Record<string, FamilyAccessMode> }> {
  const family = await getFamilyForUser(uid);
  if (!family || family.ownerUid !== uid) return { family, modes: {} };
  const modes: Record<string, FamilyAccessMode> = {};
  for (const member of family.members.filter((item) => item.uid !== uid)) {
    const snapshot = await getDoc(permissionRef(family.id, member.uid));
    modes[member.uid] = inferredMode(snapshot.exists() ? snapshot.data() : null);
  }
  return { family, modes };
}

export async function setFamilyMemberAccessMode(ownerUid: string, memberUid: string, mode: FamilyAccessMode): Promise<void> {
  const callable = httpsCallable<{ memberUid: string; mode: FamilyAccessMode }, { success: boolean }>(functions(), "setFamilyMemberAccessModeSecure");
  await callable({ memberUid, mode });
}

export function effectiveModePermissions(mode: FamilyAccessMode): FamilyPermissions {
  if (mode === "full") return ownerPermissions;
  const permissions = { ...defaultAdultPermissions } as FamilyPermissions;
  for (const key of Object.keys(permissions) as Array<keyof FamilyPermissions>) permissions[key] = key.endsWith(".view") ? "allow" : mode === "review" ? "verify" : "deny";
  return permissions;
}
