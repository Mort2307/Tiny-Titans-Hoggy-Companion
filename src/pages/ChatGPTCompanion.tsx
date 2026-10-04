import { useEffect, useMemo, useState } from "react";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansIcon from "../components/TinyTitansIcon";
import {
  createChatGPTCompanionConnection,
  checkChatGPTCompanionServer,
  getChatGPTCompanionActivity,
  getChatGPTCompanionStatus,
  revokeChatGPTCompanionConnection,
  type ChatGPTCompanionActivity,
  type ChatGPTCompanionConnection,
  type ChatGPTCompanionStatus,
  type ChatGPTCompanionServerCheck,
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
  const [serverCheck, setServerCheck] = useState<ChatGPTCompanionServerCheck | null>(null);
  const [checkingServer, setCheckingServer] = useState(false);
  const [clock, setClock] = useState(Date.now());

  async function refresh() {
    const [nextStatus, nextActivity] = await Promise.all([
      getChatGPTCompanionStatus(),
      getChatGPTCompanionActivity(),
    ]);
    setStatus(nextStatus);
    setActivity(nextActivity);
    if (nextStatus.connected || nextStatus.linkExpired || nextStatus.revoked) setConnection(null);
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

  useEffect(() => {
    let active = true;
    setCheckingServer(true);
    void checkChatGPTCompanionServer().then((result) => {
      if (active) { setServerCheck(result); setCheckingServer(false); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!connection) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [connection]);

  // OAuth returns to another tab. Refresh on return without paid polling reads.
  useEffect(() => {
    let active = true;
    const onFocus = () => {
      void getChatGPTCompanionStatus().then((next) => {
        if (!active) return;
        setStatus(next);
        if (next.connected || next.linkExpired || next.revoked) setConnection(null);
      }).catch((reason) => { if (active) setError(errorMessage(reason)); });
    };
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, []);

  const secondsRemaining = connection ? Math.max(0, Math.ceil((new Date(connection.linkExpiresAt).getTime() - clock) / 1000)) : 0;

  const statusLabel = useMemo(() => {
    if (!status) return "Checking";
    if (status.connected && status.upgradeRequired) return "Relink required";
    if (status.connected) return "Account authorized";
    if (connection && secondsRemaining === 0) return "Link code expired";
    if (status.prepared) return "Link code ready";
    if (status.expired) return "Connection expired";
    if (status.linkExpired) return "Link code expired";
    if (status.revoked) return "Disconnected";
    return "Not connected";
  }, [status, connection, secondsRemaining]);

  async function prepareConnection() {
    setBusy(true);
    setMessage("");
    setError("");
    setCopied(false);
    try {
      const check = await checkChatGPTCompanionServer();
      setServerCheck(check);
      if (!check.ready) throw new Error(check.message);
      const next = await createChatGPTCompanionConnection();
      setConnection(next);
      await refresh();
      setMessage("Code ready. Complete authorization in the Tiny Titans page opened by ChatGPT. Generating a code alone does not link your account.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function copyLinkCode() {
    if (!connection?.linkCode || secondsRemaining <= 0) return;
    try {
      await navigator.clipboard.writeText(connection.linkCode);
      setCopied(true);
      setMessage("One-time link code copied.");
    } catch {
      setError("Your browser blocked clipboard access. Select and copy the link code manually.");
    }
  }

  async function checkServer() {
    setCheckingServer(true);
    setServerCheck(await checkChatGPTCompanionServer());
    setCheckingServer(false);
  }

  async function copyServerAddress() {
    try {
      await navigator.clipboard.writeText(DEFAULT_MCP_SERVER);
      setMessage("Server address copied. Choose OAuth when adding Tiny Titans in ChatGPT.");
    } catch { setError("Select and copy the server address manually; clipboard access was blocked."); }
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
      {status?.upgradeRequired && <div className="tt-gpt-message error" role="alert">This ChatGPT connection predates the newest Tiny Titans permissions. Relink once to enable reminders and the expanded keeper query tools.</div>}
      {error && <div className="tt-gpt-message error" role="alert">{error}</div>}

      <section className="tt-gpt-card" aria-label="Connection check">
        <h2>Check the connection</h2>
        <p role="status">{checkingServer ? "Checking the Tiny Titans connection server…" : serverCheck?.message}</p>
        <button type="button" disabled={checkingServer} onClick={() => void checkServer()}>Check server again</button>
        <p className="tt-gpt-muted">After authorizing, select Tiny Titans in a new chat and ask “List my animals” to verify your account.</p>
      </section>

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
          <h2>{status?.connected ? "Your Tiny Titans account is authorized" : "Link your Tiny Titans account to ChatGPT"}</h2>
          <p className="tt-gpt-muted">
            Paste the one-time code into the Tiny Titans authorization page opened by ChatGPT. It expires after 15 minutes and works once. Pasting it into a conversation or an API-key box will not connect your account.
          </p>

          {(status?.connected || status?.prepared) && (
            <div className="tt-gpt-facts">
              {status.connected && <span><strong>Connected</strong>{toDateLabel(status.connectedAt)}</span>}
              {status.connected && <span><strong>Access valid until</strong>{toDateLabel(status.expiresAt)}</span>}
              {status.prepared && <span><strong>Link code expires</strong>{toDateLabel(status.linkExpiresAt)}</span>}
              <span><strong>Last used</strong>{toDateLabel(status.lastUsedAt)}</span>
              <span><strong>Last tool</strong>{status.lastTool || "No tool call yet"}</span>
              <span><strong>Reminder timezone</strong>{status.timezone || "UTC"}</span>
            </div>
          )}
        </div>

        <div className="tt-gpt-actions">
          <button className="tt-gpt-primary" type="button" disabled={busy || checkingServer || serverCheck?.ready !== true} onClick={() => void prepareConnection()}>
            {busy ? "Working…" : status?.connected ? "Relink / rotate access" : status?.prepared ? "Generate a new code" : "Generate link code"}
          </button>
          {status?.connected && <p className="tt-gpt-muted">Relinking immediately replaces your existing ChatGPT access. Finish the new authorization to reconnect.</p>}
          {(status?.connected || status?.prepared) && (
            <button className="tt-gpt-danger" type="button" disabled={busy} onClick={() => setConfirmRevoke(true)}>Disconnect</button>
          )}
        </div>

        {connection && (
          <div className="tt-gpt-secret" role="region" aria-label="One-time Tiny Titans ChatGPT link code">
            <div>
              <strong>One-time link code</strong>
              <span>Shown once. {secondsRemaining > 0 ? `Expires in ${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s.` : "Expired — generate a new code."} Paste this only into the Tiny Titans connection page opened by ChatGPT.</span>
            </div>
            {secondsRemaining > 0 && <code>{connection.linkCode}</code>}
            <div className="tt-gpt-actions">
              <button type="button" disabled={secondsRemaining <= 0} onClick={() => void copyLinkCode()}>{copied ? "Copied" : "Copy link code"}</button>
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
            <li><strong>Add Tiny Titans to ChatGPT first.</strong> For private testing on ChatGPT web, enable Developer mode in Settings → Security and login, then open Plugins and add the MCP server below. Availability depends on your ChatGPT account and workspace settings.</li>
            <li><strong>Choose OAuth authentication.</strong> Do not select API key or paste a link code into a server-address field.</li>
            <li><strong>When the Tiny Titans authorization page opens, generate a fresh code above.</strong> Keep both pages open and paste the code into that authorization page.</li>
            <li><strong>Review the requested permissions and connect.</strong> If a code has expired, been used, or been replaced, generate a new one.</li>
            <li><strong>Start a new chat, select Tiny Titans, and ask “List my animals”.</strong> Check that your animals are returned. Then try your keeper commands, including reminders and requests involving several animals.</li>
          </ol>
          <div className="tt-gpt-server-row">
            <span>MCP server</span>
            <code>{mcpServer}</code>
            <button type="button" onClick={() => void copyServerAddress()}>Copy server address</button>
          </div>
          <p className="tt-gpt-muted">After Tiny Titans is published in the plugin directory, normal users will install it directly — they will not need to manually enter the MCP server URL.</p>
          <p className="tt-gpt-muted">This links the Tiny Titans plugin; it does not add tools to every custom GPT. If ChatGPT cannot access your records, check Tiny Titans is connected and selected, refresh its tools, then start a new chat.</p>
        </div>
      </section>

      <section className="tt-gpt-card">
        <div className="tt-gpt-section-head">
          <div><p className="tt-gpt-kicker">AUDIT TRAIL</p><h2>Recent ChatGPT Companion actions</h2></div>
          <button type="button" disabled={busy} onClick={() => void refresh().catch((reason) => setError(errorMessage(reason)))}>Refresh</button>
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
        <p className="tt-gpt-kicker">KEEPER COMMANDS</p>
        <h2>What your connection supports</h2>
        <div className="tt-gpt-tool-grid">
          {[
            "Identify the connected keeper account",
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
        <p className="tt-gpt-muted">Tracker commands currently support snake records. Other animal profiles can be listed and viewed. Editing existing records and other app features still need the Tiny Titans app. ChatGPT should confirm completed actions using the saved results and explain any part it could not complete.</p>
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
