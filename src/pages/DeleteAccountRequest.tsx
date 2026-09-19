import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { requestAccountDeletion } from "../services/accountDeletionService";

export default function DeleteAccountRequest() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(""); setError("");
    try {
      setMessage(await requestAccountDeletion(email));
      setEmail("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not submit the deletion request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-container">
      <section className="personalisation-shell" aria-labelledby="delete-account-title">
        <p className="personalisation-eyebrow">Tiny Titans Account</p>
        <h1 id="delete-account-title">Request account deletion</h1>
        <p>Enter the email address associated with your Tiny Titans account. We will record the request securely and use it to handle account deletion.</p>
        <form className="personalisation-card" onSubmit={submit}>
          <label>
            Account email
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {error && <p role="alert">⚠️ {error}</p>}
          {message && <p className="personalisation-saved" role="status">✓ {message}</p>}
          <button className="personalisation-save" type="submit" disabled={busy}>
            {busy ? "Submitting request…" : "Request account deletion"}
          </button>
        </form>
        <section className="personalisation-card">
          <h2>Signed-in self-service</h2>
          <p>Signed-in users can permanently delete their account from Security after a recent sign-in. This is the fastest route and also protects against accidental deletion.</p>
          <Link className="personalisation-save" to="/account/security">Open Security</Link>
        </section>
        <p className="setup-help">Account deletion is permanent. Paid subscriptions are cancelled before deletion. Rescue organisation owners must transfer organisation ownership first.</p>
        <p className="setup-help"><Link to="/login">Return to sign in</Link></p>
      </section>
    </main>
  );
}
