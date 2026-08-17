import { useContext } from "react";
import { AuthContext } from "./AuthContextValue";

<<<<<<< HEAD
export type {
  ExperienceLevel,
  UserCategory,
} from "./AuthContextValue";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

=======
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
>>>>>>> origin/master
  return context;
}
