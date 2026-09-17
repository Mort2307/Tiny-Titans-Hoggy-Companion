import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TitanChatComposer from "./TitanChatComposer";
import TitanChatMessage from "./TitanChatMessage";
import TitanUsageIndicator from "./TitanUsageIndicator";
import { askTitan } from "../../intelligence/askTitan/titanChatService";
import type { TitanAskResponse, TitanWorkspaceKind } from "../../intelligence/askTitan/titanChatContracts";
import "./AskTitan.css";

const STARTERS = [
  "What patterns can you see in my recorded animal data?",
  "What changed recently in my animal's records?",
  "Explain what my feeding and weight records actually show.",
  "Help me understand a husbandry question using the data I've recorded.",
];

type Message = { id: string; role: "user" | "model"; content: string; response?: TitanAskResponse };

export default function AskTitan({ workspaceKind = "personal", animalId }: { workspaceKind?: TitanWorkspaceKind; animalId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const history = useMemo(() => messages.map((item) => ({ role: item.role, content: item.content })), [messages]);

  async function submit(question: string) {
    setBusy(true);
    setError("");
    const userMessage: Message = { id: `${Date.now()}-user`, role: "user", content: question };
    setMessages((current) => [...current, userMessage]);
    try {
      const response = await askTitan({ question, animalId, workspaceKind, history });
      setUsage(response.usage);
      setMessages((current) => [...current, { id: `${Date.now()}-titan`, role: "model", content: response.text, response }]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Titan Intelligence could not complete that question.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([]);
    setError("");
    setUsage(null);
  }

  return (
    <section className="ask-titan-card" aria-label="Ask Titan">
      <header className="ask-titan-header">
        <div>
          <span className="titan-kicker">PAID FEATURE · POWERHOUSE INTELLIGENCE</span>
          <h2>Ask Titan</h2>
          <p>Titan can use your authorised Tiny Titans records, deterministic analysis and relevant web evidence to help you investigate a question.</p>
        </div>
        <button className="ask-titan-reset" type="button" onClick={reset} disabled={busy || messages.length === 0}>New chat</button>
      </header>

      {messages.length === 0 && (
        <div className="ask-titan-start">
          <strong>Start with a real question.</strong>
          <p>Titan does not replace your records or invent missing information. It works from the data and evidence available for your account and clearly separates recorded facts from interpretation.</p>
          <div className="ask-titan-starters">{STARTERS.map((starter) => <button type="button" key={starter} onClick={() => void submit(starter)} disabled={busy}>{starter}</button>)}</div>
        </div>
      )}

      {messages.length > 0 && <div className="ask-titan-thread" aria-live="polite">{messages.map((message) => <TitanChatMessage key={message.id} role={message.role} content={message.content} response={message.response} />)}</div>}

      {error && <div className="ask-titan-error" role="alert"><strong>Titan could not answer this one.</strong><span>{error}</span><Link to="/plans">Review paid access →</Link></div>}
      <TitanChatComposer disabled={busy || usage?.remaining === 0} onSubmit={submit} />
      {usage && <TitanUsageIndicator used={usage.used} limit={usage.limit} remaining={usage.remaining} />}
    </section>
  );
}