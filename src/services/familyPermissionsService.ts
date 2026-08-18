import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { getFamilyForUser } from "./familyService";

export type PermissionMode = "allow" | "deny" | "verify";
export type PermissionAction = "view" | "create" | "edit" | "delete";
export type PermissionArea = "snakes" | "weights" | "feeding" | "sheds" | "breeding" | "genetics";
export type FamilyPermissionKey = `${PermissionArea}.${PermissionAction}`;
export type FamilyPermissions = Record<FamilyPermissionKey, PermissionMode>;

const areas: PermissionArea[] = ["snakes", "weights", "feeding", "sheds", "breeding", "genetics"];
const actions: PermissionAction[] = ["view", "create", "edit", "delete"];

export const defaultChildPermissions: FamilyPermissions = Object.fromEntries(
  areas.flatMap((area) => actions.map((action) => {
    const key = `${area}.${action}` as FamilyPermissionKey;
    const mode: PermissionMode = action === "view" || (action === "create" && ["weights", "feeding", "sheds", "genetics"].includes(area)) ? "allow" : action === "delete" ? "deny" : "verify";
    return [key, mode];
  })),
) as FamilyPermissions;

export const defaultAdultPermissions: FamilyPermissions = Object.fromEntries(
  areas.flatMap((area) => actions.map((action) => [`${area}.${action}`, action === "delete" ? "verify" : "allow"])),
) as FamilyPermissions;

export const ownerPermissions: FamilyPermissions = Object.fromEntries(
  areas.flatMap((area) => actions.map((action) => [`${area}.${action}`, "allow"])),
) as FamilyPermissions;

export type FamilyApprovalStatus = "pending" | "approved" | "rejected";
export type FamilyApproval = {
  id: string;
  familyId: string;
  requesterUid: string;
  requesterName: string;
  area: PermissionArea;
  action: PermissionAction;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: FamilyApprovalStatus;
  createdAt?: unknown;
  decidedAt?: unknown;
  decidedByUid?: string;
};

function permissionRef(familyId: string, uid: string) { return doc(db, "families", familyId, "permissions", uid); }

export async function getMemberPermissions(uid: string): Promise<FamilyPermissions> {
  const family = await getFamilyForUser(uid);
  if (!family || family.ownerUid === uid) return ownerPermissions;
  const snapshot = await getDoc(permissionRef(family.id, uid));
  if (snapshot.exists()) return { ...defaultAdultPermissions, ...(snapshot.data().permissions as Partial<FamilyPermissions>) };
  const member = family.members.find((item) => item.uid === uid);
  return member?.role === "child" ? defaultChildPermissions : defaultAdultPermissions;
}

export async function setMemberPermission(ownerUid: string, memberUid: string, key: FamilyPermissionKey, mode: PermissionMode): Promise<void> {
  const family = await getFamilyForUser(ownerUid);
  if (!family || family.ownerUid !== ownerUid) throw new Error("Only the Family Owner can change family permissions.");
  if (memberUid === ownerUid) throw new Error("The Family Owner always has full access.");
  const current = await getMemberPermissions(memberUid);
  await setDoc(permissionRef(family.id, memberUid), { familyId: family.id, memberUid, permissions: { ...current, [key]: mode }, updatedAt: serverTimestamp() }, { merge: true });
}

export async function resetMemberPermissions(ownerUid: string, memberUid: string): Promise<void> {
  const family = await getFamilyForUser(ownerUid);
  if (!family || family.ownerUid !== ownerUid) throw new Error("Only the Family Owner can reset family permissions.");
  const member = family.members.find((item) => item.uid === memberUid);
  const permissions = member?.role === "child" ? defaultChildPermissions : defaultAdultPermissions;
  await setDoc(permissionRef(family.id, memberUid), { familyId: family.id, memberUid, permissions, updatedAt: serverTimestamp() }, { merge: true });
}

export async function submitFamilyApproval(input: Omit<FamilyApproval, "id" | "status" | "createdAt">): Promise<string> {
  const family = await getFamilyForUser(input.requesterUid);
  if (!family || !family.memberUids.includes(input.requesterUid)) throw new Error("You must belong to a Tiny Titans family to request approval.");
  const result = await addDoc(collection(db, "familyApprovals"), { ...input, familyId: family.id, status: "pending", createdAt: serverTimestamp() });
  return result.id;
}

export async function getFamilyApprovals(uid: string): Promise<FamilyApproval[]> {
  const family = await getFamilyForUser(uid);
  if (!family) return [];
  const snapshot = await getDocs(query(collection(db, "familyApprovals"), where("familyId", "==", family.id)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<FamilyApproval, "id">) }));
}

export async function decideFamilyApproval(ownerUid: string, approvalId: string, status: Exclude<FamilyApprovalStatus, "pending">): Promise<void> {
  const family = await getFamilyForUser(ownerUid);
  if (!family || family.ownerUid !== ownerUid) throw new Error("Only the Family Owner can approve family changes.");
  await updateDoc(doc(db, "familyApprovals", approvalId), { status, decidedByUid: ownerUid, decidedAt: serverTimestamp() });
}

export function permissionLabel(mode: PermissionMode): string { return mode === "allow" ? "Allow" : mode === "deny" ? "Deny" : "Verify"; }
export const permissionAreas: Array<{ id: PermissionArea; label: string; icon: string }> = [
  { id: "snakes", label: "Snake Records", icon: "🐍" }, { id: "weights", label: "Weight Tracker", icon: "⚖️" }, { id: "feeding", label: "Feeding", icon: "🍽️" },
  { id: "sheds", label: "Shed Tracker", icon: "🐍" }, { id: "breeding", label: "Breeding", icon: "🧬" }, { id: "genetics", label: "Genetics", icon: "🧪" },
];
export const permissionActions: Array<{ id: PermissionAction; label: string }> = [
  { id: "view", label: "View" }, { id: "create", label: "Create" }, { id: "edit", label: "Edit" }, { id: "delete", label: "Delete" },
];
