import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getPaidAccess } from "../services/paidTierService";
import { getPaidBusinessWorkspace, savePaidBusinessWorkspace, upsertPaidTeamMember, removePaidTeamMember, upsertPaidAutomation, removePaidAutomation, createPaidApiKey, revokePaidApiKey } from "../services/paidBusinessService";
import { getUserSnakes } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import PaidTierGate from "../components/PaidTierGate";
import { getPaidTierDefinition, type PaidEntitlement } from "../config/paidTiers";
import { useAuth } from "../context/useAuth";
import "../styles/PaidFeatureWorkspace.css";

type FeatureConfig = {
  entitlement: PaidEntitlement;
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  section?: "analytics" | "export" | "seller" | "marketplace" | "business" | "team" | "automation" | "support" | "api" | "branding";
};

const FEATURES: Record<string, FeatureConfig> = {
  "/paid/analytics": { entitlement: "advanced_analytics", title: "Advanced Analytics", eyebrow: "Titan Pro · Business", description: "Turn your keeper records into useful trends without replacing the underlying records or inventing missing data.", icon: "📊", section: "analytics" },
  "/paid/timeline": { entitlement: "advanced_timeline", title: "Advanced Timeline", eyebrow: "Titan Pro · Business", description: "A dedicated paid feature home for deeper animal history, connected records and keeper context.", icon: "🗓️" },
  "/paid/seller": { entitlement: "seller_profile", title: "Seller Profile", eyebrow: "Titan Seller · Business", description: "Build the professional identity buyers and keepers see when they discover your reptiles.", icon: "🏪", section: "seller" },
  "/paid/marketplace": { entitlement: "marketplace_seller", title: "Marketplace Seller Tools", eyebrow: "Titan Seller · Business", description: "Control how your marketplace presence is presented, what contact details are visible and whether you are accepting enquiries.", icon: "🛒", section: "marketplace" },
  "/paid/business": { entitlement: "business_reporting", title: "Business Reporting", eyebrow: "Business", description: "Set up a business reporting workspace around your collection, workflow and operating rhythm.", icon: "📈", section: "business" },
  "/paid/team": { entitlement: "multi_user", title: "Team Workspace", eyebrow: "Business", description: "Invite trusted team members and keep their access separate from your personal keeper account.", icon: "👥", section: "team" },
  "/paid/automation": { entitlement: "automation", title: "Workflow Automation", eyebrow: "Business Plus · Advanced", description: "Create simple trigger → action rules for routine operational work. Automation stays explicit and reversible.", icon: "⚙️", section: "automation" },
  "/paid/support": { entitlement: "priority_support", title: "Priority Support", eyebrow: "Business Plus · Advanced", description: "A dedicated support entry point for business-tier customers, while keeping ordinary community support available to everyone.", icon: "🎧", section: "support" },
  "/paid/api": { entitlement: "api_access", title: "API Access", eyebrow: "Business Advanced", description: "Issue and revoke scoped API credentials without exposing them in the browser after creation.", icon: "🔑", section: "api" },
  "/paid/branding": { entitlement: "custom_branding", title: "Custom Branding", eyebrow: "Business Advanced", description: "Set the business-facing name, accent and tagline used by your future branded surfaces.", icon: "🎨", section: "branding" },
};

