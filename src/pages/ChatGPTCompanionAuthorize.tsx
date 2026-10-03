import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import {
  approveChatGPTCompanionAuthorization,
  type ChatGPTCompanionAuthorizationRequest,
} from "../services/chatgptCompanionService";
import "../styles/chatgptCompanion.css";

const SCOPE_LABELS: Record<string, string> = {
  profile: "Identify the Tiny Titans profile being connected",
  "animals.read": "Read animal names and profile basics",
  "records.read": "Read keeper tracker history",
  "records.write": "Create feeding, weight, shed, behaviour and health records",
  "actions.undo": "Undo records created through Tiny Titans Companion",
  offline_access: "Keep the ChatGPT connection signed in securely",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Tiny Titans could not approve this ChatGPT connection.";
}

export default function ChatGPTCompanionAuthorize() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const request = useMemo<ChatGPTCompanionAuthorizationRequest>(() => ({
    responseType: params.get("response_type") || "",
    clientId: params.get("client_id") || "",
    redirectUri: params.get("redirect_uri") || "",
    codeChallenge: params.get("code_challenge") || "",
    codeChallengeMethod: params.get("code_challenge_method") || "",
    resource: params.get("resource") || "",
    state: params.get("state") || "",
    scope: params.get("scope") || "",
  }), [params]);

  const scopes = useMemo(
    () => Array.from(new Set(request.scope.split(/\s+/).map((item) => item.trim()).filter(Boolean))),
    [request.scope],
  );

  const looksLikeChatGPT =
    request.responseType === "code" &&
    request.clientId === "https://chatgpt.com/oauth/client.json" &&
    request.redirectUri === "https://chatgpt.com/connector_platform_oauth_redirect" &&
    request.codeChallengeMethod === "S256" &&
    request.resource.includes("tinyTitansMcp/mcp");

  async function approve() {
    setBusy(true);
    setError("");
    try {
      const result = await approveChatGPTCompanionAuthorization(request);
      if (!result.redirectUrl) throw new Error("Tiny Titans did not receive a valid ChatGPT callback URL.");
      window.location.assign(result.redirectUrl);
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  return (
    <main className="tt-gpt-page">
      <header className="tt-gpt-hero">
        <div>
          <p className="tt-gpt-kicker">CHATGPT ACCOUNT LINKING</p>
          <h1><TinyTitansIcon name="titan" size={32} /> Connect Tiny Titans</h1>
          <p>
            ChatGPT is asking to use your Tiny Titans account. Review the permissions below,
            then approve the connection. Your Tiny Titans password is never shared with ChatGPT.
          </p>
        </div>
        <div className="tt-gpt-status">
          <span>Authorization</span>
          <strong>OAuth 2.1</strong>
        </div>
      </header>

      {error && <div className="tt-gpt-message error" role="alert">{error}</div>}

      <section className="tt-gpt-card">
        <p className="tt-gpt-kicker">WHAT CHATGPT IS REQUESTING</p>
        <h2>Permission review</h2>
        <div className="tt-gpt-permissions">
          {scopes.length ? scopes.map((scope) => (
            <div key={scope}>
              <TinyTitansIcon name="check" size={16} />
              <span>{SCOPE_LABELS[scope] || scope}</span>
            </div>
          )) : (
            <div>
              <TinyTitansIcon name="lock" size={16} />
              <span>No permissions were supplied by ChatGPT.</span>
            </div>
          )}
        </div>
        <p className="tt-gpt-muted">
          Tiny Titans only grants the scopes shown here. ChatGPT does not receive generic Firestore
          access, and it cannot arbitrarily delete your records.
        </p>
      </section>

      <section className="tt-gpt-card">
        <p className="tt-gpt-kicker">HOW THIS LINK WORKS</p>
        <h2>Your Tiny Titans account stays in control</h2>
        <div className="tt-gpt-tool-grid">
          <span><TinyTitansIcon name="check" size={15} /> Tiny Titans authenticates you</span>
          <span><TinyTitansIcon name="check" size={15} /> ChatGPT receives a scoped access token</span>
          <span><TinyTitansIcon name="check" size={15} /> Every keeper action is attributed and audited</span>
          <span><TinyTitansIcon name="check" size={15} /> Disconnecting revokes ChatGPT access</span>
        </div>
      </section>

      {!looksLikeChatGPT && (
        <div className="tt-gpt-message error" role="alert">
          This does not look like a supported ChatGPT authorization request. Return to ChatGPT and
          start the Tiny Titans connection again.
        </div>
      )}

      <section className="tt-gpt-card tt-gpt-connect">
        <div>
          <p className="tt-gpt-kicker">APPROVAL</p>
          <h2>Allow ChatGPT to connect?</h2>
          <p className="tt-gpt-muted">
            After approval you will return to ChatGPT automatically. You can disconnect the link
            at any time from Tiny Titans Settings → Integrations.
          </p>
        </div>
        <div className="tt-gpt-actions">
          <button
            className="tt-gpt-primary"
            type="button"
            disabled={busy || !looksLikeChatGPT}
            onClick={() => void approve()}
          >
            {busy ? "Connecting…" : "Approve and return to ChatGPT"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => navigate("/account/integrations/chatgpt")}
          >
            Cancel
          </button>
        </div>
      </section>
    </main>
  );
}
