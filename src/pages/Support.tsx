import { Link } from "react-router-dom";

export default function Support() {
  return (
    <main className="page-container">
      <section className="personalisation-shell" aria-labelledby="support-title">
        <p className="personalisation-eyebrow">Tiny Titans Keeper Companion</p>
        <h1 id="support-title">Support</h1>
        <p>Help with Tiny Titans accounts, keeper records, subscriptions and the ChatGPT integration.</p>

        <section className="personalisation-card">
          <h2>Contact</h2>
          <p>Email <a href="mailto:tinytitans.exotics@gmail.com">tinytitans.exotics@gmail.com</a> with the email address used for your Tiny Titans account and a description of the problem. Do not send passwords, OAuth tokens or payment card details.</p>
        </section>

        <section className="personalisation-card">
          <h2>ChatGPT connection help</h2>
          <p>The supported connection flow is: install Tiny Titans in ChatGPT, choose Connect, sign in to Tiny Titans if needed, review the requested access and approve the connection.</p>
          <p>If the connection stops working, disconnect Tiny Titans and connect it again. Reconnecting may be required after Tiny Titans adds a new permission or capability.</p>
          <p>Normal users should never be asked to copy a pairing code, API key, Firebase identifier or MCP URL into ChatGPT.</p>
        </section>

        <section className="personalisation-card">
          <h2>Account and privacy help</h2>
          <p>You can request account deletion at <Link to="/delete-account">Delete account</Link>. For information about personal data and connected services, read the <Link to="/privacy">Privacy Policy</Link>.</p>
        </section>

        <p className="setup-help"><Link to="/chatgpt">Tiny Titans for ChatGPT</Link> · <Link to="/terms">Terms of Service</Link></p>
      </section>
    </main>
  );
}
