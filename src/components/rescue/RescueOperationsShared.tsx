import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import PaidTierGate from "../components/PaidTierGate";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useAuth } from "../context/useAuth";
import {
  listRescueAnimals,
  setRescueReminderComplete,
  updateRescueAnimal,
} from "../services/rescueService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getRescueSetupState } from "../services/rescueSetupService";
import type {
  RescueAnimal,
  RescueAnimalStatus,
  RescueIntakeRecord,
  RescueLocationRecord,
  RescueOrganisation,
  RescueQuarantineRecord,
} from "../types/rescue";
import "../styles/rescue.css";

const STATUS_LABELS: Record<RescueAnimalStatus, string> = {
  in_care: "In care",
  quarantine: "Quarantine",
  under_observation: "Under observation",
  adopted: "Adopted",
  transferred: "Transferred",
  deceased: "Deceased",
};

function formatDate(value: string | number | null | undefined, time = false) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return time ? parsed.toLocaleString("en-GB") : parsed.toLocaleDateString("en-GB");
}

function animalLabel(animal: RescueAnimal) {
  const name = animal.name?.trim();
  const id = animal.rescueId?.trim();
  return name && id ? `${name} · ${id}` : name || id || "Unnamed animal";
}

function useRescueData() {
  const { user } = useAuth();
  const [organisation, setOrganisation] = useState<RescueOrganisation | null>(null);
  const [animals, setAnimals] = useState<RescueAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    const workspace = await getMyRescueWorkspace();
    const org = workspace.organisation;
    setOrganisation(org);
    if (!org) {
      setAnimals([]);
      return;
    }
    setAnimals(await listRescueAnimals(org.id));
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load the Rescue workspace."))
      .finally(() => setLoading(false));
  }, [refresh]);

  return { user, organisation, animals, loading, error, refresh };
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rescue-subhead">
      <div>
        <span className="rescue-eyebrow">{eyebrow}</span>
        <h1><TinyTitansIcon name="reptile" size={35} /> {title}</h1>
        <p>{description}</p>
      </div>
      {actions}
    </header>
  );
}

function GatePage({ children }: { children: ReactNode }) {
  return <PaidTierGate entitlement="rescue_workspace">{children}</PaidTierGate>;
}
