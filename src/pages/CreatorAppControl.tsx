import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_CREATOR_APP_SETTINGS, getCreatorAppSettings, saveCreatorAppSettings, type CreatorAppSettings, type CreatorFeatureKey } from "../services/creatorControlService";
import "../styles/CreatorTools.css";

type Control = { to: string; icon: string; title: string; description: string };
const controls: Control[] = [
  { to: "/morph-library", icon: "🧬", title: "Morph & Genetics", description: "Open the live genetics experience and database." },
  { to: "/knowledge-base", icon: "📚", title: "Knowledge Base", description: "Review the live keeper education experience." },
  { to: "/challenge", icon: "🏆", title: "Titans Challenge", description: "Review learning questions, sessions and achievements." },
  { to: "/creator/moderation", icon: "🛡️", title: "Moderation", description: "Reports, morph submissions and applications." },
  { to: "/creator/wall-of-titans", icon: "🏆", title: "Wall of Titans", description: "Supporter identities, social links, tiers and dates." },
  { to: "/creator/community", icon: "🌍", title: "Community Globe", description: "Consenting community locations and geographic aggregates." },
  { to: "/creator/admin", icon: "👥", title: "Admin Management", description: "Everyday administrator access and role management." },
  { to: "/creator/privacy-data", icon: "🔐", title: "Privacy & Data", description: "Consent and community-data controls." },
  { to: "/become-a-titan", icon: "💚", title: "Titan Support", description: "Public supporter experience and Stripe entry point." },
  { to: "/creator/feeding", icon: "🍽️", title: "Feeding Analytics", description: "Feeding activity only." },
  { to: "/creator/shedding", icon: "🐍", title: "Shed Analytics", description: "Shed activity only." },
  { to: "/creator/weights", icon: "⚖️", title: "Weight Analytics", description: "Weight activity only." },
  { to: "/creator/genetics", icon: "🧬", title: "Genetics Analytics", description: "Genetics activity only." },
];

const featureRows: Array<{ key: CreatorFeatureKey; icon: string; label: string; description: string }> = [
  ["communityGlobe", "🌍", "Community Globe", "Community location contribution and globe display."],
  ["wallOfTitans", "🏆", "Wall of Titans", "Public supporter wall and supporter recognition."],
  ["titanSupport", "💚", "Titan Support", "Become a Titan supporter and Stripe checkout."],
  ["feedingTracker", "🍽️", "Feeding Tracker", "Keeper feeding tracking."],
  ["shedTracker", "🐍", "Shed Tracker", "Keeper shed tracking."],
  ["weightTracker", "⚖️", "Weight Tracker", "Keeper weight and growth tracking."],
  ["geneticsCalculator", "🧬", "Genetics Calculator", "Morph and genetics calculation experience."],
  ["knowledgeBase", "📚", "Knowledge Base", "Keeper education content."],
  ["titansChallenge", "🏆", "Titans Challenge", "Learning challenges and achievements."],
  ["morphSubmissions", "📷", "Morph Image Submissions", "Community morph-image submission flow."],
].map(([key, icon, label, description]) => ({ key: key as CreatorFeatureKey, icon: icon as string, label: label as string, description: description as string }));

export default function CreatorAppControl() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<CreatorAppSettings>(DEFAULT_CREATOR_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setSettings(await getCreatorAppSettings()); }
    catch (e) { setError(e instanceof Error ? e.message : "Creator app settings could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save(next: CreatorAppSettings) {
    if (!user) return;
    setSaving(true); setError(""); setMessage("");
    try { await saveCreatorAppSettings(next, user.uid); setSettings(next); setMessage("Live app control settings saved."); }
    catch (e) { setError(e instanceof Error ? e.message : "Creator app settings could not be saved."); }
    finally { setSaving(false); }
  }

  return <main className="creator-admin-page">
    <header className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>⚙️ App Control</h1><p>Live application controls, feature availability and direct access to every Creator-managed surface.</p></div><div className="creator-header-actions"><button type="button" onClick={() => navigate("/creator")}>← Creator Hub</button><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button></div></header>
    {message && <div className="creator-success" role="status">{message}</div>}
    {error && <div className="creator-error" role="alert">{error}</div>}
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">LIVE APP SWITCHBOARD</span><h2>Feature availability</h2><p>These switches are stored as Creator-controlled application settings. Security-sensitive permissions remain server-enforced.</p></div></div>{loading ? <div className="creator-loading">Loading live controls…</div> : <div className="creator-list">{featureRows.map((row) => <article className="creator-list-card" key={row.key}><div className="creator-list-top"><div><span className="creator-badge">{row.icon}</span><h3>{row.label}</h3></div><small>{row.description}</small></div><div className="creator-actions"><button type="button" disabled={saving} onClick={() => void save({ ...settings, [row.key]: !settings[row.key] })}>{settings[row.key] ? "Enabled — turn off" : "Disabled — turn on"}</button></div></article>)}</div>}</section>
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">MAINTENANCE</span><h2>Maintenance mode</h2><p>Use this only for planned outages. The setting is persisted centrally so it can be consumed by the live app shell.</p></div></div><label className="creator-search"><span>Maintenance message</span><input value={settings.maintenanceMessage} onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })} /></label><button type="button" disabled={saving || loading} onClick={() => void save({ ...settings, maintenanceMode: !settings.maintenanceMode })}>{settings.maintenanceMode ? "Maintenance mode ON — turn off" : "Maintenance mode OFF — turn on"}</button><button type="button" disabled={saving || loading} onClick={() => void save(settings)}>{saving ? "Saving…" : "Save maintenance message"}</button></section>
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR SURFACES</span><h2>Open a dedicated management surface</h2><p>Every destination below is a full-screen page and is scoped to its own job.</p></div></div><div className="creator-global-grid">{controls.map((control) => <Link className="creator-global-card creator-hub-navigation-card" key={control.to} to={control.to}><span>{control.icon}</span><label>{control.title}</label><small>{control.description}</small><b>Open full screen →</b></Link>)}</div></section>
  </main>;
}
