import { useState } from "react";
import { sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase/config";

export default function Security() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.email) return;
    if (password.length < 6) { setError("Your password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      await updatePassword(user, password);
      setPassword(""); setConfirm(""); setMessage("Password changed successfully.");
    } catch (err) {
      console.error("Tiny Titans: password change failed", err);
      setError("For security, Firebase may require you to sign in again before changing your password. Use the password-reset option below if this happens.");
    } finally { setSaving(false); }
  }

  async function sendReset() {
    if (!user?.email) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage(`Password reset instructions were sent to ${user.email}.`);
    } catch (err) {
      console.error("Tiny Titans: password reset failed", err);
      setError("We couldn't send the password reset email. Please try again.");
    } finally { setSaving(false); }
  }

  return <main className="page-container"><section className="personalisation-shell">
    <p className="personalisation-eyebrow">My Account</p><h1>Security</h1><p>Manage the security of your Tiny Titans account. Your password is handled by Firebase Authentication and is never stored in your profile.</p>
    <section className="personalisation-card"><h2>Account email</h2><div className="account-detail"><span>Email</span><strong>{user?.email ?? "Not available"}</strong></div></section>
    <form className="personalisation-card" onSubmit={changePassword}><h2>Change password</h2>
      <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label>
      <label>Confirm new password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={6} /></label>
      {error && <p role="alert">⚠️ {error}</p>}{message && <p className="personalisation-saved">✓ {message}</p>}
      <button className="personalisation-save" type="submit" disabled={saving}>{saving ? "Saving…" : "Change password"}</button>
    </form>
    <section className="personalisation-card"><h2>Forgotten password</h2><p>Send a secure password-reset email to the address on your account.</p><button className="personalisation-save" type="button" onClick={() => void sendReset()} disabled={saving}>📧 Send password reset email</button></section>
    <button className="personalisation-back" type="button" onClick={() => navigate("/account")}>← Back to My Account</button>
  </section></main>;
}
