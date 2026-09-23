import type { FamilyAccessMode } from "../services/familyPermissionsService";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";

export const FAMILY_PERMISSION_MODES: Array<{ id: FamilyAccessMode; title: string; icon: TinyTitansIconName; summary: string; detail: string }> = [
  { id: "full", title: "Full Permission", icon: "check", summary: "Full editing abilities", detail: "Changes to shared records are applied immediately. Give this only to someone you trust to maintain real keeper records." },
  { id: "review", title: "Moderate Permissions", icon: "health", summary: "Every edit is reviewed", detail: "The member can propose changes, but nothing changes for real until the Family Head approves it." },
  { id: "sandbox", title: "No Permission / Sandbox Mode", icon: "testing", summary: "No real editing", detail: "Real family records cannot be edited. Use the Family Sandbox for learning and hypothetical changes." },
];
