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

const DEFAULT_MCP_SERVER = "https://tinytitanskeeper.web.app/mcp";

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
    if (status.connected) return "Connected to ChatGPT";
    if (status.prepared) return "Link code ready";
    if (status.expired) return "Connection expired";
    if (status.linkExpired) return "Link code expired";
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
      setMessage("One-time link code created. It expires in 15 minutes and is shown only on this screen.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function copyLinkCode() {
    if (!connection?.linkCode) return;
    try {
      await navigator.clipboard.writeText(connection.linkCode);
      setCopied(true);
      setMessage("One-time link code copied.");
    } catch {
      setError("Your browser blocked clipboard access. Select and copy the link code manually.");
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

  const mcpServer = connection?.mcpServer || status?.mcpServer || DEFAULT_MCP_SERVER;

  return (
    <main className="tt-gpt-page">
      <header className="tt-gpt-hero">
        <div>
          <p className="tt-gpt-kicker">TITAN PRO · INTEGRATIONS</p>
          <h1><TinyTitansIcon name="titan" size={32} /> Tiny Titans Companion</h1>
          <p>Your records. Just ask. ChatGPT can securely read and update the same Tiny Titans tracker data you already use — no separate AI-only records and no generic database access.</p>
        </div>
        <div className={`tt-gpt-status ${status?.connected ? "is-live" : status?.prepared ? "is-prepared" : ""}`}>
          <span>{statusLabel}</span>
          <strong>{status?.effectiveTier?.replaceAll("_", " ") || "free"}</strong>
        </div>
      </header>

      {message && <div className="tt-gpt-message success" role="status">{message}</div>}
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
          <h2>{status?.connected ? "Tiny Titans is connected to ChatGPT" : "Link your Tiny Titans account to ChatGPT"}</h2>
          <p className="tt-gpt-muted">
            The one-time code is only used to prove which Tiny Titans account you are linking. It expires after 15 minutes, works once, and is exchanged for revocable OAuth access.
          </p>

          {(status?.connected || status?.prepared) && (
            <div className="tt-gpt-facts">
              {status.connected && <span><strong>Connected</strong>{toDateLabel(status.connectedAt)}</span>}
              {status.connected && <span><strong>Access valid until</strong>{toDateLabel(status.expiresAt)}</span>}
              {status.prepared && <span><strong>Link code expires</strong>{toDateLabel(status.linkExpiresAt)}</span>}
              <span><strong>Last used</strong>{toDateLabel(status.lastUsedAt)}</span>
              <span><strong>Last tool</strong>{status.lastTool || "No tool call yet"}</span>
            </div>
          )}
        </div>

        <div className="tt-gpt-actions">
          <button className="tt-gpt-primary" type="button" disabled={busy} onClick={() => void prepareConnection()}>
            {busy ? "Working…" : status?.connected ? "Relink / rotate access" : status?.prepared ? "Generate a new code" : "Generate link code"}
          </button>
          {(status?.connected || status?.prepared) && (
            <button className="tt-gpt-danger" type="button" disabled={busy} onClick={() => setConfirmRevoke(true)}>Disconnect</button>
          )}
        </div>

        {connection && (
          <div className="tt-gpt-secret" role="region" aria-label="One-time Tiny Titans ChatGPT link code">
            <div>
              <strong>One-time link code</strong>
              <span>Shown once. Expires in 15 minutes. Paste this only into the Tiny Titans connection page opened by ChatGPT.</span>
            </div>
            <code>{connection.linkCode}</code>
            <div className="tt-gpt-actions">
              <button type="button" onClick={() => void copyLinkCode()}>{copied ? "Copied" : "Copy link code"}</button>
            </div>
          </div>
        )}

        <div className="tt-gpt-link-guide">
          <div className="tt-gpt-section-head">
            <div>
              <p className="tt-gpt-kicker">PRIVATE TESTING · ONE-TIME SETUP</p>
              <h3>How to add Tiny Titans to ChatGPT</h3>
            </div>
          </div>
          <ol>
            <li><strong>Generate a link code above.</strong> Keep this Tiny Titans page open.</li>
            <li><strong>On ChatGPT web, enable Developer mode</strong> in Settings → Security and login.</li>
            <li><strong>Open ChatGPT Plugins and add an MCP server.</strong> Use the server address below and name it <em>Tiny Titans</em>.</li>
            <li><strong>When ChatGPT opens the Tiny Titans sign-in page, paste the one-time link code.</strong> Tiny Titans exchanges it for scoped OAuth access.</li>
            <li><strong>Start a new chat and select Tiny Titans.</strong> You can then ask naturally to read or log feeding, weight, sheds, behaviour, and health observations.</li>
          </ol>
          <div className="tt-gpt-server-row">
            <span>MCP server</span>
            <code>{mcpServer}</code>
          </div>
          <p className="tt-gpt-muted">After Tiny Titans is published in the plugin directory, normal users will install it directly — they will not need to manually enter the MCP server URL.</p>
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
        <h2>What Tiny Titans now exposes to ChatGPT</h2>
        <div className="tt-gpt-tool-grid">
          {[
            "OAuth 2.1 + PKCE account linking",
            "MCP Streamable HTTP endpoint",
            "Authenticated profile identity",
            "Animal resolution",
            "Animal summaries",
            "Feeding history",
            "Weight history",
            "Shed history",
            "Recent activity",
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
        description="This immediately invalidates the active Tiny Titans ChatGPT connection and any unused link code. It does not delete animal or tracker records."
        confirmLabel="Disconnect"
        busy={busy}
        destructive={false}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() => void revokeConnection()}
      />
    </main>
  );
}
