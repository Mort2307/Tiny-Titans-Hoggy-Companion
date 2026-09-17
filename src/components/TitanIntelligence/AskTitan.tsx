import { Link } from "react-router-dom";
import TitanChatComposer from "./TitanChatComposer";
import TitanChatMessage from "./TitanChatMessage";
import TitanUsageIndicator from "./TitanUsageIndicator";
import TitanDataUseNotice from "./TitanDataUseNotice";
import { useTitanChat } from "../../intelligence/askTitan/useTitanChat";
import { TITAN_CHAT_STARTERS } from "../../intelligence/askTitan/titanChatStarters";
import type { TitanWorkspaceKind } from "../../intelligence/askTitan/titanChatContracts";
import "./AskTitan.css";

export default function AskTitan({ workspaceKind = "personal", animalId }: { workspaceKind?: TitanWorkspaceKind; animalId?: string }) {
  const { messages, busy, error, usage, submit, reset } = useTitanChat({ workspaceKind, animalId });

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

      <TitanDataUseNotice />

      {messages.length === 0 && (
        <div className="ask-titan-start">
          <strong>Start with a real question.</strong>
          <p>Titan does not replace your records or invent missing information. It works from the data and evidence available for your account and clearly separates recorded facts from interpretation.</p>
          <div className="ask-titan-starters">
            {TITAN_CHAT_STARTERS.map((starter) => <button type="button" key={starter} onClick={() => void submit(starter)} disabled={busy}>{starter}</button>)}
          </div>
        </div>
      )}

      {messages.length > 0 && <div className="ask-titan-thread" aria-live="polite">{messages.map((message) => <TitanChatMessage key={message.id} role={message.role} content={message.content} response={message.response} />)}</div>}

      {error && <div className="ask-titan-error" role="alert"><strong>Titan could not answer this one.</strong><span>{error}</span><Link to="/plans">Review paid access →</Link></div>}
      <TitanChatComposer disabled={busy || usage?.remaining === 0} onSubmit={submit} />
      {usage && <TitanUsageIndicator used={usage.used} limit={usage.limit} remaining={usage.remaining} />}
    </section>
  );
}
