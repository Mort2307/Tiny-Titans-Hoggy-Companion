import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCreatorFeedback, getCreatorReports, getGlobalStats, getMorphImageSubmissions, type GlobalStats } from "../services/creatorService";
import { getCanonicalReportIssueStatus, isActiveReportIssueStatus } from "../services/reportLifecycle";
import CreatorCommunityGlobe from "../components/CreatorCommunityGlobeV2";
import CreatorCommunityIntelligence from "../components/CreatorCommunityIntelligence";
import CreatorMorphLibraryEditor from "../components/CreatorMorphLibraryEditor";
import { app, db } from "../firebase/config";
import PageBackButton from "../components/PageBackButton";
import "../styles/CreatorTools.css";
import "../styles/CreatorUsers.css";

const EMPTY_STATS: GlobalStats = { registeredUsers: 0, activeUsers: 0, snakeProfiles: 0, mealsFed: 0, weightLogs: 0, totalWeightKg: 0, totalWeightLb: 0, shedsLogged: 0, totalShedLengthCm: 0, totalShedLengthIn: 0, geneticsCalculations: 0 };
const fmt = (value: number) => new Intl.NumberFormat("en-GB").format(value);

type CreatorUser = {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  profileType: string;
  category: string;
  ageBand: string;
  experienceLevel: string;
  learningLevel: string;
  setupComplete: boolean;
  approximateLocation?: { city?: string; country?: string; visibleToCreator?: boolean } | null;
  dataCollectionPreferences?: { approximateLocation?: boolean; analytics?: boolean; productUpdates?: boolean; communityHusbandryData?: boolean; consentVersion?: string };
  lastActiveAt?: { toMillis?: () => number } | string | null;
  createdAt?: unknown;
  platform?: string;
  appVersion?: string;
};

function formatDate(value: unknown) {
  if (!value) return "—";
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return new Date(value.toMillis()).toLocaleString("en-GB");
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB");
}

function toMillis(value: CreatorUser["lastActiveAt"]): number | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function activityBand(value: CreatorUser["lastActiveAt"], now: number | null): { label: string; detail: string } {
  const millis = toMillis(value);
  if (millis === null || now === null) return { label: "No activity signal", detail: "No usable last-active timestamp is recorded." };
  const days = Math.floor((now - millis) / 86400000);
  if (days <= 0) return { label: "Active today", detail: "Used Tiny Titans within the last day." };
  if (days <= 7) return { label: "Active this week", detail: `${days} day${days === 1 ? "" : "s"} since the latest recorded activity.` };
  if (days <= 30) return { label: "Active this month", detail: `${days} days since the latest recorded activity.` };
  if (days <= 90) return { label: "Cooling off", detail: `${days} days since the latest recorded activity.` };
  return { label: "Long inactive", detail: `${days} days since the latest recorded activity.` };
}

const functions = getFunctions(app, "europe-west2");
const setCreatorClaim = httpsCallable<{ uid: string; enabled: boolean }, { success: boolean; uid: string; creator: boolean }>(functions, "setCreatorClaim");

async function fetchDashboardData() {
  const [canonicalStats, submissions, reports, feedback] = await Promise.all([getGlobalStats(), getMorphImageSubmissions(), getCreatorReports(), getCreatorFeedback()]);
  const actionableReports = reports.filter((item) => item.archived !== true && isActiveReportIssueStatus(getCanonicalReportIssueStatus(item.status)));
  return { canonicalStats, morphPending: submissions.filter((item) => item.status === "Pending" || item.status === "NeedsInfo").length, bugPending: actionableReports.length, feedbackNew: feedback.filter((item) => !item.status || item.status === "New").length };
}

async function fetchUsersData() {
  const snapshot = await getDocs(collection(db, "users"));
  const nextUsers = snapshot.docs.map((item) => ({ uid: item.id, ...(item.data() as Omit<CreatorUser, "uid">) }));
  nextUsers.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
  return nextUsers;
}

