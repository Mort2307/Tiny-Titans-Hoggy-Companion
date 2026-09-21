import { useMemo, useState } from "react";
import { askTitan } from "./titanChatService";
import type { TitanAskResponse, TitanSpeciesReference, TitanWorkspaceKind } from "./titanChatContracts";
import { findUniversalSpecies } from "../../data/species/universalSpeciesRegistry";


function buildSpeciesReference(speciesId?: string): TitanSpeciesReference | undefined {
  if (!speciesId) return undefined;
  const species = findUniversalSpecies(speciesId);
  if (!species?.care) return undefined;
  return {
    id: species.id,
    commonName: species.commonNames[0] ?? species.acceptedScientificName,
    scientificName: species.acceptedScientificName,
    animalGroup: species.className,
    family: species.family,
    genus: species.genus,
    lifestyle: species.lifestyle,
    dietaryGuild: species.dietaryGuild,
    careStatus: species.care.status,
    careResolution: species.care.resolvedFrom,
    husbandry: species.care.husbandry.requirements.map((item) => ({
      label: item.label,
      guidance: item.guidance,
      priority: item.priority,
      basis: item.evidence.basis,
      caveat: item.evidence.caveat,
    })),
    healthBaseline: species.care.health.baseline,
    healthWatch: species.care.health.watches.map((watch) => ({
      concern: watch.concern,
      watchFor: watch.watchFor,
      riskFactors: watch.riskFactors,
      prevention: watch.prevention,
      priority: watch.priority,
      basis: watch.evidence.basis,
      caveat: watch.evidence.caveat,
    })),
    unresolved: [...species.care.husbandry.unresolved, ...species.care.health.unresolved],
  };
}

export type TitanChatMessage = { id: string; role: "user" | "model"; content: string; response?: TitanAskResponse };

export function useTitanChat({ workspaceKind = "personal", animalId, speciesId }: { workspaceKind?: TitanWorkspaceKind; animalId?: string; speciesId?: string }) {
  const [messages, setMessages] = useState<TitanChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<TitanAskResponse["usage"] | null>(null);
  const history = useMemo(() => messages.map((item) => ({ role: item.role, content: item.content })), [messages]);

  async function submit(question: string) {
    setBusy(true);
    setError("");
    const userMessage: TitanChatMessage = { id: `${Date.now()}-user`, role: "user", content: question };
    setMessages((current) => [...current, userMessage]);
    try {
      const response = await askTitan({ question, animalId, speciesId, speciesReference: buildSpeciesReference(speciesId), workspaceKind, history });
      setUsage(response.usage);
      setMessages((current) => [...current, { id: `${Date.now()}-titan`, role: "model", content: response.text, response }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Titan Intelligence could not complete that question.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([]);
    setError("");
    setUsage(null);
  }

  return { messages, busy, error, usage, submit, reset };
}
