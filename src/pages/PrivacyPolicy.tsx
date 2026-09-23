import { Link } from "react-router-dom";

const lastUpdated = "19 September 2026";

export default function PrivacyPolicy() {
  return (
    <main className="page-container">
      <section className="personalisation-shell" aria-labelledby="privacy-policy-title">
        <p className="personalisation-eyebrow">Tiny Titans Keeper Companion</p>
        <h1 id="privacy-policy-title">Privacy Policy</h1>
        <p>Last updated {lastUpdated}</p>

        <section className="personalisation-card">
          <h2>What Tiny Titans processes</h2>
          <p>Depending on the features you use, Tiny Titans processes your account identity and profile information, reptile records, husbandry and tracker records, uploaded photographs or other media, community submissions, creator or rescue workspace information, reminders and notification preferences, and technical information needed to operate the service.</p>
        </section>

        <section className="personalisation-card">
          <h2>Optional intelligence and analytics</h2>
          <p>Titan Intelligence is opt-in. Optional community husbandry contribution and anonymous product analytics can be controlled from Data &amp; Privacy. Approximate community location is also optional and is intended to use a coarse area rather than an exact home position.</p>
          <p>Turning optional contribution off does not delete your ordinary keeper records.</p>
        </section>

        <section className="personalisation-card">
          <h2>Service providers</h2>
          <p>Tiny Titans uses Firebase services for authentication, database, storage and server-side application functions. Paid subscriptions use Stripe on the web service. Payment credentials are handled by the relevant payment provider rather than stored as ordinary Tiny Titans account fields.</p>
        </section>

        <section className="personalisation-card">
          <h2>Open-source icon attribution</h2>
          <p>The animated My Animals navigation icon uses animal artwork from Game-icons.net by Lorc, licensed under CC BY 3.0. This credit is provided in accordance with the icon licence.</p>
          <p><a href="https://game-icons.net/" target="_blank" rel="noreferrer">Game-icons.net</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a></p>
        </section>

        <section className="personalisation-card">
          <h2>Your controls</h2>
          <p>You can review optional privacy choices from Data &amp; Privacy. You can also permanently delete your account from Security after a recent sign-in, or use the external deletion request page when you cannot access the app.</p>
          <p><Link to="/account/data-privacy">Open Data &amp; Privacy</Link> · <Link to="/delete-account">Request account deletion</Link></p>
        </section>

        <section className="personalisation-card">
          <h2>Deletion and retention</h2>
          <p>Account deletion is intended to remove the associated personal account data and personal uploads controlled by Tiny Titans. Certain operational, security, financial or legal records may need limited retention where required for legitimate operational or legal purposes; any such retention should be identified in the relevant record or disclosure.</p>
          <p>Deleting an account that owns a Rescue Centre organisation is blocked until organisation ownership has been transferred so that shared rescue data is not silently lost.</p>
        </section>

        <section className="personalisation-card">
          <h2>Contact</h2>
          <p>For privacy or account-deletion questions, contact Tiny Titans at <a href="mailto:tinytitans.exotics@gmail.com">tinytitans.exotics@gmail.com</a>.</p>
        </section>

        <p className="setup-help">This policy describes the current Tiny Titans implementation and should be reviewed alongside the final Google Play Data Safety submission before release.</p>
        <p className="setup-help"><Link to="/login">Return to sign in</Link></p>
      </section>
    </main>
  );
}
