import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { app, db } from "../firebase/config";
import { getFamilyForUser, type FamilyAccount } from "./familyService";
import type { FamilyAccessMode, FamilyPermissions } from "./familyPermissionsService";
import { defaultAdultPermissions, ownerPermissions } from "./familyPermissionsService";

const familyFunctions = getFunctions(app, "europe-west2");
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
