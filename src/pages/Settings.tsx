import { useState } from "react";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { UnitSystem } from "../context/UnitContext";
import app from "../firebase/config";
import NotificationSettingsPanel from "../components/NotificationSettingsPanel";
import NotificationTestPanel from "../components/NotificationTestPanel";
import "../styles/settingsWorkspace.css";
import "../styles/notificationTest.css";

const db = getFirestore(app);

type HubCardProps = { icon: string; eyebrow: string; title: string; description: string; action: string; onClick: () => void };

function HubCard({ icon, eyebrow, title, description, action, onClick }: HubCardProps) {
  return <section className="tt-settings-card"><div className="tt-settings-card-icon" aria-hidden="true">{icon}</div><div><p className="tt-settings-eyebrow">{eyebrow}</p><h2>{title}</h2><p className="tt-settings-muted">{description}</p></div><button className="tt-settings-link" type="button" onClick={onClick}>{action} <span aria-hidden="true">→</span></button></section>;
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitSystem>(profile?.unitSystem ?? "metric");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveUnits(next: UnitSystem) {
    if (!user || saving) return;
    setUnits(next); setSaving(true); setSaved(false);
    try { await setDoc(doc(db, "users", user.uid), { unitSystem: next, updatedAt: serverTimestamp() }, { merge: true }); await refreshProfile(); setSaved(true); }
    catch (error) { console.error("Tiny Titans: unable to save unit preference", error); setUnits(profile?.unitSystem ?? "metric"); }
    finally { setSaving(false); }
  }

  return <main className="tt-settings-page">
    <section className="tt-settings-hero">
      <p className="tt-settings-eyebrow">My Account · Control centre</p>
      <h1>⚙️ Settings</h1>
      <p className="tt-settings-hero-copy">Everything that controls how Tiny Titans behaves, displays information and keeps you on top of your keeper routine.</p>
      <nav className="tt-settings-jump" aria-label="Settings sections"><a href="#notifications">🔔 Notifications</a><a href="#notification-test">🧪 Test Centre</a><a href="#display">📏 Display</a><a href="#keeper-tools">🦎 Keeper tools</a><a href="#account">🔐 Account</a></nav>
    </section>

    <section id="notifications" className="tt-settings-feature">
      <div className="tt-settings-feature-head"><div><p className="tt-settings-eyebrow">Priority control</p><h2>🔔 Notifications</h2><p className="tt-settings-muted">Turn device delivery on, then choose exactly which reminder streams you want.</p></div><span className="tt-settings-live">LIVE</span></div>
      <NotificationSettingsPanel />
    </section>

    <section id="notification-test" className="tt-settings-feature tt-settings-test-feature">
      <div className="tt-settings-feature-head"><div><p className="tt-settings-eyebrow">Delivery diagnostics</p><h2>🧪 Notification Test Centre</h2><p className="tt-settings-muted">This is deliberately separate from your reminder preferences: use it whenever you need to prove the notification system is actually delivering.</p></div><span className="tt-settings-test-badge">REAL PUSH</span></div>
      <div className="tt-settings-test-callout"><strong>Start here</strong><span>Leave Target account blank to send the test to this device.</span></div>
      <NotificationTestPanel />
    </section>

    <section id="display" className="tt-settings-section"><div className="tt-settings-section-head"><div><p className="tt-settings-eyebrow">Display & preferences</p><h2>📏 How Tiny Titans presents your records</h2></div></div>
      <section className="tt-settings-card tt-settings-units"><div className="tt-settings-card-icon" aria-hidden="true">📐</div><div><p className="tt-settings-eyebrow">Measurement system</p><h2>Choose your keeper units</h2><p className="tt-settings-muted">Your stored records remain canonical; this only changes how measurements are displayed.</p><div className="tt-settings-unit-grid"><button className={units === "metric" ? "selected" : ""} type="button" onClick={() => void saveUnits("metric")} disabled={saving}><strong>🇬🇧 Metric</strong><span>g · kg · cm · °C</span></button><button className={units === "imperial" ? "selected" : ""} type="button" onClick={() => void saveUnits("imperial")} disabled={saving}><strong>🇺🇸 Imperial</strong><span>oz · lb · in · °F</span></button></div>{saved && <p className="tt-settings-saved">✓ Display preference saved.</p>}</div></section>
    </section>

    <section id="keeper-tools" className="tt-settings-section"><div className="tt-settings-section-head"><div><p className="tt-settings-eyebrow">Keeper tools</p><h2>🦎 Your routine, grouped properly</h2></div></div><div className="tt-settings-grid"><HubCard icon="🧊" eyebrow="Feeding" title="Feeding preparation" description="Manage recurring preparation plans and feeding-day preparation tasks." action="Open preparation" onClick={() => navigate("/feeding/preparation")} /><HubCard icon="🎓" eyebrow="Learning" title="Personalisation" description="Adjust learning age, experience level and adaptive learning behaviour." action="Open personalisation" onClick={() => navigate("/account/personalise")} /></div></section>

    <section id="account" className="tt-settings-section"><div className="tt-settings-section-head"><div><p className="tt-settings-eyebrow">Account & privacy</p><h2>🔐 Account controls</h2></div></div><div className="tt-settings-grid"><HubCard icon="👤" eyebrow="Profile" title="Account profile" description="Change your profile details and account information." action="Edit profile" onClick={() => navigate("/account/profile")} /><HubCard icon="🛡️" eyebrow="Privacy" title="Data & Privacy" description="Review optional analytics, community location and product update permissions." action="Review privacy" onClick={() => navigate("/account/data-privacy")} /><HubCard icon="🔒" eyebrow="Security" title="Security" description="Manage security-related account controls." action="Open security" onClick={() => navigate("/account/security")} /></div></section>
    <button className="tt-settings-back" type="button" onClick={() => navigate("/account")}>← Back to My Account</button>
  </main>;
}
