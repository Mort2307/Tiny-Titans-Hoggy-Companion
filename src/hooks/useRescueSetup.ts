import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getRescueSetupState, updateRescuePublicProfile } from "../services/rescueSetupService";
import { EMPTY_RESCUE_SETUP, normaliseRescueSetup, type RescueSetupForm } from "../lib/rescueSetup";

export function useRescueSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RescueSetupForm>(EMPTY_RESCUE_SETUP);
  const [organisationId, setOrganisationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [brandingError, setBrandingErrorState] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const workspace = await getMyRescueWorkspace();
        if (!active) return;

        if (workspace.role !== "owner" || !workspace.organisation) {
          navigate("/rescue?manage=1", { replace: true });
          return;
        }

        setOrganisationId(workspace.organisation.id);
        const state = await getRescueSetupState(workspace.organisation.id);
        if (!active) return;

        if (state.organisation.setupComplete) {
          navigate("/rescue?manage=1", { replace: true });
          return;
        }

        setForm(normaliseRescueSetup(state.organisation));
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load Rescue setup.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [navigate, user]);

  function setField<Key extends keyof RescueSetupForm>(
    key: Key,
    value: RescueSetupForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setBrandingError(message: string) {
    setBrandingErrorState(message);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!organisationId) {
      setError("Your Rescue organisation could not be identified.");
      return;
    }
    if (!form.directoryVisible) {
      setError(
        "Keep the public Rescue profile enabled while completing first-time setup.",
      );
      return;
    }

    setSaving(true);
    try {
      await updateRescuePublicProfile({ organisationId, ...form });
      navigate("/rescue?manage=1", { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save the Rescue profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    setField,
    organisationId,
    loading,
    saving,
    error,
    brandingError,
    setBrandingError,
    submit,
  };
}
