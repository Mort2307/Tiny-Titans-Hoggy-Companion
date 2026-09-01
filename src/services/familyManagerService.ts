import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { getFamilyForUser, type FamilyAccount } from "./familyService";
import type { FamilyAccessMode, FamilyPermissions } from "./familyPermissionsService";
import { defaultAdultPermissions, defaultChildPermissions, ownerPermissions } from "./familyPermissionsService";

const permissionRef = (familyId: string, uid: string) => doc(db, "families", familyId, "permissions", uid);

function permissionsForMode(mode: FamilyAccessMode): FamilyPermissions {
  if (mode === "full") return ownerPermissions;
  const permissions = {} as FamilyPermissions;
  const areas = ["snakes", "weights", "feeding", "sheds", "behaviour", "health", "breeding", "genetics"] as const;
  const actions = ["view", "create", "edit", "delete"] as const;
  for (const area of areas) for (const action of actions) {
    permissions[`${area}.${action}`] = action === "view" ? "allow" : mode === "review" ? "verify" : "deny";
  }
  return permissions;
}

function inferredMode(data: Record<string, unknown> | null, memberRole: string | undefined): FamilyAccessMode {
  const explicit = data?.accessMode;
  if (explicit === "full" || explicit === "review" || explicit === "sandbox") return explicit;
  const permissions = (data?.permissions ?? {}) as Record<string, unknown>;
  const keys = ["snakes", "weights", "feeding", "sheds", "behaviour", "health", "breeding", "genetics"].flatMap((area) => ["create", "edit", "delete"].map((action) => `${area}.${action}`));
  if (keys.every((key) => permissions[key] === "allow")) return "full";
  if (keys.every((key) => permissions[key] === "deny")) return "sandbox";
  return memberRole === "child" ? "review" : "review";
}

export async function getFamilyManagerData(uid: string): Promise<{ family: FamilyAccount | null; modes: Record<string, FamilyAccessMode> }> {
  const family = await getFamilyForUser(uid);
  if (!family || family.ownerUid !== uid) return { family, modes: {} };
  const modes: Record<string, FamilyAccessMode> = {};
  for (const member of family.members.filter((item) => item.uid !== uid)) {
    const snapshot = await getDoc(permissionRef(family.id, member.uid));
    modes[member.uid] = inferredMode(snapshot.exists() ? snapshot.data() : null, member.role);
  }
  return { family, modes };
}

export async function setFamilyMemberAccessMode(ownerUid: string, memberUid: string, mode: FamilyAccessMode): Promise<void> {
  const family = await getFamilyForUser(ownerUid);
  if (!family || family.ownerUid !== ownerUid) throw new Error("Only the Family Head can change family permissions.");
  if (memberUid === ownerUid) throw new Error("The Family Head always has Full Permission.");
  if (!family.memberUids.includes(memberUid)) throw new Error("That account is not a member of your family.");
  await setDoc(permissionRef(family.id, memberUid), {
    familyId: family.id,
    memberUid,
    accessMode: mode,
    permissions: permissionsForMode(mode),
    updatedAt: serverTimestamp(),
    updatedByUid: ownerUid,
  }, { merge: true });
  await addDoc(collection(db, "familyHistory"), {
    familyId: family.id,
    actorUid: ownerUid,
    targetUid: memberUid,
    eventType: "permission_mode_changed",
    summary: `Permission mode changed to ${mode}.`,
    details: { mode },
    createdAt: serverTimestamp(),
  });
}

export function effectiveModePermissions(mode: FamilyAccessMode): FamilyPermissions {
  if (mode === "full") return ownerPermissions;
  if (mode === "sandbox") return { ...defaultAdultPermissions, ...permissionsForMode("sandbox") };
  return { ...defaultAdultPermissions, ...permissionsForMode("review") };
}
