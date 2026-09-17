import { useMemo, useState } from "react";
import { askTitan } from "./titanChatService";
import type { TitanAskResponse, TitanWorkspaceKind } from "./titanChatContracts";

export type TitanChatMessage = { id: string; role: "user" | "model"; content: string; response?: TitanAskResponse };

export function useTitanChat({ workspaceKind = "personal", animalId }: { workspaceKind?: TitanWorkspaceKind; animalId?: string }) {
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
      const response = await askTitan({ question, animalId, workspaceKind, history });
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
