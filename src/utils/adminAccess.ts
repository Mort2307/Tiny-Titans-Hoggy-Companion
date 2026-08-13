import type { User } from "firebase/auth";
import type { UserProfile } from "../context/AuthContext";

export type CreatorClaims = {
  admin?: boolean;
  creatorAdmin?: boolean;
  role?: string;
};

export function isCreatorAdmin(user: User | null, profile: UserProfile | null): boolean {
  return Boolean(user && profile?.role === "admin");
}

export function claimsGrantCreatorAccess(claims: CreatorClaims): boolean {
  return claims.creatorAdmin === true || claims.admin === true || claims.role === "admin";
}
