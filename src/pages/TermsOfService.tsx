import { Link } from "react-router-dom";

const lastUpdated = "5 October 2026";

export default function TermsOfService() {
  return (
    <main className="page-container">
      <section className="personalisation-shell" aria-labelledby="terms-title">
        <p className="personalisation-eyebrow">Tiny Titans Keeper Companion</p>
        <h1 id="terms-title">Terms of Service</h1>
        <p>Last updated {lastUpdated}</p>

        <section className="personalisation-card">
          <h2>Using Tiny Titans</h2>
          <p>These terms apply when you use Tiny Titans Keeper Companion, including its keeper tools, paid features and optional ChatGPT integration. You are responsible for information you add to your account and for keeping your sign-in credentials secure.</p>
        </section>

        <section className="personalisation-card">
          <h2>Keeper information</h2>
          <p>Tiny Titans is a record-keeping and husbandry support service. Information in the service is not a substitute for veterinary diagnosis or treatment. For an animal that is ill, injured or in distress, seek an appropriately qualified veterinary professional.</p>
        </section>

        <section className="personalisation-card">
          <h2>ChatGPT integration</h2>
          <p>The ChatGPT integration is optional. If you connect it, Tiny Titans may allow ChatGPT to perform only the specific read or write actions covered by the permissions you approve. You remain responsible for reviewing requests that create or change keeper records.</p>
          <p>You can revoke the connection. Revoking ChatGPT access does not itself delete your existing Tiny Titans keeper records.</p>
        </section>

        <section className="personalisation-card">
          <h2>Acceptable use</h2>
          <p>Do not use Tiny Titans to access another person's account without permission, interfere with the service, bypass access controls, distribute malicious content, or use the service in a way that is unlawful or materially harms other users or animals.</p>
        </section>

        <section className="personalisation-card">
          <h2>Availability and changes</h2>
          <p>Features may change as Tiny Titans develops. We aim to keep the service available and data handling reliable, but uninterrupted availability cannot be guaranteed. Material changes to these terms should be reflected by updating this page and its revision date.</p>
        </section>

        <section className="personalisation-card">
          <h2>Accounts, subscriptions and termination</h2>
          <p>Paid features are available only while the relevant subscription or entitlement is active. You may stop using Tiny Titans or request account deletion. Tiny Titans may restrict access where necessary to protect the service, other users or comply with legal obligations.</p>
        </section>

        <section className="personalisation-card">
          <h2>Contact</h2>
          <p>Questions about these terms can be sent to <a href="mailto:tinytitans.exotics@gmail.com">tinytitans.exotics@gmail.com</a>.</p>
        </section>

        <p className="setup-help"><Link to="/privacy">Privacy Policy</Link> · <Link to="/support">Support</Link> · <Link to="/chatgpt">Tiny Titans for ChatGPT</Link></p>
      </section>
    </main>
  );
}
