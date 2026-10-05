import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansIcon from "../components/TinyTitansIcon";
import {
  getChatGPTCompanionActivity,
  getChatGPTCompanionStatus,
  revokeChatGPTCompanionConnection,
  type ChatGPTCompanionActivity,
  type ChatGPTCompanionStatus,
} from "../services/chatgptCompanionService";
import "../styles/chatgptCompanion.css";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Tiny Titans could not complete that ChatGPT Companion request.";
}

function toDateLabel(value: unknown): string {
  if (!value) return "Not yet";
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
  }
  if (typeof value === "number") return new Date(value).toLocaleString();
  if (typeof value === "object" && value !== null) {
    const record = value as { seconds?: number; _seconds?: number; toMillis?: () => number };
    if (typeof record.toMillis === "function") return new Date(record.toMillis()).toLocaleString();
    const seconds = Number(record.seconds ?? record._seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000).toLocaleString();
  }
  return "Recorded";
}

const EXAMPLES = [
  "Haze ate a 7g fuzzy today, tong fed, accepted immediately.",
  "Mort weighs 96.4g today.",
  "Marmalade had a complete perfect shed today with no retained eye caps.",
  "Which of my animals have refused food recently?",
  "Undo the last record I added through Tiny Titans.",
  "Set a feed reminder for Mort and Haze for Monday, then tell me when Lilith, Marmalade and Nox last ate.",
  "Which of my animals are due a feed this week?",
];

const PERMISSION_LABELS: Record<string, string> = {
  read_animals: "Read animal identity and profile basics",
  read_records: "Read keeper tracker history",
  write_records: "Create feeding, weight, shed, behaviour and health records",
  undo_own_actions: "Undo records created through this connection",
  read_reminders: "Read keeper reminders",
  write_reminders: "Create one-time or recurring keeper reminders",
};

const CHATGPT_PLUGIN_URL = (import.meta.env.VITE_CHATGPT_PLUGIN_URL as string | undefined)?.trim() || "https://chatgpt.com/plugins";

