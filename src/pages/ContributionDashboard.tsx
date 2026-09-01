import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";
import { getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import { getUserSnakes } from "../services/snakeService";
import { getUserFeedback, getUserIssueReports, type FounderApplication } from "../services/creatorService";
import { getUserKeeperObservations } from "../services/keeperObservationService";
import { getUserMorphSubmissions } from "../services/morphUserSubmissionService";
import { getPublicCommunityContributionFeed, getPublicCommunityContributionSnapshot, type PublicContributionEntry, type PublicContributionSnapshot } from "../services/communityIntelligenceService";
import type { Snake } from "../types/Snake";
import type { PrivacyPreferences } from "../types/privacy";
import type { Feedback } from "../types/feedback";
import type { ReportIssue } from "../types/reportIssue";
import type { KeeperObservation } from "../types/keeperObservation";
import type { MorphImageSubmission, UserMorphSubmission } from "../types/morphSubmission";
import "../styles/contribution-dashboard.css";

const EMPTY: PrivacyPreferences = {
  consentVersion: "",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  productUpdates: false,
};

type PersonalEvent = {
  id: string;
  icon: string;
  category: string;
  title: string;
  detail: string;
  status?: string;
  date?: unknown;
  link?: string;
};

type Category = {
  icon: string;
  title: string;
  description: string;
  count: number;
  submitted?: number;
  approved?: number;
  open?: number;
  link?: string;
};

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function statusOf(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "Recorded";
}

function dateMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: unknown): string {
  const millis = dateMillis(value);
  if (!millis) return "Date not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(millis);
}

function isApproved(value: unknown): boolean {
  return ["approved", "accepted", "published", "complete", "completed"].includes(String(value ?? "").trim().toLowerCase());
}

async function getUserMorphImageSubmissions(uid: string): Promise<MorphImageSubmission[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, "morphImageSubmissions"), where("userId", "==", uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<MorphImageSubmission, "id">) }));
}

async function getUserFounderApplications(uid: string): Promise<FounderApplication[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, "founderApplications"), where("uid", "==", uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<FounderApplication, "id">) }));
}