const SUPPORT_LINKS = [
  { label: "View my reports", path: "/my-issue-reports", description: "See existing bug reports and conversations." },
  { label: "Report a problem", path: "/report-bug", description: "Create a reproducible issue for the Tiny Titans team." },
  { label: "Send feedback", path: "/feedback", description: "Product ideas stay separate from bug reports." },
];

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
function humanize(value: string): string { return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function PaidHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tier, setTier] = useState("free");
  const [effectiveTier, setEffectiveTier] = useState("free");
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; let active = true; void getPaidAccess(user.uid).then((access) => { if (!active) return; setTier(access.actualTier); setEffectiveTier(access.effectiveTier); }).catch(() => undefined).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [user]);
  const definition = getPaidTierDefinition(effectiveTier as Parameters<typeof getPaidTierDefinition>[0]);
  return <section className="paid-workspace-page"><header className="paid-workspace-hero"><div><span className="paid-workspace-kicker">Titan paid features</span><h1>Paid Feature Centre</h1><p>Every paid capability has a proper home. Locked features stay visible so you can see exactly what each tier unlocks, while authorised testers can exercise the real product without billing.</p></div><div className="paid-access-pill"><span>Actual tier</span><strong>{loading ? "Checking…" : getPaidTierDefinition(tier as Parameters<typeof getPaidTierDefinition>[0]).name}</strong><small>Effective access: {loading ? "Checking…" : definition.name}</small></div></header><div className="paid-workspace-actions"><button type="button" onClick={() => navigate("/plans")}>Compare all plans</button><button type="button" onClick={() => navigate("/account/billing")}>Billing &amp; access</button></div><div className="paid-feature-grid">{Object.entries(FEATURES).map(([path, feature]) => <FeatureTile key={path} path={path} feature={feature}/>)}</div><div className="paid-existing-grid"><article><span>🧠</span><div><h2>Titan Intelligence</h2><p>The existing intelligence layer is now one of the core paid-product surfaces.</p><Link to="/titan-intelligence">Open Titan Intelligence →</Link></div></article><article><span>🧬</span><div><h2>Breeding Suite</h2><p>Use the existing breeding planner, readiness, timeline and production workflows under the business entitlement.</p><Link to="/breeding">Open Breeding Suite →</Link></div></article><article><span>🏠</span><div><h2>Reptile Room</h2><p>Keep your visual room and vivarium tools connected to your collection.</p><Link to="/reptile-room">Open Reptile Room →</Link></div></article><article><span>🧬</span><div><h2>Morph Intelligence</h2><p>Your existing species-aware morph library remains the foundation for advanced morph tooling.</p><Link to="/morph-library">Open Morph Library →</Link></div></article></div></section>;
}

function FeatureTile({ path, feature }: { path: string; feature: FeatureConfig }) {
  const [allowed, setAllowed] = useState(false);
  const { user } = useAuth();
  useEffect(() => { if (!user) return; let active = true; void getPaidAccess(user.uid).then((access) => { if (!active) return; const def = getPaidTierDefinition(access.effectiveTier as Parameters<typeof getPaidTierDefinition>[0]); setAllowed(def.entitlements.includes(feature.entitlement)); }).catch(() => setAllowed(false)); return () => { active = false; }; }, [user, feature.entitlement]);
  return <Link className={`paid-feature-tile${allowed ? " is-available" : ""}`} to={path}><span className="paid-feature-icon" aria-hidden="true">{feature.icon}</span><span className="paid-feature-copy"><strong>{feature.title}</strong><small>{feature.description}</small><em>{allowed ? "Included in your effective access" : "See requirement &amp; test/upgrade"}</em></span><span aria-hidden="true">→</span></Link>;
}

function AnalyticsFeature() {
  const { user } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!user) return; let active = true; void getUserSnakes(user.uid).then((items) => { if (active) setSnakes(items); }).catch((err) => { if (active) setError(errorMessage(err)); }); return () => { active = false; }; }, [user]);
  const summary = useMemo(() => { const weights = snakes.map((snake) => Number(snake.weight)).filter(Number.isFinite); const feeds = snakes.reduce((total, snake) => total + (snake.feedingHistory?.length ?? 0), 0); const sheds = snakes.reduce((total, snake) => total + (snake.shedHistory?.length ?? 0), 0); return { count: snakes.length, averageWeight: weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0, feeds, sheds }; }, [snakes]);
  return <FeatureScaffold title="Advanced Analytics" icon="📊" description="A transparent collection view built from your actual stored records."><div className="metric-grid"><Metric label="Reptiles" value={String(summary.count)}/><Metric label="Average current weight" value={summary.averageWeight ? `${summary.averageWeight.toFixed(1)} g` : "—"}/><Metric label="Feeding records" value={String(summary.feeds)}/><Metric label="Shed records" value={String(summary.sheds)}/></div>{error && <div className="paid-inline-error">{error}</div>}<div className="paid-info-panel"><h2>What this layer deliberately does</h2><p>It summarises records that already exist in Tiny Titans. It does not turn a missing record into an assumption, and it does not diagnose animals from a graph.</p><Link to="/snakes">Open collection records →</Link></div></FeatureScaffold>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>; }

