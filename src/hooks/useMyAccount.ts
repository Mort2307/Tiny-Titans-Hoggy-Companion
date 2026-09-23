import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../context/useAuth";
import { getPrivacyPreferences } from "../services/privacyService";
import app from "../firebase/config";
import type { PrivacyPreferences } from "../types/privacy";

export function useMyAccount() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [livePrivacy, setLivePrivacy] = useState<PrivacyPreferences | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLivePrivacy(null);
      return () => { active = false; };
    }
    setLivePrivacy(null);
    void getPrivacyPreferences(user.uid)
      .then((value) => { if (active) setLivePrivacy(value); })
      .catch(() => { if (active) setLivePrivacy(null); });
    return () => { active = false; };
  }, [user]);

  async function logout() {
    if (!user) return;
    try {
      await signOut(getAuth(app));
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Tiny Titans: logout failed", error);
    }
  }

  return { navigate, user, profile, livePrivacy, logout };
}