export default function ContributionDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PrivacyPreferences>(EMPTY);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [issues, setIssues] = useState<ReportIssue[]>([]);
  const [observations, setObservations] = useState<KeeperObservation[]>([]);
  const [morphSubmissions, setMorphSubmissions] = useState<UserMorphSubmission[]>([]);
  const [morphImageSubmissions, setMorphImageSubmissions] = useState<MorphImageSubmission[]>([]);
  const [founderApplications, setFounderApplications] = useState<FounderApplication[]>([]);
  const [globalSnapshot, setGlobalSnapshot] = useState<PublicContributionSnapshot | null>(null);
  const [globalFeed, setGlobalFeed] = useState<PublicContributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void Promise.all([
      getPrivacyPreferences(user.uid).catch(() => EMPTY),
      getUserSnakes(user.uid).catch(() => [] as Snake[]),
      getUserFeedback(user.uid).catch(() => [] as Feedback[]),
      getUserIssueReports(user.uid).catch(() => [] as ReportIssue[]),
      getUserKeeperObservations(user.uid).catch(() => [] as KeeperObservation[]),
      getUserMorphSubmissions(user.uid).catch(() => [] as UserMorphSubmission[]),
      getUserMorphImageSubmissions(user.uid).catch(() => [] as MorphImageSubmission[]),
      getUserFounderApplications(user.uid).catch(() => [] as FounderApplication[]),
      getPublicCommunityContributionSnapshot().catch(() => null),
      getPublicCommunityContributionFeed().catch(() => ({ entries: [] as PublicContributionEntry[] })),
    ]).then(([privacy, loadedSnakes, loadedFeedback, loadedIssues, loadedObservations, loadedMorphSubmissions, loadedMorphImages, loadedFounders, snapshot, feed]) => {
      if (!active) return;
      setPreferences(privacy);
      setSnakes(loadedSnakes);
      setFeedback(loadedFeedback);
      setIssues(loadedIssues);
      setObservations(loadedObservations);
      setMorphSubmissions(loadedMorphSubmissions);
      setMorphImageSubmissions(loadedMorphImages);
      setFounderApplications(loadedFounders);
      setGlobalSnapshot(snapshot);
      setGlobalFeed(feed.entries ?? []);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Contribution data could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  const counts = useMemo(() => {
    const weights = snakes.reduce((total, snake) => total + (snake.weightHistory?.length ?? 0), 0);
    const feedings = snakes.reduce((total, snake) => total + (snake.feedingHistory?.length ?? 0), 0);
    const sheds = snakes.reduce((total, snake) => total + (snake.shedHistory?.length ?? 0), 0);
    const health = snakes.reduce((total, snake) => total + (snake.healthHistory?.length ?? 0), 0);
    const morphNames = morphSubmissions.length;
    const morphImages = morphImageSubmissions.length;
    const publicCommunity = observations.filter((item) => isApproved(item.status)).length + morphImages + morphNames;
    const productImprovements = feedback.length + issues.length;
    const trackerRecords = weights + feedings + sheds + health;
    const intelligenceRecords = preferences.communityHusbandryData ? trackerRecords : 0;
    const submittedContributions = observations.length + morphNames + morphImages + feedback.length + issues.length + founderApplications.length;
    return {
      snakes: snakes.length,
      weights,
      feedings,
      sheds,
      health,
      morphNames,
      morphImages,
      morphLibrary: morphNames + morphImages,
      observations: observations.length,
      approvedObservations: observations.filter((item) => isApproved(item.status)).length,
      feedback: feedback.length,
      issues: issues.length,
      founders: founderApplications.length,
      publicCommunity,
      productImprovements,
      trackerRecords,
      intelligenceRecords,
      submittedContributions,
    };
  }, [snakes, observations, morphSubmissions, morphImageSubmissions, feedback, issues, founderApplications, preferences.communityHusbandryData]);

  const events = useMemo<PersonalEvent[]>(() => {
    const items: PersonalEvent[] = [];
    observations.forEach((item) => {
      const data = item as KeeperObservation & Record<string, unknown>;
      items.push({ id: `obs-${String(item.id)}`, icon: "🔭", category: "Behaviour Observatory", title: String(data.title || data.behaviourName || data.observationTitle || data.primaryCategory || "Behaviour observation"), detail: String(data.description || data.observation || "Keeper observation submitted to Tiny Titans."), status: statusOf(item.status), date: data.createdAt || data.submittedAt || data.updatedAt, link: "/behaviour-observatory" });
    });
    morphSubmissions.forEach((item) => {
      items.push({ id: `morph-${item.id}`, icon: "🧬", category: "Morph terminology", title: String(item.submittedName || "Morph terminology submission"), detail: String(item.description || "Morph Library contribution submitted for review."), status: statusOf(item.status), date: item.createdAt, link: "/morph-library" });
    });
    morphImageSubmissions.forEach((item) => {
      const data = item as MorphImageSubmission & Record<string, unknown>;
      items.push({ id: `morph-image-${item.id}`, icon: "🖼️", category: "Morph image", title: String(data.morphName || data.morphId || "Morph image submission"), detail: String(data.description || "Community reference image submitted to the Morph Library."), status: statusOf(data.status), date: data.createdAt || data.submittedAt || data.approvedAt, link: "/morph-library" });
    });
    feedback.forEach((item) => {
      const data = item as Feedback & Record<string, unknown>;
      items.push({ id: `feedback-${String(data.id || items.length)}`, icon: "💡", category: "Feedback", title: String(data.subject || data.title || "Feedback to Tiny Titans"), detail: String(data.message || data.description || "Product feedback contribution."), status: statusOf(data.status), date: data.createdAt || data.updatedAt, link: "/feedback" });
    });
    issues.forEach((item) => {
      const data = item as ReportIssue & Record<string, unknown>;
      items.push({ id: `bug-${String(data.id || items.length)}`, icon: "🐛", category: "Bug report", title: String(data.title || data.subject || "Bug report"), detail: String(data.description || data.details || "Bug report helping Tiny Titans improve."), status: statusOf(data.status), date: data.createdAt || data.updatedAt, link: "/my-issue-reports" });
    });
    founderApplications.forEach((item) => {
      const data = item as FounderApplication & Record<string, unknown>;
      items.push({ id: `founder-${String(data.id || items.length)}`, icon: "🏆", category: "Founder", title: "Founder application", detail: "Your Founder/support contribution to Tiny Titans.", status: statusOf(data.status), date: data.createdAt || data.submittedAt, link: "/founder" });
    });
    if (counts.intelligenceRecords > 0) {
      items.push({ id: "intelligence", icon: "🧠", category: "Community Intelligence", title: `${counts.intelligenceRecords} private tracker records contributing`, detail: `${counts.weights} weight, ${counts.feedings} feeding, ${counts.sheds} shed and ${counts.health} health records are eligible for anonymised aggregate analysis because you enabled optional husbandry contribution.`, status: "Enabled by you", link: "/account/data-privacy" });
    }
    return items.sort((a, b) => dateMillis(b.date) - dateMillis(a.date));
  }, [observations, morphSubmissions, morphImageSubmissions, feedback, issues, founderApplications, counts]);

  const categories = useMemo<Category[]>(() => [
    { icon: "🧬", title: "Morph Library", count: counts.morphLibrary, submitted: counts.morphLibrary, approved: morphSubmissions.filter((item) => isApproved(item.status)).length + morphImageSubmissions.filter((item) => isApproved(item.status)).length, description: "Morph names, terminology, evidence and approved reference images.", link: "/morph-library" },
    { icon: "🔭", title: "Behaviour Observatory", count: counts.observations, submitted: counts.observations, approved: counts.approvedObservations, description: "Real-world behaviour observations shared for learning and pattern recognition.", link: "/behaviour-observatory" },
    { icon: "💡", title: "Feedback & Ideas", count: counts.feedback, submitted: counts.feedback, open: feedback.filter((item) => !isApproved((item as Feedback & Record<string, unknown>).status)).length, description: "Ideas and product feedback that help shape Tiny Titans." , link: "/feedback" },
    { icon: "🐛", title: "Bug Reports", count: counts.issues, submitted: counts.issues, open: issues.filter((item) => !isApproved((item as ReportIssue & Record<string, unknown>).status)).length, description: "Problems, diagnostics and reproducible reports that improve reliability.", link: "/my-issue-reports" },
    { icon: "🏆", title: "Founder / Support", count: counts.founders, submitted: counts.founders, description: "Founder applications and support activity associated with your account.", link: "/founder" },
    { icon: "🐍", title: "Keeper Records", count: counts.trackerRecords, description: "Private weight, feeding, shed and health history — tracked separately from public contributions.", link: "/snakes" },
  ], [counts, morphSubmissions, morphImageSubmissions, feedback, issues]);

  async function toggleContribution() {
    if (!user || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const next = !preferences.communityHusbandryData;
      await savePrivacyPreferences(user.uid, {
        communityLocation: preferences.communityLocation,
        anonymousAnalytics: preferences.anonymousAnalytics,
        communityHusbandryData: next,
        productUpdates: preferences.productUpdates,
        ...(preferences.city ? { city: preferences.city } : {}),
        ...(preferences.country ? { country: preferences.country } : {}),
      });
      setPreferences(await getPrivacyPreferences(user.uid));
      setMessage(next ? "Optional Intelligence contribution is active." : "Optional Intelligence contribution is now off.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your contribution choice could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="page-container contribution-dashboard-page"><div className="contribution-dashboard-loading">Loading your contribution centre…</div></main>;
  }
  if (!user) return null;

  const publicRecords = safeNumber(globalSnapshot?.publicCommunityRecords);
  const intelligenceRecords = safeNumber(globalSnapshot?.intelligenceContributions);
  const totalGlobal = safeNumber(globalSnapshot?.totalRecords);
  const globalKeepers = safeNumber(globalSnapshot?.contributors);

  return <main className="page-container contribution-dashboard-page">
    <button className="personalisation-back" type="button" onClick={() => navigate(-1)}>← Back</button>
    <header className="contribution-dashboard-hero">
      <div><p className="contribution-dashboard-eyebrow">TINY TITANS · CONTRIBUTION CENTRE</p><h1>🌍 Your contribution, properly tracked.</h1><p>See what you have submitted, what has been accepted, what is still under review, which private records are contributing to Intelligence, and how the wider Tiny Titans community is growing.</p></div>
      <div className="contribution-dashboard-hero-actions"><Link className="contribution-dashboard-button contribution-dashboard-button--primary" to="/make-contribution">＋ Make a Contribution</Link><Link className="contribution-dashboard-button" to="/account/data-privacy">🔐 Privacy controls</Link></div>
    </header>

    {error && <div className="setup-error" role="alert">{error}</div>}
    {message && <div className="contribution-dashboard-note" role="status">✓ {message}</div>}
    <p className="contribution-dashboard-note"><strong>Important:</strong> public/community contributions and private Keeper tracker records are deliberately separated. Your individual weight, feeding, shed and health records are not displayed in the global feed. They only enter aggregate Intelligence totals when you explicitly opt in.</p>

    <section className="contribution-dashboard-summary" aria-label="Contribution totals">
      <div className="contribution-dashboard-stat"><small>YOUR SUBMISSIONS</small><strong>{counts.submittedContributions}</strong><span>community and product-improvement contributions recorded against your account</span></div>
      <div className="contribution-dashboard-stat"><small>PUBLIC / COMMUNITY</small><strong>{publicRecords}</strong><span>approved community records visible through public contribution workflows</span></div>
      <div className="contribution-dashboard-stat"><small>GLOBAL TOTAL</small><strong>{totalGlobal}</strong><span>public contributions plus consented Intelligence records</span></div>
      <div className="contribution-dashboard-stat"><small>CONTRIBUTING KEEPERS</small><strong>{globalKeepers}</strong><span>keepers represented in the aggregate global contribution system</span></div>
    </section>

    <div className="contribution-dashboard-columns">
      <div className="contribution-dashboard-panel">
        <div className="contribution-dashboard-section-head"><div><h2>📚 Your contribution categories</h2><p>Every major contribution source is separated so you can see exactly what you have put into Tiny Titans.</p></div><Link to="/make-contribution">Contribute →</Link></div>
        <div className="contribution-dashboard-category-grid">{categories.map((category) => <article className="contribution-dashboard-category" key={category.title}>
          <div className="contribution-dashboard-category-head"><span className="contribution-dashboard-category-icon" aria-hidden="true">{category.icon}</span><strong className="contribution-dashboard-category-count">{category.count}</strong></div>
          <h3>{category.title}</h3><p>{category.description}</p>
          {(category.submitted !== undefined || category.approved !== undefined || category.open !== undefined) && <div className="contribution-dashboard-status-line">{category.submitted !== undefined && <span className="contribution-dashboard-chip">Submitted {category.submitted}</span>}{category.approved !== undefined && <span className="contribution-dashboard-chip contribution-dashboard-chip--good">Approved {category.approved}</span>}{category.open !== undefined && <span className={`contribution-dashboard-chip ${category.open > 0 ? "contribution-dashboard-chip--warn" : ""}`}>Open {category.open}</span>}</div>}
          {category.link && <Link className="personalisation-link" to={category.link}>Open category →</Link>}
        </article>)}</div>
      </div>

      <div className="contribution-dashboard-panel">
        <div className="contribution-dashboard-section-head"><div><h2>🌎 Global contribution breakdown</h2><p>Aggregate figures are intentionally separated from identifiable keeper records.</p></div><Link to="/community">Community →</Link></div>
        <div className="contribution-dashboard-global-breakdown">
          <div className="contribution-dashboard-global-breakdown-row"><span>🔭 Behaviour contributions</span><strong>{safeNumber(globalSnapshot?.behaviourContributions)}</strong></div>
          <div className="contribution-dashboard-global-breakdown-row"><span>🧬 Morph contributions</span><strong>{safeNumber(globalSnapshot?.morphContributions)}</strong></div>
          <div className="contribution-dashboard-global-breakdown-row"><span>📢 Other community contributions</span><strong>{safeNumber(globalSnapshot?.communityContributions)}</strong></div>
          <div className="contribution-dashboard-global-breakdown-row"><span>🧠 Intelligence records</span><strong>{intelligenceRecords}</strong></div>
        </div>
        <div className="contribution-dashboard-matrix"><div><strong>{safeNumber(globalSnapshot?.intelligenceWeightRecords)}</strong><span>Weight records contributed</span></div><div><strong>{safeNumber(globalSnapshot?.intelligenceFeedingRecords)}</strong><span>Feeding records contributed</span></div><div><strong>{safeNumber(globalSnapshot?.intelligenceShedRecords)}</strong><span>Shed records contributed</span></div></div>
        <div className="contribution-dashboard-footer"><strong>What is private?</strong> Individual Intelligence records are never put into the public activity feed. The global tracker only receives aggregate counts from consenting keepers.</div>
      </div>
    </div>

    <div className="contribution-dashboard-columns" style={{ marginTop: "15px" }}>
      <div className="contribution-dashboard-panel">
        <div className="contribution-dashboard-section-head"><div><h2>🧾 Your contribution ledger</h2><p>Newest activity first, with status and links back to the relevant workflow.</p></div></div>
        {events.length === 0 ? <div className="contribution-dashboard-empty">No contribution events have been recorded yet. Your future submissions will appear here.</div> : <div className="contribution-dashboard-ledger">{events.map((event) => <article className="contribution-dashboard-ledger-item" key={event.id}>
          <span className="contribution-dashboard-ledger-icon" aria-hidden="true">{event.icon}</span><div><h3>{event.category} · {event.title}</h3><p>{event.detail.slice(0, 240)}{event.detail.length > 240 ? "…" : ""}</p><div className="contribution-dashboard-ledger-meta">{event.status ?? "Recorded"}{event.date ? ` · ${formatDate(event.date)}` : ""}</div></div>{event.link && <Link to={event.link}>Open →</Link>}
        </article>)}</div>}
      </div>

      <div className="contribution-dashboard-panel">
        <div className="contribution-dashboard-section-head"><div><h2>🌍 Global activity feed</h2><p>Recent publicly shareable contribution activity. Attribution shown here follows each contributor’s chosen credit mode.</p></div></div>
        {globalFeed.length === 0 ? <div className="contribution-dashboard-empty">No public activity is available yet. Aggregate Intelligence can still be active without exposing individual records.</div> : <div className="contribution-dashboard-global-feed">{globalFeed.slice(0, 40).map((item) => <article className="contribution-dashboard-global-item" key={`${item.source}-${item.id}`}><span>{item.source} · {item.contributor}</span><h3>{item.category} · {item.title}</h3><p>{item.snippet}</p><small>{formatDate(item.createdAt)}</small></article>)}</div>}
      </div>
    </div>

    <section className="contribution-dashboard-panel" style={{ marginTop: "15px" }}>
      <div className="contribution-dashboard-section-head"><div><h2>🧠 Optional Intelligence contribution</h2><p>{preferences.communityHusbandryData ? "ACTIVE — your eligible private tracker history contributes to anonymised aggregate Intelligence." : "OFF — your private tracker history remains outside the Intelligence layer until you explicitly opt in."}</p></div><button className="contribution-dashboard-button contribution-dashboard-button--primary" type="button" onClick={() => void toggleContribution()} disabled={saving}>{saving ? "Saving…" : preferences.communityHusbandryData ? "Stop contributing" : "Enable contribution"}</button></div>
      <div className="contribution-dashboard-matrix"><div><strong>{counts.weights}</strong><span>Private weight records</span></div><div><strong>{counts.feedings}</strong><span>Private feeding records</span></div><div><strong>{counts.sheds}</strong><span>Private shed records</span></div><div><strong>{counts.health}</strong><span>Private health records</span></div><div><strong>{counts.trackerRecords}</strong><span>Total private tracker records</span></div><div><strong>{counts.intelligenceRecords}</strong><span>Currently contributed to Intelligence</span></div></div>
      <div className="contribution-dashboard-footer"><strong>{preferences.communityHusbandryData ? "Your choice is active." : "Your records are private by default."}</strong> This setting controls whether eligible tracker history is included in anonymised aggregate Intelligence. It does not publish your individual logs.</div>
    </section>

    <section className="contribution-dashboard-panel" style={{ marginTop: "15px" }}>
      <div className="contribution-dashboard-section-head"><div><h2>🔐 Privacy, attribution & participation</h2><p>Your contribution identity and your data participation are separate choices.</p></div><Link to="/account/data-privacy">Manage privacy →</Link></div>
      <div className="contribution-dashboard-privacy">
        <div className="contribution-dashboard-privacy-row"><span>Community location</span><strong>{preferences.communityLocation ? "Enabled" : "Not enabled"}</strong></div>
        <div className="contribution-dashboard-privacy-row"><span>Anonymous analytics</span><strong>{preferences.anonymousAnalytics ? "Enabled" : "Not enabled"}</strong></div>
        <div className="contribution-dashboard-privacy-row"><span>Optional husbandry / Intelligence</span><strong>{preferences.communityHusbandryData ? "Contributing" : "Private"}</strong></div>
        <div className="contribution-dashboard-privacy-row"><span>Product updates</span><strong>{preferences.productUpdates ? "Enabled" : "Not enabled"}</strong></div>
      </div>
      <div className="contribution-dashboard-footer"><strong>Global does not mean identifiable.</strong> Public community submissions may show chosen attribution. Anonymous submissions still count globally. Private tracker data remains private and only contributes to aggregate Intelligence when opted in.</div>
    </section>
  </main>;
}