function DataExportFeature() {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState("");
  async function exportData() { if (!user) return; setStatus("Preparing export…"); try { const snakes = await getUserSnakes(user.uid); const payload = { exportedAt: new Date().toISOString(), user: { uid: user.uid, email: user.email ?? null }, profile: profile ?? null, snakes, localStorageKeys: Object.keys(localStorage).filter((key) => key.startsWith("tinyTitans.")) }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `tiny-titans-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setStatus("Export created on this device."); } catch (error) { setStatus(errorMessage(error)); } }
  return <FeatureScaffold title="Data Export" icon="⬇️" description="Export the core account and collection data Tiny Titans can currently assemble for you in one portable JSON file."><button className="paid-primary-action" type="button" onClick={exportData}>Create JSON Export</button><p className="paid-status-text" aria-live="polite">{status}</p><div className="paid-info-panel"><h2>What is included</h2><p>Your account identifier, current profile snapshot, reptile records available to your account, and Tiny Titans local preferences. This is intentionally explicit about what the export contains.</p></div></FeatureScaffold>;
}

function SettingsForm({ section, title, description, initial, fields }: { section: "seller" | "marketplace" | "business" | "branding"; title: string; description: string; initial: Record<string, unknown>; fields: Array<{ key: string; label: string; type?: "text" | "textarea" | "checkbox"; placeholder?: string }> }) {
  const [form, setForm] = useState<Record<string, unknown>>(initial); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => setForm(initial), [JSON.stringify(initial)]);
  async function save() { setLoading(true); setMessage(""); try { await savePaidBusinessWorkspace(section, form); setMessage("Saved."); } catch (error) { setMessage(errorMessage(error)); } finally { setLoading(false); } }
  return <FeatureScaffold title={title} icon={section === "seller" ? "🏪" : section === "marketplace" ? "🛒" : section === "branding" ? "🎨" : "📈"} description={description}><div className="paid-form-grid">{fields.map((field) => <label key={field.key}><span>{field.label}</span>{field.type === "textarea" ? <textarea value={String(form[field.key] ?? "")} placeholder={field.placeholder} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}/> : field.type === "checkbox" ? <input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))}/> : <input value={String(form[field.key] ?? "")} placeholder={field.placeholder} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}/>}</label>)}</div><button className="paid-primary-action" type="button" disabled={loading} onClick={save}>{loading ? "Saving…" : "Save changes"}</button><p className="paid-status-text" aria-live="polite">{message}</p></FeatureScaffold>;
}

function WorkspaceFeature({ feature }: { feature: FeatureConfig }) {
  const [workspace, setWorkspace] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const section = feature.section!;
  useEffect(() => { let active = true; setLoading(true); void getPaidBusinessWorkspace(section).then((result) => { if (active) setWorkspace(result.workspace ?? {}); }).catch((err) => { if (active) setError(errorMessage(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [section]);
  if (loading) return <FeatureScaffold title={feature.title} icon={feature.icon} description={feature.description}><p>Loading your workspace…</p></FeatureScaffold>;
  if (error) return <FeatureScaffold title={feature.title} icon={feature.icon} description={feature.description}><div className="paid-inline-error">{error}</div></FeatureScaffold>;
  if (section === "seller") return <SettingsForm section="seller" title={feature.title} description={feature.description} initial={(workspace.sellerProfile as Record<string, unknown>) ?? { acceptingEnquiries: true }} fields={[{ key: "businessName", label: "Business name" }, { key: "displayName", label: "Public display name" }, { key: "bio", label: "About you", type: "textarea" }, { key: "location", label: "Location" }, { key: "website", label: "Website" }, { key: "contactEmail", label: "Contact email" }, { key: "acceptingEnquiries", label: "Accepting enquiries", type: "checkbox" }]}/>;
  if (section === "marketplace") return <SettingsForm section="marketplace" title={feature.title} description={feature.description} initial={(workspace.marketplace as Record<string, unknown>) ?? { enabled: false, currency: "GBP", showLocation: true, showContactEmail: true }} fields={[{ key: "enabled", label: "Marketplace seller presence", type: "checkbox" }, { key: "currency", label: "Display currency" }, { key: "showLocation", label: "Show location", type: "checkbox" }, { key: "showContactEmail", label: "Show contact email", type: "checkbox" }, { key: "sellerNote", label: "Seller note", type: "textarea" }]}/>;
  if (section === "business") return <SettingsForm section="business" title={feature.title} description={feature.description} initial={(workspace.business as Record<string, unknown>) ?? { reportingStartDay: "monday", reportingTimezone: "Europe/London", enabledReports: ["collection", "weights", "feeding", "sheds"] }} fields={[{ key: "businessName", label: "Business name" }, { key: "reportingStartDay", label: "Reporting week starts" }, { key: "reportingTimezone", label: "Reporting timezone" }, { key: "enabledReports", label: "Enabled reports (comma separated)" }]}/>;
  if (section === "branding") return <SettingsForm section="branding" title={feature.title} description={feature.description} initial={(workspace.branding as Record<string, unknown>) ?? { accentHex: "#8fd1b6" }} fields={[{ key: "displayName", label: "Brand display name" }, { key: "accentHex", label: "Accent colour" }, { key: "tagline", label: "Tagline" }, { key: "footerText", label: "Footer text" }]}/>;
  if (section === "support") return <FeatureScaffold title={feature.title} icon={feature.icon} description={feature.description}><div className="paid-link-list">{SUPPORT_LINKS.map((link) => <Link key={link.path} to={link.path}><strong>{link.label}</strong><span>{link.description}</span>→</Link>)}</div><div className="paid-info-panel"><h2>Priority means routing, not a separate support universe</h2><p>Your existing Tiny Titans support/reporting system remains the source of truth. The paid entitlement identifies the business priority path.</p></div></FeatureScaffold>;
  return <TeamOrAutomationOrApi section={section}/>;
}

function TeamOrAutomationOrApi({ section }: { section: "team" | "automation" | "api" }) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [role, setRole] = useState("member");
  const [automationName, setAutomationName] = useState(""); const [trigger, setTrigger] = useState("new record"); const [action, setAction] = useState("create reminder"); const [apiName, setApiName] = useState(""); const [newSecret, setNewSecret] = useState("");
  const refresh = () => { setLoading(true); void getPaidBusinessWorkspace(section).then((result) => { setItems(section === "team" ? result.teamMembers : section === "automation" ? result.automations : result.apiKeys); setError(null); }).catch((err) => setError(errorMessage(err))).finally(() => setLoading(false)); };
  useEffect(() => refresh(), [section]);
  async function addTeam() { try { await upsertPaidTeamMember({ email, displayName: name, role }); setEmail(""); setName(""); refresh(); } catch (err) { setError(errorMessage(err)); } }
  async function addAutomation() { try { await upsertPaidAutomation({ name: automationName, trigger, action, enabled: true }); setAutomationName(""); refresh(); } catch (err) { setError(errorMessage(err)); } }
  async function addKey() { try { const result = await createPaidApiKey(apiName || "Tiny Titans API key"); setNewSecret(result.secret); setApiName(""); refresh(); } catch (err) { setError(errorMessage(err)); } }
  if (loading) return <FeatureScaffold title={section === "team" ? "Team Workspace" : section === "automation" ? "Workflow Automation" : "API Access"} icon={section === "team" ? "👥" : section === "automation" ? "⚙️" : "🔑"} description="Loading your paid workspace…"><p>Loading…</p></FeatureScaffold>;
  return <FeatureScaffold title={section === "team" ? "Team Workspace" : section === "automation" ? "Workflow Automation" : "API Access"} icon={section === "team" ? "👥" : section === "automation" ? "⚙️" : "🔑"} description={section === "team" ? "Invite business collaborators and manage operational roles." : section === "automation" ? "Keep recurring workflows explicit, visible and reversible." : "Manage machine credentials securely; secrets are only returned once on creation."}>{error && <div className="paid-inline-error">{error}</div>}{section === "team" && <><div className="paid-inline-form"><input aria-label="Member name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}/><input aria-label="Member email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}/><select value={role} onChange={(e) => setRole(e.target.value)}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option></select><button className="paid-primary-action" type="button" onClick={addTeam}>Invite</button></div><div className="paid-list">{items.map((item) => <div key={String(item.id)}><span><strong>{String(item.displayName || item.email)}</strong><small>{String(item.email)} · {humanize(String(item.role || "member"))}</small></span><button type="button" onClick={async () => { await removePaidTeamMember(String(item.id)); refresh(); }}>Remove</button></div>)}</div></>}{section === "automation" && <><div className="paid-inline-form"><input placeholder="Rule name" value={automationName} onChange={(e) => setAutomationName(e.target.value)}/><input placeholder="Trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}/><input placeholder="Action" value={action} onChange={(e) => setAction(e.target.value)}/><button className="paid-primary-action" type="button" onClick={addAutomation}>Add rule</button></div><div className="paid-list">{items.map((item) => <div key={String(item.id)}><span><strong>{String(item.name)}</strong><small>{String(item.trigger)} → {String(item.action)} · {item.enabled ? "Enabled" : "Disabled"}</small></span><button type="button" onClick={async () => { await removePaidAutomation(String(item.id)); refresh(); }}>Remove</button></div>)}</div></>}{section === "api" && <><div className="paid-inline-form"><input placeholder="Key name" value={apiName} onChange={(e) => setApiName(e.target.value)}/><button className="paid-primary-action" type="button" onClick={addKey}>Create API key</button></div>{newSecret && <div className="paid-secret"><strong>Copy this secret now.</strong><code>{newSecret}</code><span>It will not be shown again.</span></div>}<div className="paid-list">{items.map((item) => <div key={String(item.id)}><span><strong>{String(item.name)}</strong><small>{String(item.prefix)}… · {item.revoked ? "Revoked" : "Active"}</small></span>{!item.revoked && <button type="button" onClick={async () => { await revokePaidApiKey(String(item.id)); setNewSecret(""); refresh(); }}>Revoke</button>}</div>)}</div></>}</FeatureScaffold>;
}

function FeatureScaffold({ title, icon, description, children }: { title: string; icon: string; description: string; children: React.ReactNode }) { return <section className="paid-workspace-page"><header className="paid-feature-header"><div className="paid-feature-heading"><span className="paid-feature-icon-large" aria-hidden="true">{icon}</span><div><span className="paid-workspace-kicker">Paid capability</span><h1>{title}</h1><p>{description}</p></div></div><Link className="paid-back-link" to="/paid">← Paid Feature Centre</Link></header><div className="paid-feature-content">{children}</div></section>; }

function WrappedFeature({ feature }: { feature: FeatureConfig }) { const child = feature.section === "analytics" ? <AnalyticsFeature/> : feature.entitlement === "data_export" ? <DataExportFeature/> : <WorkspaceFeature feature={feature}/>; return <PaidTierGate entitlement={feature.entitlement}>{child}</PaidTierGate>; }

export default function PaidFeatureWorkspace() {
  const location = useLocation();
  if (location.pathname === "/paid") return <PaidHub/>;
  const feature = FEATURES[location.pathname] ?? FEATURES["/paid/analytics"];
  return <WrappedFeature feature={feature}/>;
}
