import { useEffect, useMemo, useState } from "react";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansIcon from "../components/TinyTitansIcon";
import {
  createChatGPTCompanionConnection,
  getChatGPTCompanionActivity,
  getChatGPTCompanionStatus,
  revokeChatGPTCompanionConnection,
  type ChatGPTCompanionActivity,
  type ChatGPTCompanionConnection,
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
];

const PERMISSION_LABELS: Record<string, string> = {
  read_animals: "Read animal identity and profile basics",
  read_records: "Read keeper tracker history",
  write_records: "Create feeding, weight, shed, behaviour and health records",
  undo_own_actions: "Undo records created through this connection",
};

export default function ChatGPTCompanion() {
  const [status, setStatus] = useState<ChatGPTCompanionStatus | null>(null);
  const [activity, setActivity] = useState<ChatGPTCompanionActivity[]>([]);
  const [connection, setConnection] = useState<ChatGPTCompanionConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const [nextStatus, nextActivity] = await Promise.all([
      getChatGPTCompanionStatus(),
      getChatGPTCompanionActivity(),
    ]);
    setStatus(nextStatus);
    setActivity(nextActivity);
  }

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
    return () => {
      active = false;
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (!status) return "Checking";
    if (status.connected) return "Connection ready";
    if (status.expired) return "Expired";
    if (status.revoked) return "Disconnected";
    return "Not connected";
  }, [status]);

  async function prepareConnection() {
    setBusy(true);
    setMessage("");
    setError("");
    setCopied(false);
    try {
      const next = await createChatGPTCompanionConnection();
      setConnection(next);
      await refresh();
      setMessage("Secure connection credentials created. The token is shown once only.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!connection?.token) return;
    try {
      await navigator.clipboard.writeText(connection.token);
      setCopied(true);
      setMessage("Connection token copied.");
    } catch {
      setError("Your browser blocked clipboard access. Select and copy the token manually.");
    }
  }

  async function revokeConnection() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await revokeChatGPTCompanionConnection();
      setConnection(null);
      await refresh();
      setMessage("ChatGPT Companion connection revoked. Existing Tiny Titans records were not changed.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
      setConfirmRevoke(false);
    }
  }

  if (loading) {
    return <main className="tt-gpt-page"><section className="tt-gpt-card"><h1>ChatGPT Companion</h1><p>Checking secure integration statusâ€¦</p></section></main>;
  }

  return (
    <main className="tt-gpt-page">
      <header className="tt-gpt-hero">
        <div>
          <p className="tt-gpt-kicker">TITAN PRO Â· INTEGRATIONS</p>
          <h1><TinyTitansIcon name="titan" size={32} /> Tiny Titans Companion</h1>
          <p>Your records. Just ask. ChatGPT can work with the same Tiny Titans tracker data you already use instead of creating a separate AI-only record system.</p>
        </div>
        <div className={`tt-gpt-status ${status?.connected ? "is-live" : ""}`}>
          <span>{statusLabel}</span>
          <strong>{status?.effectiveTier?.replaceAll("_", " ") || "free"}</strong>
        </div>
      </header>

      {message && <div className="tt-gpt-message success" role="status">{message}</div>}
      {error && <div className="tt-gpt-message error" role="alert">{error}</div>}

      <section className="tt-gpt-grid">
        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">CONVERSATIONAL KEEPING</p>
          <h2>What you will be able to do</h2>
          <div className="tt-gpt-examples">
            {EXAMPLES.map((example) => <div key={example}><span aria-hidden="true">â€º</span><code>{example}</code></div>)}
          </div>
          <p className="tt-gpt-muted">Read actions can stay frictionless. Record-changing actions are exposed as explicit Tiny Titans tools so ChatGPT never receives generic Firestore access.</p>
        </article>

        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">SECURITY MODEL</p>
          <h2>Connection permissions</h2>
          <div className="tt-gpt-permissions">
            {(status?.permissions ?? []).map((permission) => (
              <div key={permission}>
                <TinyTitansIcon name="check" size={16} />
                <span>{PERMISSION_LABELS[permission] ?? permission.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
          <p className="tt-gpt-muted">Deleting arbitrary records is not granted. The first release can only undo a reversible record that the ChatGPT connection itself created.</p>
        </article>
      </section>

      <section className="tt-gpt-card tt-gpt-connect">
        <div>
          <p className="tt-gpt-kicker">SECURE CONNECTION</p>
          <h2>{status?.connected ? "Tiny Titans is ready for the ChatGPT plugin layer" : "Prepare a secure Companion connection"}</h2>
          <p className="tt-gpt-muted">
            Tiny Titans uses a revocable, hashed connection credential. The raw secret is never stored in readable form after this screen.
          </p>
          {status?.connected && (
            <div className="tt-gpt-facts">
              <span><strong>Last used</strong>{toDateLabel(status.lastUsedAt)}</span>
              <span><strong>Last tool</strong>{status.lastTool || "No tool call yet"}</span>
              <span><strong>Expires</strong>{toDateLabel(status.expiresAt)}</span>
            </div>
          )}
        </div>

        <div className="tt-gpt-actions">
          <button className="tt-gpt-primary" type="button" disabled={busy} onClick={() => void prepareConnection()}>
            {busy ? "Workingâ€¦" : status?.connected ? "Rotate connection token" : "Prepare connection"}
          </button>
          {status?.connected && <button className="tt-gpt-danger" type="button" disabled={busy} onClick={() => setConfirmRevoke(true)}>Disconnect</button>}
        </div>

        {connection && (
          <div className="tt-gpt-secret" role="region" aria-label="One-time ChatGPT Companion token">
            <div>
              <strong>One-time connection token</strong>
              <span>Shown once. Treat this like a password while we complete the final ChatGPT plugin/OAuth connection flow.</span>
            </div>
            <code>{connection.token}</code>
            <div className="tt-gpt-actions">
              <button type="button" onClick={() => void copyToken()}>{copied ? "Copied" : "Copy token"}</button>
            </div>
          </div>
        )}
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
                <div><strong>{item.summary || item.tool || "Companion action"}</strong><span>{item.animalName || "Tiny Titans"} Â· {toDateLabel(item.createdAt)}</span></div>
                <span className={item.undoneAt ? "undone" : item.reversible ? "reversible" : ""}>{item.undoneAt ? "UNDONE" : item.reversible ? "UNDO AVAILABLE" : "RECORDED"}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="tt-gpt-card">
        <p className="tt-gpt-kicker">FOUNDATION STATUS</p>
        <h2>What is live in the Tiny Titans backend</h2>
        <div className="tt-gpt-tool-grid">
          {["Animal resolution", "Animal summaries", "Feeding history", "Weight history", "Shed history", "Recent activity", "Log feeding", "Log weight", "Log shed", "Log behaviour", "Log health observation", "Undo last Companion action"].map((item) => <span key={item}><TinyTitansIcon name="check" size={15} /> {item}</span>)}
        </div>
        <p className="tt-gpt-muted">The next layer is the public ChatGPT MCP/plugin adapter and account sign-in flow. The keeper-data API underneath it is now deliberately platform-neutral so we are not tied to one AI client.</p>
      </section>

      <ConfirmActionDialog
        open={confirmRevoke}
        title="Disconnect ChatGPT Companion?"
        description="This immediately revokes the connection credential. It does not delete any Tiny Titans animal or tracker records."
        confirmLabel="Disconnect"
        busy={busy}
        destructive={false}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() => void revokeConnection()}
      />
    </main>
  );
}
