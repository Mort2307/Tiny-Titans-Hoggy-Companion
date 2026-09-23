import type { FamilyMember } from "../services/familyService";

export function familyMemberLabel(member: FamilyMember): string {
  return member.role === "child" ? "Child" : member.role === "adult" ? "Adult member" : "Family Head";
}
