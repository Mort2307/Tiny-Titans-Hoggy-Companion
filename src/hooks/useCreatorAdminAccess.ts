import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { claimsGrantCreatorAccess, type CreatorClaims } from "../utils/adminAccess";

export function useCreatorAdminAccess(user: User | null) {
  const [loading, setLoading] = useState(Boolean(user));
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      if (!user) { if (active) { setAllowed(false); setLoading(false); } return; }
      setLoading(true);
      try {
        const token = await user.getIdTokenResult(true);
        const claims = token.claims as CreatorClaims;
        if (active) setAllowed(claimsGrantCreatorAccess(claims));
      } catch {
        if (active) setAllowed(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    void check();
    return () => { active = false; };
  }, [user]);

  return { loading, allowed };
}
