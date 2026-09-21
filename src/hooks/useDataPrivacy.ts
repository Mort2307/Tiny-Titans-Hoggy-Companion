import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import type { PrivacyPreferences } from "../types/privacy";

const EMPTY_PRIVACY: PrivacyPreferences = {
  consentVersion: "",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  productUpdates: false,
};

export function useDataPrivacy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PrivacyPreferences>(EMPTY_PRIVACY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    void getPrivacyPreferences(user.uid)
      .then((value) => { if (active) setPreferences(value); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Privacy choices could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function save(next: Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">) {
    if (!user || saving) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await savePrivacyPreferences(user.uid, next);
      setPreferences(await getPrivacyPreferences(user.uid));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your privacy choices.");
    } finally {
      setSaving(false);
    }
  }

  return { navigate, user, preferences, loading, saving, saved, error, save };
}
