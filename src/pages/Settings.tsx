import { useEffect, useState } from "react";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UnitSystem } from "../context/UnitContext";
import app from "../firebase/config";

const db = getFirestore(app);

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitSystem>(profile?.unitSystem ?? "metric");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setUnits(profile?.unitSystem ?? "metric"), [profile?.unitSystem]);

  async function saveUnits(next: UnitSystem) {
    if (!user || saving) return;
    setUnits(next); setSaving(true); setSaved(false);
    try {
      await setDoc(doc(db, "users", user.uid), { unitSystem: next, updatedAt: serverTimestamp() }, { merge: true });
      await refreshProfile(); setSaved(true);
    } catch (error) {
      console.error("Tiny Titans: unable to save unit preference", error);
      setUnits(profile?.unitSystem ?? "metric");
    } finally { setSaving(false); }
  }

  return <main className="page-container"><section className="personalisation-shell">
    <p className="personalisation-eyebrow">My Account</p><h1>⚙️ Settings</h1><p>Control how Tiny Titans displays information for you. Changes are saved to your account and follow you between devices.</p>
    <section className="personalisation-card"><h2>🔔 Notifications & Smart Reminders</h2><p>Configure push notifications, quiet hours, per-snake feeding reminder sequences, medication reminders and reminder history.</p><button className="account-button" type="button" onClick={() => navigate("/account/settings/notifications")}>Open Notifications & Reminders →</button></section>
    <section className="personalisation-card"><h2>📏 Measurement system</h2><p>Choose how weights, lengths, temperatures and other measurements are displayed. Your underlying records are never changed.</p>
      <div className="personalisation-grid"><button className={units === "metric" ? "selected" : ""} type="button" onClick={() => void saveUnits("metric")} disabled={saving}>🇬🇧 Metric<small>g · kg · cm · °C</small></button><button className={units === "imperial" ? "selected" : ""} type="button" onClick={() => void saveUnits("imperial")} disabled={saving}>🇺🇸 Imperial<small>oz · lb · in · °F</small></button></div>{saved && <p className="personalisation-saved">✓ Settings saved — displayed measurements will use {units === "imperial" ? "Imperial" : "Metric"} units.</p>}
    </section>
    <section className="personalisation-card"><h2>🎓 Learning & language</h2><p>Control your learning age, experience level and personalisation.</p><button className="account-button" type="button" onClick={() => navigate("/account/personalise")}>Open Personalisation →</button></section>
    <section className="personalisation-card"><h2>🧠 Explanations</h2><p>Use the floating <strong>?</strong> button anywhere in the app to turn on Explain This mode and get simpler explanations of unfamiliar terms.</p></section>
    <section className="personalisation-card"><h2>🔐 Account & security</h2><button className="account-button" type="button" onClick={() => navigate("/account/profile")}>Edit Profile →</button><button className="account-button" type="button" onClick={() => navigate("/account/security")}>Security →</button></section>
    <button className="personalisation-back" type="button" onClick={() => navigate("/account")}>← Back to My Account</button>
  </section></main>;
}
