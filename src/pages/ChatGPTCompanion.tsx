import { useEffect, useMemo, useState } from "react";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansIcon from "../components/TinyTitansIcon";
import {
  getChatGPTCompanionActivity,
  getChatGPTCompanionLinkInfo,
  getChatGPTCompanionStatus,
  revokeChatGPTCompanionConnection,
  type ChatGPTCompanionActivity,
  type ChatGPTCompanionLinkInfo,
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
  const [linkInfo, setLinkInfo] = useState<ChatGPTCompanionLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const [nextStatus, nextActivity, nextLinkInfo] = await Promise.all([
      getChatGPTCompanionStatus(),
      getChatGPTCompanionActivity(),
      getChatGPTCompanionLinkInfo(),
    ]);
    setStatus(nextStatus);
    setActivity(nextActivity);
    setLinkInfo(nextLinkInfo);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      getChatGPTCompanionStatus(),
      getChatGPTCompanionActivity(),
      getChatGPTCompanionLinkInfo(),
    ])
      .then(([nextStatus, nextActivity, nextLinkInfo]) => {
        if (!active) return;
        setStatus(nextStatus);
        setActivity(nextActivity);
        setLinkInfo(nextLinkInfo);
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
    if (status.connected && status.connectionMode === "oauth") return "Connected to ChatGPT";
    if (status.connected && status.connectionMode === "legacy_token") return "Legacy test connection";
    if (status.expired) return "Expired";
    if (status.revoked) return "Disconnected";
    return "Not connected";
  }, [status]);

  async function copyMcpUrl() {
    if (!linkInfo?.mcpUrl) return;
    try {
      await navigator.clipboard.writeText(linkInfo.mcpUrl);
      setCopied(true);
      setMessage("Tiny Titans MCP address copied. Paste it into ChatGPT when creating the app connection.");
    } catch {
      setError("Your browser blocked clipboard access. Select and copy the MCP address manually.");
    }
  }

  function openChatGPT() {
    window.open(linkInfo?.chatgptUrl || "https://chatgpt.com/", "_blank", "noopener,noreferrer");
  }

  async function revokeConnection() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await revokeChatGPTCompanionConnection();
      await refresh();
      setMessage("ChatGPT access revoked. Your Tiny Titans animal and tracker records were not changed.");
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
          <p>
            Connect your Tiny Titans account to ChatGPT securely. Once linked, ChatGPT can use
            the Tiny Titans tools you approve to read keeper history and log records for you.
          </p>
        </div>
        <div className={`tt-gpt-status ${status?.connected && status.connectionMode === "oauth" ? "is-live" : ""}`}>
          <span>{statusLabel}</span>
          <strong>{status?.effectiveTier?.replaceAll("_", " ") || "free"}</strong>
        </div>
      </header>

      {message && <div className="tt-gpt-message success" role="status">{message}</div>}
      {error && <div className="tt-gpt-message error" role="alert">{error}</div>}

      {status?.connectionMode === "legacy_token" && (
        <div className="tt-gpt-message error" role="alert">
          This account still has the older one-time-token test connection. That token is no longer
          part of the normal setup. Disconnect it below, then reconnect through the OAuth flow.
        </div>
      )}

      <section className="tt-gpt-card tt-gpt-connect">
        <div>
          <p className="tt-gpt-kicker">CONNECT TO CHATGPT</p>
          <h2>{status?.connectionMode === "oauth" && status.connected ? "Your ChatGPT link is active" : "Link your account without copying a secret token"}</h2>
          <p className="tt-gpt-muted">
            Tiny Titans now uses OAuth 2.1 with PKCE. ChatGPT sends you back to Tiny Titans to sign
            in and approve permissions, then receives a revocable scoped access token automatically.
            Your Tiny Titans password is never shared with ChatGPT.
          </p>

          {status?.connected && (
            <div className="tt-gpt-facts">
              <span><strong>Connection</strong>{status.connectionMode === "oauth" ? "OAuth 2.1" : "Legacy test token"}</span>
              <span><strong>Last used</strong>{toDateLabel(status.lastUsedAt)}</span>
              <span><strong>Last tool</strong>{status.lastTool || "No tool call yet"}</span>
            </div>
          )}
        </div>

        <div className="tt-gpt-actions">
          <button className="tt-gpt-primary" type="button" onClick={openChatGPT}>
            Open ChatGPT
          </button>
          {status?.connected && (
            <button className="tt-gpt-danger" type="button" disabled={busy} onClick={() => setConfirmRevoke(true)}>
              Disconnect ChatGPT
            </button>
          )}
        </div>
      </section>

      <section className="tt-gpt-grid">
        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">HOW TO CONNECT DURING TESTING</p>
          <h2>Three steps, no API key</h2>
          <div className="tt-gpt-permissions">
            <div><TinyTitansIcon name="check" size={16} /><span><strong>1.</strong> Open ChatGPT and enable developer mode for custom apps if your ChatGPT plan/workspace supports it.</span></div>
            <div><TinyTitansIcon name="check" size={16} /><span><strong>2.</strong> Create an MCP/app connection and paste the Tiny Titans MCP address shown below.</span></div>
            <div><TinyTitansIcon name="check" size={16} /><span><strong>3.</strong> When ChatGPT asks you to connect, Tiny Titans opens this app again for permission approval. Approve it and you return to ChatGPT automatically.</span></div>
          </div>
          <p className="tt-gpt-muted">
            After the Tiny Titans plugin is published, normal users will install it from ChatGPT and
            complete the same secure account-linking flow without manually entering the MCP address.
          </p>
        </article>

        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">TINY TITANS MCP ADDRESS</p>
          <h2>Private testing endpoint</h2>
          <div className="tt-gpt-secret" role="region" aria-label="Tiny Titans MCP address">
            <code>{linkInfo?.mcpUrl || "Loading MCP address…"}</code>
            <div className="tt-gpt-actions">
              <button type="button" disabled={!linkInfo?.mcpUrl} onClick={() => void copyMcpUrl()}>
                {copied ? "Copied" : "Copy MCP address"}
              </button>
            </div>
          </div>
          <p className="tt-gpt-muted">
            This address is not a password. ChatGPT uses it to discover Tiny Titans tools and then
            starts the OAuth sign-in flow. Never paste a Tiny Titans account password or private token into ChatGPT.
          </p>
        </article>
      </section>

      <section className="tt-gpt-grid">
        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">CONVERSATIONAL KEEPING</p>
          <h2>What you can ask after linking</h2>
          <div className="tt-gpt-examples">
            {EXAMPLES.map((example) => <div key={example}><span aria-hidden="true">›</span><code>{example}</code></div>)}
          </div>
          <p className="tt-gpt-muted">
            Tiny Titans remains the source of truth. ChatGPT calls explicit Tiny Titans tools rather
            than receiving generic database access.
          </p>
        </article>

        <article className="tt-gpt-card">
          <p className="tt-gpt-kicker">PERMISSIONS</p>
          <h2>What the connection can do</h2>
          <div className="tt-gpt-permissions">
            {(status?.permissions ?? []).map((permission) => (
              <div key={permission}>
                <TinyTitansIcon name="check" size={16} />
                <span>{PERMISSION_LABELS[permission] ?? permission.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
          <p className="tt-gpt-muted">
            ChatGPT cannot perform arbitrary Firestore operations. The first release does not expose
            a general delete tool; undo is limited to reversible records created through Companion.
          </p>
        </article>
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
        <p className="tt-gpt-kicker">CONNECTION SECURITY</p>
        <h2>What happens behind the button</h2>
        <div className="tt-gpt-tool-grid">
          <span><TinyTitansIcon name="check" size={15} /> OAuth 2.1 authorization code flow</span>
          <span><TinyTitansIcon name="check" size={15} /> PKCE S256 protects the authorization code</span>
          <span><TinyTitansIcon name="check" size={15} /> Short-lived access tokens</span>
          <span><TinyTitansIcon name="check" size={15} /> Rotating refresh tokens</span>
          <span><TinyTitansIcon name="check" size={15} /> Per-tool scopes</span>
          <span><TinyTitansIcon name="check" size={15} /> Revocation from this screen</span>
        </div>
      </section>

      <ConfirmActionDialog
        open={confirmRevoke}
        title="Disconnect ChatGPT?"
        description="This revokes the Tiny Titans connection and its OAuth tokens. It does not delete any animal or tracker records."
        confirmLabel="Disconnect"
        busy={busy}
        destructive={false}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() => void revokeConnection()}
      />
    </main>
  );
}