export default function CreatorAdmin() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<GlobalStats>(EMPTY_STATS);
  const [users, setUsers] = useState<CreatorUser[]>([]);
  const [morphPending, setMorphPending] = useState(0);
  const [bugPending, setBugPending] = useState(0);
  const [feedbackNew, setFeedbackNew] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"users" | "snakes" | "trackers" | "morph-editor" | null>(null);
  const [selectedUser, setSelectedUser] = useState<CreatorUser | null>(null);
  const [search, setSearch] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  async function loadDashboard() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchDashboardData();
      setStats(data.canonicalStats);
      setMorphPending(data.morphPending);
      setBugPending(data.bugPending);
      setFeedbackNew(data.feedbackNew);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Creator data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    if (!user) return;
    setUsersLoading(true);
    setError("");
    try {
      setUsers(await fetchUsersData());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "User overview could not be loaded.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function grantCreatorTesterClaim(target: CreatorUser) {
    if (!target.uid) return;
    setClaimBusy(true);
    setClaimMessage("");
    setError("");
    try {
      await setCreatorClaim({ uid: target.uid, enabled: true });
      setClaimMessage(`Creator authorization granted to ${target.displayName || "the selected account"}. Refresh that account's ID token before running Creator Tester.`);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Creator authorization could not be granted.");
    } finally {
      setClaimBusy(false);
    }
  }

  useEffect(() => {
    if (profile?.role !== "admin" || !user) return;
    let active = true;
    void fetchDashboardData().then((data) => { if (!active) return; setStats(data.canonicalStats); setMorphPending(data.morphPending); setBugPending(data.bugPending); setFeedbackNew(data.feedbackNew); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Creator data could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    void fetchUsersData().then((nextUsers) => { if (active) setUsers(nextUsers); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "User overview could not be loaded."); });
    return () => { active = false; };
  }, [profile?.role, user]);

  useEffect(() => {
    if (panel !== "users" || !user) return;
    let active = true;
    void fetchUsersData().then((nextUsers) => { if (active) setUsers(nextUsers); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "User overview could not be loaded."); }).finally(() => { if (active) setUsersLoading(false); });
    return () => { active = false; };
  }, [panel, user]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((item) => [item.displayName, item.profileType, item.category, item.experienceLevel, item.learningLevel, item.approximateLocation?.city, item.approximateLocation?.country, item.platform, item.appVersion].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }, [search, users]);

  const userInsights = useMemo(() => {
    const bands = { today: 0, week: 0, month: 0, cooling: 0, inactive: 0, unknown: 0 };
    let setupComplete = 0;
    let locationOn = 0;
    let analyticsOn = 0;
    let husbandryOn = 0;
    let productUpdatesOn = 0;
    for (const item of users) {
      if (item.setupComplete) setupComplete += 1;
      if (item.dataCollectionPreferences?.approximateLocation === true) locationOn += 1;
      if (item.dataCollectionPreferences?.analytics === true) analyticsOn += 1;
      if (item.dataCollectionPreferences?.communityHusbandryData === true) husbandryOn += 1;
      if (item.dataCollectionPreferences?.productUpdates === true) productUpdatesOn += 1;
      const millis = toMillis(item.lastActiveAt);
      if (millis === null || now === null) bands.unknown += 1;
      else {
        const days = Math.floor((now - millis) / 86400000);
        if (days <= 0) bands.today += 1;
        else if (days <= 7) bands.week += 1;
        else if (days <= 30) bands.month += 1;
        else if (days <= 90) bands.cooling += 1;
        else bands.inactive += 1;
      }
    }
    return { bands, setupComplete, locationOn, analyticsOn, husbandryOn, productUpdatesOn };
  }, [users, now]);

  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  return <section className="creator-admin-page">
    <div className="creator-admin-header"><div><PageBackButton fallbackPath="/" label="Back to App" /><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>🛠️ Tiny Titans Creator Centre</h1><p>One organised command centre for community intelligence, moderation, QA and app operations.</p></div><button type="button" onClick={() => { void loadDashboard(); void loadUsers(); }} disabled={loading || usersLoading}>{loading || usersLoading ? "↻ Loading…" : "↻ Refresh"}</button></div>
    {error && <div className="creator-error">{error}</div>}
    {claimMessage && <div className="creator-success" role="status">{claimMessage}</div>}
    {loading ? <div className="creator-loading">Loading global Tiny Titans intelligence…</div> : <>
      <CreatorCommunityIntelligence />
      <CreatorCommunityGlobe />
      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR OPERATIONS</span><h2>🧰 Tools & queues</h2><p>Everything you need to run, review and improve Tiny Titans without hunting through tiny links.</p></div></div>
        <div className="creator-global-grid creator-tools-grid">
          <button type="button" className="creator-global-card creator-feature-tile" onClick={() => setPanel("morph-editor")}><span>🖼️</span><strong>Morph Library Editor</strong><label>Approved image maintenance</label><small>Search a morph, crop images, swap incorrect assignments, move images and edit contributor credit.</small><span className="creator-feature-tile-cta">Open Morph Library Editor →</span></button>
          <Link className="creator-global-card creator-feature-tile" to="/creator/submissions"><span>🧬</span><strong>{morphPending} Morph Submissions</strong><label>Submission Review</label><small>Inspect uploaded photographs, proof and genetics notes before approval.</small><span className="creator-feature-tile-cta">Open Submission Review →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/issues"><span>🐛</span><strong>{bugPending} Bug Reports</strong><label>Bug Report Review</label><small>Review community bugs, severity, reproduction information, attachments, platform and app version.</small><span className="creator-feature-tile-cta">Open Bug Reports →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/issues"><span>💬</span><strong>{feedbackNew} Feedback</strong><label>Feedback Review</label><small>Review ideas, suggestions, usability feedback and creator decisions in a dedicated queue.</small><span className="creator-feature-tile-cta">Open Feedback →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/tester"><span>🤖</span><strong>Tester Bot Centre</strong><label>Automated QA & Diagnostics</label><small>Run the targeted Tiny Titans QA suites across core, trackers, genetics, notifications and feedback.</small><span className="creator-feature-tile-cta">Open Tester Centre →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/community"><span>📢</span><strong>Community Manager</strong><label>Announcements & Known Issues</label><small>Publish updates, tester notices, release notes and known-issue information.</small><span className="creator-feature-tile-cta">Open Community Manager →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/community"><span>🛡️</span><strong>Moderation & Reports</strong><label>Community Operations</label><small>Keep reports, moderation workflows and creator-facing communications in one place.</small><span className="creator-feature-tile-cta">Open Operations →</span></Link>
        </div>
      </section>
      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">QUICK ACCESS</span><h2>📊 App intelligence</h2></div></div>
        <div className="creator-actions"><button className="secondary-button" type="button" onClick={() => setPanel("users")}>👥 Browse Users</button><button className="secondary-button" type="button" onClick={() => setPanel("trackers")}>📈 Tracker Analytics</button><button className="secondary-button" type="button" onClick={() => setPanel("snakes")}>🐍 Snake Overview</button></div>
      </section>
    </>}

    {panel === "morph-editor" && <section className="creator-admin-section" id="creator-morph-library-editor"><div className="creator-section-heading"><div><span className="creator-admin-kicker">SPECIALIST TOOL</span><h2>🖼️ Morph Library Editor</h2><p>Maintain approved community imagery without changing the canonical genetics database.</p></div><button type="button" onClick={() => setPanel(null)}>✕ Close editor</button></div><CreatorMorphLibraryEditor /></section>}

    {panel === "users" && <section className="creator-admin-section">
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">GLOBAL USER OVERVIEW</span><h2>👥 Users</h2><p>Tap an account to see creator-safe usage, permissions and engagement signals. Private contact details and private tracker records are intentionally excluded.</p></div><button type="button" onClick={() => void loadUsers()} disabled={usersLoading}>{usersLoading ? "Loading…" : "↻ Refresh users"}</button></div>
      <div className="creator-global-grid creator-tools-grid">
        <div className="creator-global-card"><span>👥</span><strong>{fmt(users.length)}</strong><label>Registered accounts</label><small>Current user documents visible to the Creator Centre.</small></div>
        <div className="creator-global-card"><span>🟢</span><strong>{fmt(userInsights.bands.today + userInsights.bands.week)}</strong><label>Active within 7 days</label><small>{fmt(userInsights.bands.today)} today · {fmt(userInsights.bands.week)} earlier this week.</small></div>
        <div className="creator-global-card"><span>🟡</span><strong>{fmt(userInsights.bands.month + userInsights.bands.cooling)}</strong><label>Cooling / monthly users</label><small>Users who may benefit from a nudge, new content or a check-in.</small></div>
        <div className="creator-global-card"><span>🔵</span><strong>{fmt(userInsights.setupComplete)}</strong><label>Setup complete</label><small>{users.length ? Math.round((userInsights.setupComplete / users.length) * 100) : 0}% of the visible registered population.</small></div>
        <div className="creator-global-card"><span>📍</span><strong>{fmt(userInsights.locationOn)}</strong><label>Location consent</label><small>Approximate city/country community mapping enabled.</small></div>
        <div className="creator-global-card"><span>🧠</span><strong>{fmt(userInsights.husbandryOn)}</strong><label>Community husbandry consent</label><small>Eligible for the relevant aggregate husbandry intelligence layer.</small></div>
      </div>
      <div className="creator-user-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search account name, profile, experience, city, platform or version…" aria-label="Search users" /><strong>{filteredUsers.length} shown</strong></div>
      {usersLoading ? <div className="creator-loading">Loading registered users…</div> : <div className="creator-list">
        {filteredUsers.map((item) => { const band = activityBand(item.lastActiveAt, now); return <button className="creator-user-row" type="button" key={item.uid} onClick={() => { setSelectedUser(item); setClaimMessage(""); }}>
          <span className="creator-user-avatar">{item.displayName?.trim().charAt(0).toUpperCase() || "🐍"}</span>
          <span className="creator-user-main"><strong>{item.displayName || "Unnamed user"}</strong><small>{item.profileType || "user"} · {item.experienceLevel || "experience not set"}</small></span>
          <span className="creator-user-meta"><strong>{band.label}</strong><small>{item.approximateLocation?.city && item.dataCollectionPreferences?.approximateLocation === true ? `${item.approximateLocation.city}, ${item.approximateLocation.country || ""}` : "Location not shared"}</small></span>
          <span aria-hidden="true">→</span>
        </button>; })}
        {filteredUsers.length === 0 && <div className="creator-list-item"><strong>No users found</strong><span>Try another search.</span></div>}
      </div>}
      <button type="button" onClick={() => setPanel(null)}>← Back to Creator Centre</button>
    </section>}

    {panel === "snakes" && <section className="creator-admin-section"><h2>🐍 Snake Overview</h2><div className="creator-global-grid"><div className="creator-global-card"><span>🐍</span><strong>{fmt(stats.snakeProfiles)}</strong><label>Total Snake Profiles</label></div><div className="creator-global-card"><span>⚖️</span><strong>{fmt(stats.weightLogs)}</strong><label>Weight Records</label></div><div className="creator-global-card"><span>🍽️</span><strong>{fmt(stats.mealsFed)}</strong><label>Feeding Records</label></div><div className="creator-global-card"><span>🐍</span><strong>{fmt(stats.shedsLogged)}</strong><label>Shed Cycles</label></div></div><button type="button" onClick={() => setPanel(null)}>← Back</button></section>}
    {panel === "trackers" && <section className="creator-admin-section"><h2>📊 Tracker Analytics</h2><div className="creator-list"><div className="creator-list-card"><strong>🍽️ Feeding</strong><span>{fmt(stats.mealsFed)} canonical meals recorded globally.</span></div><div className="creator-list-card"><strong>⚖️ Weight</strong><span>{fmt(stats.weightLogs)} canonical weight records · {fmt(stats.validWeightLogs ?? stats.weightLogs)} valid · {fmt(stats.invalidWeightLogs ?? 0)} data-quality candidates.</span></div><div className="creator-list-card"><strong>🐍 Sheds</strong><span>{fmt(stats.shedsLogged)} canonical shed cycles · {fmt(stats.validShedLogs ?? stats.shedsLogged)} with valid measurements · {fmt(stats.invalidShedLogs ?? 0)} missing/invalid measurements.</span></div><div className="creator-list-card"><strong>🧬 Genetics</strong><span>{fmt(stats.geneticsCalculations)} persisted calculations.</span></div><div className="creator-list-card"><strong>🧪 Data quality</strong><span>{fmt(stats.dataQualityIssues ?? 0)} tracker data-quality candidates require review.</span></div></div><button type="button" onClick={() => setPanel(null)}>← Back</button></section>}

    {selectedUser && <div className="creator-user-modal-backdrop" role="presentation" onClick={() => setSelectedUser(null)}><section className="creator-user-modal" role="dialog" aria-modal="true" aria-labelledby="creator-user-title" onClick={(event) => event.stopPropagation()}>
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR-SAFE ACCOUNT INTELLIGENCE</span><h2 id="creator-user-title">👤 {selectedUser.displayName || "Unnamed user"}</h2><p>Public app/profile signals only. No private contact details, exact location, health records or private husbandry data are shown.</p></div><button type="button" onClick={() => setSelectedUser(null)}>✕</button></div>
      <div className="creator-user-detail-grid">
        <div><strong>Engagement</strong><span>{activityBand(selectedUser.lastActiveAt, now).label}</span></div>
        <div><strong>Latest activity</strong><span>{formatDate(selectedUser.lastActiveAt)}</span></div>
        <div><strong>Account age</strong><span>{formatDate(selectedUser.createdAt)}</span></div>
        <div><strong>Role</strong><span>{selectedUser.role || "user"}</span></div>
        <div><strong>Profile</strong><span>{selectedUser.profileType || "—"}</span></div>
        <div><strong>Category</strong><span>{selectedUser.category || "—"}</span></div>
        <div><strong>Experience</strong><span>{selectedUser.experienceLevel || "—"}</span></div>
        <div><strong>Learning level</strong><span>{selectedUser.learningLevel || "—"}</span></div>
        <div><strong>Setup</strong><span>{selectedUser.setupComplete ? "Complete" : "Incomplete"}</span></div>
        <div><strong>Platform</strong><span>{selectedUser.platform || "Not recorded"}</span></div>
        <div><strong>App version</strong><span>{selectedUser.appVersion || "Not recorded"}</span></div>
        <div><strong>Activity signal</strong><span>{activityBand(selectedUser.lastActiveAt, now).detail}</span></div>
      </div>
      <div className="creator-user-detail-section"><h3>🌍 Community visibility</h3><p>{selectedUser.dataCollectionPreferences?.approximateLocation && selectedUser.approximateLocation?.visibleToCreator && selectedUser.approximateLocation.city && selectedUser.approximateLocation.country ? `${selectedUser.approximateLocation.city}, ${selectedUser.approximateLocation.country}` : "Not shared / consent not enabled"}</p><small>Only approximate city/country is used for the Creator community map.</small></div>
      <div className="creator-user-detail-section"><h3>🔐 Permission matrix</h3><div className="creator-user-permissions"><span>📍 Community location: {selectedUser.dataCollectionPreferences?.approximateLocation ? "ON" : "OFF"}</span><span>📊 Analytics: {selectedUser.dataCollectionPreferences?.analytics ? "ON" : "OFF"}</span><span>🧠 Community husbandry: {selectedUser.dataCollectionPreferences?.communityHusbandryData ? "ON" : "OFF"}</span><span>📢 Product updates: {selectedUser.dataCollectionPreferences?.productUpdates ? "ON" : "OFF"}</span></div><small>OFF means the relevant intelligence layer must exclude that user's data. It is not a missing-data error.</small></div>
      <div className="creator-user-detail-section"><h3>🧭 Creator interpretation</h3><p>{activityBand(selectedUser.lastActiveAt, now).label === "Long inactive" ? "This account has gone quiet. Consider a friendly feedback prompt or check whether the user is struggling with onboarding or finding the right features." : activityBand(selectedUser.lastActiveAt, now).label === "Cooling off" ? "Usage is cooling. This is a useful population for targeted education, feature discovery or a lightweight check-in." : activityBand(selectedUser.lastActiveAt, now).label === "No activity signal" ? "There is not enough activity data to classify this account yet." : "This account shows recent activity. Use the profile signals and contribution permissions to understand which parts of Tiny Titans are working for them."}</p></div>
      <div className="creator-user-detail-section"><h3>🤖 Creator Tester authorization</h3><p>This uses the existing server-side Creator claim workflow for approved test accounts.</p><button type="button" className="secondary-button" disabled={claimBusy} onClick={() => void grantCreatorTesterClaim(selectedUser)}>{claimBusy ? "Granting Creator access…" : "Grant Creator Tester access"}</button></div>
    </section></div>}
  </section>;
}
