import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { app } from "../firebase/config";
import { getFamilyForUser, type FamilyAccount } from "./familyService";
import type { FamilyAccessMode, FamilyPermissions } from "./familyPermissionsService";
import { defaultAdultPermissions, ownerPermissions } from "./familyPermissionsService";

const familyFunctions = getFunctions(app, "europe-west2");

export async function getFamilyManagerData(uid: string): Promise<{ family: FamilyAccount | null; modes: Record<string, FamilyAccessMode> }> {
  const family = await getFamilyForUser(uid);
  if (!family || family.ownerUid !== uid) return { family, modes: {} };
  const callable = httpsCallable<void, { modes: Record<string, FamilyAccessMode> }>(familyFunctions, "getFamilyManagerDataSecure");
  try {
    const result = await callable();
    return { family, modes: result.data.modes ?? {} };
  } catch {
    return { family, modes: {} };
  }
}

export async function setFamilyMemberAccessMode(ownerUid: string, memberUid: string, mode: FamilyAccessMode): Promise<void> {
  const family = await getFamilyForUser(ownerUid);
  if (!family || family.ownerUid !== ownerUid) throw new Error("Only the Family Head can change family permissions.");
  if (memberUid === ownerUid) throw new Error("The Family Head always has Full Permission.");
  if (!family.memberUids.includes(memberUid)) throw new Error("That account is not a member of your family.");
  const callable = httpsCallable<{ memberUid: string; mode: FamilyAccessMode }, { success: boolean }>(familyFunctions, "setFamilyMemberAccessModeSecure");
  await callable({ memberUid, mode });
}

export function effectiveModePermissions(mode: FamilyAccessMode): FamilyPermissions {
  if (mode === "full") return ownerPermissions;
  const permissions = { ...defaultAdultPermissions } as FamilyPermissions;
  for (const key of Object.keys(permissions) as Array<keyof FamilyPermissions>) permissions[key] = key.endsWith(".view") ? "allow" : mode === "review" ? "verify" : "deny";
  return permissions;
}
