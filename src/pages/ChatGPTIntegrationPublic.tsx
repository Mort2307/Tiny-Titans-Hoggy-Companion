import { Link } from "react-router-dom";

const PLUGIN_URL = "https://chatgpt.com/plugins/plugins_6ac379fc8e1c8191b952bfbe6c5c0f15";

export default function ChatGPTIntegrationPublic() {
  return (
    <main className="page-container">
      <section className="personalisation-shell" aria-labelledby="chatgpt-integration-title">
        <p className="personalisation-eyebrow">Tiny Titans Keeper Companion</p>
        <h1 id="chatgpt-integration-title">Tiny Titans for ChatGPT</h1>
        <p>Connect your Tiny Titans keeper account to ChatGPT so you can ask naturally about your animals and, when you request it, create supported keeper records and reminders.</p>

        <section className="personalisation-card">
          <h2>Simple account linking</h2>
          <p><strong>Install Tiny Titans, choose Connect, sign in to Tiny Titans, approve the connection, then return to ChatGPT.</strong></p>
          <p>No pairing codes, API keys, Firebase IDs or MCP server addresses are required from normal users.</p>
          <p><a href={PLUGIN_URL} target="_blank" rel="noreferrer">Open Tiny Titans in ChatGPT</a></p>
        </section>

        <section className="personalisation-card">
          <h2>What ChatGPT can do</h2>
          <p>Depending on the permissions you approve, ChatGPT can read animal profiles, weights, feeding, sheds and recent keeper activity; read and create reminders; create supported keeper records; and create or update supported animal profile information.</p>
          <p>Tiny Titans exposes specific application actions rather than generic database access.</p>
        </section>

        <section className="personalisation-card">
          <h2>Your control</h2>
          <p>You choose whether to connect the integration. Access is scoped to the authenticated Tiny Titans account and can be disconnected from Tiny Titans. Existing keeper records remain in Tiny Titans when a ChatGPT connection is revoked.</p>
        </section>

        <section className="personalisation-card">
          <h2>Help and policies</h2>
          <p><Link to="/support">Support</Link> · <Link to="/privacy">Privacy Policy</Link> · <Link to="/terms">Terms of Service</Link></p>
        </section>

        <p className="setup-help"><Link to="/login">Open Tiny Titans</Link></p>
      </section>
    </main>
  );
}
