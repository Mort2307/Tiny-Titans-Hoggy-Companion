import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { UnitSystem } from "../context/UnitContext";
import { saveAccountUnitSystem } from "../services/accountPreferencesService";

export function useSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitSystem>(profile?.unitSystem ?? "metric");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUnits(profile?.unitSystem ?? "metric");
  }, [profile?.unitSystem]);

  async function saveUnits(next: UnitSystem) {
    if (!user || saving) return;
    setUnits(next);
    setSaving(true);
    setSaved(false);
    try {
      await saveAccountUnitSystem(user.uid, next);
      await refreshProfile();
      setSaved(true);
    } catch (error) {
      console.error("Tiny Titans: unable to save unit preference", error);
      setUnits(profile?.unitSystem ?? "metric");
    } finally {
      setSaving(false);
    }
  }

  return { user, profile, navigate, units, saving, saved, saveUnits };
}