export default function ChatGPTCompanion() {
  const [status, setStatus] = useState<ChatGPTCompanionStatus | null>(null);
  const [activity, setActivity] = useState<ChatGPTCompanionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const refresh = useCallback(async () => {
    const [nextStatus, nextActivity] = await Promise.all([
      getChatGPTCompanionStatus(),
      getChatGPTCompanionActivity(),
    ]);
    setStatus(nextStatus);
    setActivity(nextActivity);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getChatGPTCompanionStatus(), getChatGPTCompanionActivity()])
      .then(([nextStatus, nextActivity]) => {
        if (!active) return;
        setStatus(nextStatus);
        setActivity(nextActivity);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const refreshAfterReturn = () => {
      if (!active || document.visibilityState !== "visible") return;
      void refresh().catch((reason) => {
        if (active) setError(errorMessage(reason));
      });
    };

    window.addEventListener("focus", refreshAfterReturn);
    document.addEventListener("visibilitychange", refreshAfterReturn);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshAfterReturn);
      document.removeEventListener("visibilitychange", refreshAfterReturn);
    };
  }, [refresh]);

  const statusLabel = useMemo(() => {
    if (!status) return "Checking";
    if (status.connected && status.upgradeRequired) return "Reconnect required";
    if (status.connected) return "Connected to ChatGPT";
    if (status.expired) return "Connection expired";
    if (status.revoked) return "Disconnected";
    return "Ready to connect";
  }, [status]);

  async function revokeConnection() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await revokeChatGPTCompanionConnection();
      await refresh();
      setMessage("ChatGPT access revoked immediately. Existing Tiny Titans keeper records were not changed.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
      setConfirmRevoke(false);
    }
  }

  if (loading) {
    return <main className="tt-gpt-page"><section className="tt-gpt-card"><h1>ChatGPT Companion</h1><p>Checking secure integration status…</p></section></main>;
  }

  return (
    <main className="tt-gpt-page">
      <header className="tt-gpt-hero">
        <div>
          <p className="tt-gpt-kicker">TITAN PRO · INTEGRATIONS</p>
          <h1><TinyTitansIcon name="titan" size={32} /> Tiny Titans Companion</h1>
          <p>Your records. Just ask. ChatGPT can securely read and update the same Tiny Titans tracker data you already use — no separate AI-only records and no generic database access.</p>
        </div>
        <div className={`tt-gpt-status ${status?.connected ? "is-live" : ""}`}>
          <span>{statusLabel}</span>
          <strong>{status?.effectiveTier?.replaceAll("_", " ") || "free"}</strong>
        </div>
      </header>

      {message && <div className="tt-gpt-message success" role="status">{message}</div>}
      {status?.upgradeRequired && <div className="tt-gpt-message error" role="alert">This connection predates the newest Tiny Titans permissions. Reconnect Tiny Titans from ChatGPT once to update it.</div>}
      {error && <div className="tt-gpt-message error" role="alert">{error}</div>}

      <section className="tt-gpt-grid">
        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">CONVERSATIONAL KEEPING</p>
          <h2>What you can ask ChatGPT to do</h2>
          <div className="tt-gpt-examples">
            {EXAMPLES.map((example) => <div key={example}><span aria-hidden="true">›</span><code>{example}</code></div>)}
          </div>
          <p className="tt-gpt-muted">Read actions use scoped Tiny Titans tools. Record-changing actions create normal tracker records that remain visible in Tiny Titans, complete with an audit trail.</p>
        </article>

        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">SECURITY MODEL</p>
          <h2>Exactly what ChatGPT can access</h2>
          <div className="tt-gpt-permissions">
            {(status?.permissions ?? []).map((permission) => (
              <div key={permission}>
                <TinyTitansIcon name="check" size={16} />
                <span>{PERMISSION_LABELS[permission] ?? permission.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
          <p className="tt-gpt-muted">Tiny Titans never exposes generic Firestore access. Arbitrary deletion is not granted; undo only targets a reversible record created through this connection.</p>
        </article>
      </section>

      <section className="tt-gpt-card tt-gpt-connect">
        <div>
          <p className="tt-gpt-kicker">SECURE CONNECTION</p>
          <h2>{status?.connected ? "Tiny Titans is connected to ChatGPT" : "Connect with your normal Tiny Titans account"}</h2>
          <p className="tt-gpt-muted">
            One secure account link. No pairing codes, API keys, server addresses or copy-and-paste setup. ChatGPT sends you to Tiny Titans, you approve access with your normal account, and the connection is returned automatically.
          </p>

          {status?.connected && (
            <div className="tt-gpt-facts">
              <span><strong>Connected</strong>{toDateLabel(status.connectedAt)}</span>
              <span><strong>Access valid until</strong>{toDateLabel(status.expiresAt)}</span>
              <span><strong>Last used</strong>{toDateLabel(status.lastUsedAt)}</span>
              <span><strong>Last tool</strong>{status.lastTool || "No tool call yet"}</span>
              <span><strong>Reminder timezone</strong>{status.timezone || "UTC"}</span>
            </div>
          )}
        </div>

        <div className="tt-gpt-actions">
          <a className="tt-gpt-primary" href={CHATGPT_PLUGIN_URL} target="_blank" rel="noreferrer">
            {status?.connected ? "Open ChatGPT" : "Link with ChatGPT"}
          </a>
          {status?.connected && (
            <button className="tt-gpt-danger" type="button" disabled={busy} onClick={() => setConfirmRevoke(true)}>Disconnect</button>
          )}
        </div>

        <div className="tt-gpt-link-guide">
          <div className="tt-gpt-section-head">
            <div>
              <p className="tt-gpt-kicker">ONE-TAP ACCOUNT LINK</p>
              <h3>Link Tiny Titans and ChatGPT</h3>
            </div>
          </div>
          <ol>
            <li><strong>Tap Link with ChatGPT.</strong> Tiny Titans opens ChatGPT's plugin area.</li>
            <li><strong>Install Tiny Titans if prompted, then press Connect.</strong> ChatGPT starts the secure Tiny Titans sign-in automatically.</li>
            <li><strong>Sign in and press Allow.</strong> You return to ChatGPT connected to your own keeper records.</li>
          </ol>
          <p className="tt-gpt-muted"><strong>That is the whole setup.</strong> Tiny Titans will never ask normal users to copy a token, pairing code, MCP address, API key or Firestore identifier into ChatGPT.</p>
        </div>
      </section>

      <section className="tt-gpt-card">
        <div className="tt-gpt-section-head">
          <div><p className="tt-gpt-kicker">AUDIT TRAIL</p><h2>Recent ChatGPT Companion actions</h2></div>
          <button type="button" disabled={busy} onClick={() => void refresh()}>Refresh</button>
        </div>
        {activity.length === 0 ? (
          <p className="tt-gpt-muted">No ChatGPT Companion record changes have been made yet.</p>
        ) : (
          <div className="tt-gpt-activity">
            {activity.map((item) => (
              <article key={item.id}>
                <div><strong>{item.summary || item.tool || "Companion action"}</strong><span>{item.animalName || "Tiny Titans"} · {toDateLabel(item.createdAt)}</span></div>
                <span className={item.undoneAt ? "undone" : item.reversible ? "reversible" : ""}>{item.undoneAt ? "UNDONE" : item.reversible ? "UNDO AVAILABLE" : "RECORDED"}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="tt-gpt-card">
        <p className="tt-gpt-kicker">LIVE CONNECTION STACK</p>
        <h2>What Tiny Titans exposes to ChatGPT</h2>
        <div className="tt-gpt-tool-grid">
          {[
            "OAuth 2.1 + PKCE with Tiny Titans Firebase sign-in",
            "MCP Streamable HTTP endpoint",
            "Authenticated profile identity",
            "Animal resolution",
            "Animal summaries",
            "Feeding history",
            "Weight history",
            "Shed history",
            "Recent activity",
            "Multi-animal keeper snapshot",
            "Read keeper reminders",
            "Create one-time & recurring reminders",
            "Log feeding",
            "Log weight",
            "Log shed",
            "Log behaviour",
            "Log health observation",
            "Undo last Companion action",
          ].map((item) => <span key={item}><TinyTitansIcon name="check" size={15} /> {item}</span>)}
        </div>
        <p className="tt-gpt-muted">The MCP tools sit on top of Tiny Titans' existing keeper-data API, so ChatGPT writes the same structured records the app already understands instead of inventing a parallel data store.</p>
      </section>

      <ConfirmActionDialog
        open={confirmRevoke}
        title="Disconnect ChatGPT Companion?"
        description="This immediately invalidates the active Tiny Titans ChatGPT connection. It does not delete animal or tracker records."
        confirmLabel="Disconnect"
        busy={busy}
        destructive={false}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() => void revokeConnection()}
      />
    </main>
  );
}
