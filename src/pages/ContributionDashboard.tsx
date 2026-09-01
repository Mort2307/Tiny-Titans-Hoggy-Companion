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
import { getPublicCommunityContributionSnapshot, type PublicContributionSnapshot } from "../services/communityIntelligenceService";
import type { Snake } from "../types/Snake";
import type { PrivacyPreferences } from "../types/privacy";
import type { Feedback } from "../types/feedback";
import type { ReportIssue } from "../types/reportIssue";
import type { KeeperObservation } from "../types/keeperObservation";
import type { MorphImageSubmission, UserMorphSubmission } from "../types/morphSubmission";

const EMPTY: PrivacyPreferences = {
  consentVersion: "",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  productUpdates: false,
};

type ContributionCard = {
  icon: string;
  title: string;
  count: number;
  subtitle: string;
  detail: string;
  to?: string;
};

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

function ContributionCardView({ item }: { item: ContributionCard }) {
  const body = (
    <article className="personalisation-card" style={{ height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ fontSize: "1.8rem" }} aria-hidden="true">{item.icon}</span>
        <strong style={{ fontSize: "2rem", lineHeight: 1 }}>{item.count}</strong>
      </div>
      <h3 style={{ margin: "10px 0 5px" }}>{item.title}</h3>
      <p style={{ margin: 0, opacity: .8, fontWeight: 700 }}>{item.subtitle}</p>
      <p style={{ marginBottom: item.to ? "12px" : 0, opacity: .68, lineHeight: 1.5 }}>{item.detail}</p>
      {item.to && <span style={{ color: "var(--tt-accent)", fontWeight: 900 }}>Open contribution →</span>}
    </article>
  );
  return item.to ? <Link to={item.to} style={{ color: "inherit", textDecoration: "none" }}>{body}</Link> : body;
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
    ]).then(([privacy, loadedSnakes, loadedFeedback, loadedIssues, loadedObservations, loadedMorphSubmissions, loadedMorphImages, loadedFounders, snapshot]) => {
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
    const morphLibrary = morphSubmissions.length + morphImageSubmissions.length;
    const communityContributions = observations.length + morphLibrary + feedback.length + issues.length + founderApplications.length;
    const contributablePersonalRecords = weights + feedings + sheds + health;
    const intelligenceRecords = preferences.communityHusbandryData ? contributablePersonalRecords : 0;

    return {
      snakes: snakes.length,
      weights,
      feedings,
      sheds,
      health,
      morphLibrary,
      observations: observations.length,
      feedback: feedback.length,
      issues: issues.length,
      founders: founderApplications.length,
      communityContributions,
      contributablePersonalRecords,
      intelligenceRecords,
    };
  }, [snakes, morphSubmissions, morphImageSubmissions, observations, feedback, issues, founderApplications, preferences.communityHusbandryData]);

  const contributionCards = useMemo<ContributionCard[]>(() => [
    {
      icon: "🧬",
      title: "Morph Library",
      count: counts.morphLibrary,
      subtitle: "Your contributions",
      detail: "Morph terminology/name submissions and morph image submissions are counted together here.",
      to: "/morph-library",
    },
    {
      icon: "🔭",
      title: "Behaviour Observatory",
      count: counts.observations,
      subtitle: "Your contributions",
      detail: "Keeper observations submitted for review and community learning.",
      to: "/behaviour-observatory?submit=1",
    },
    {
      icon: "💬",
      title: "Feedback",
      count: counts.feedback,
      subtitle: "Your contributions",
      detail: "Ideas, suggestions and feedback you've sent to Tiny Titans.",
      to: "/feedback",
    },
    {
      icon: "🐛",
      title: "Bug Reports",
      count: counts.issues,
      subtitle: "Your contributions",
      detail: "Problems you've reported that help us improve the app.",
      to: "/report-bug",
    },
    {
      icon: "🏆",
      title: "Founder Applications",
      count: counts.founders,
      subtitle: "Your contributions",
      detail: "Founder/support applications are included when your account has one recorded.",
      to: "/founder",
    },
  ], [counts]);

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
      setMessage(next
        ? "Intelligence contribution is now active. Your eligible personal records may be used in anonymised aggregate analysis."
        : "Intelligence contribution is now off. Your personal records remain in your account and are not newly contributed to the intelligence layer.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your contribution choice could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="page-container"><section className="personalisation-shell"><p className="personalisation-eyebrow">Tiny Titans Community</p><h1>🌍 Contribution Dashboard</h1><div className="personalisation-card"><p>Loading your contribution activity…</p></div></section></main>;
  }

  if (!user) return null;

  return <main className="page-container"><section className="personalisation-shell">
    <button className="personalisation-back" type="button" onClick={() => navigate(-1)}>← Back</button>
    <p className="personalisation-eyebrow">Tiny Titans Community</p>
    <h1>🌍 Your Contribution</h1>
    <p>One place for everything you contribute to Tiny Titans — from Morph Library evidence and behaviour observations to feedback, bug reports and optional anonymised Intelligence data.</p>

    {error && <div className="setup-error" role="alert">{error}</div>}

    <section className="personalisation-card" style={{ background: "linear-gradient(135deg,rgba(111,36,184,.18),rgba(0,174,255,.08),rgba(245,182,66,.06))" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
        <div><span style={{ display: "block", opacity: .72, fontWeight: 800 }}>YOUR CONTRIBUTIONS</span><strong style={{ display: "block", fontSize: "2.5rem", marginTop: "4px" }}>{counts.communityContributions}</strong><small>submitted community contributions</small></div>
        <div><span style={{ display: "block", opacity: .72, fontWeight: 800 }}>GLOBAL COMMUNITY CONTRIBUTIONS</span><strong style={{ display: "block", fontSize: "2.5rem", marginTop: "4px" }}>{safeNumber(globalSnapshot?.totalRecords)}</strong><small>recorded across the shared public contribution layer</small></div>
        <div><span style={{ display: "block", opacity: .72, fontWeight: 800 }}>CONTRIBUTING KEEPERS</span><strong style={{ display: "block", fontSize: "2.5rem", marginTop: "4px" }}>{safeNumber(globalSnapshot?.contributors)}</strong><small>keepers represented in the global total</small></div>
      </div>
    </section>

    <section className="personalisation-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
        <div><h2>📚 Community contribution categories</h2><p style={{ marginBottom: 0, opacity: .72 }}>These are the things you can actively contribute for other keepers to learn from or for Tiny Titans to improve.</p></div>
        <Link className="personalisation-link" to="/make-contribution">＋ See everything I can contribute →</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "12px", marginTop: "16px" }}>
        {contributionCards.map((item) => <ContributionCardView key={item.title} item={item} />)}
      </div>
    </section>

    <section className="personalisation-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div><h2>🧠 Optional Intelligence contribution</h2><p>{preferences.communityHusbandryData ? "ACTIVE — eligible personal husbandry records can be used in anonymised aggregate analysis." : "OFF — your personal husbandry records stay in your account unless you enable this optional contribution."}</p></div>
        <button className="personalisation-save" type="button" onClick={() => void toggleContribution()} disabled={saving}>{saving ? "Saving…" : preferences.communityHusbandryData ? "Stop contributing" : "Enable contribution"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", marginTop: "14px" }}>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.5rem", display: "block" }}>{counts.weights}</strong><span>Weight records</span></div>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.5rem", display: "block" }}>{counts.feedings}</strong><span>Feeding records</span></div>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.5rem", display: "block" }}>{counts.sheds}</strong><span>Shed records</span></div>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.5rem", display: "block" }}>{counts.health}</strong><span>Health records</span></div>
      </div>
      <p style={{ marginBottom: 0, marginTop: "14px", opacity: .7 }}>{preferences.communityHusbandryData ? `${counts.intelligenceRecords} eligible personal records are currently included in your optional Intelligence contribution.` : `${counts.contributablePersonalRecords} personal tracker records are available to contribute if you choose to opt in.`}</p>
    </section>

    <section className="personalisation-card">
      <h2>🐍 Your personal tracker activity</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "10px" }}>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.6rem", display: "block" }}>{counts.snakes}</strong><span>Snakes tracked</span></div>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.6rem", display: "block" }}>{counts.weights}</strong><span>Weight records</span></div>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.6rem", display: "block" }}>{counts.feedings}</strong><span>Feeding records</span></div>
        <div style={{ padding: "14px", borderRadius: "13px", background: "rgba(255,255,255,.05)" }}><strong style={{ fontSize: "1.6rem", display: "block" }}>{counts.sheds}</strong><span>Shed records</span></div>
      </div>
      <p style={{ opacity: .68, marginBottom: 0 }}>These are records stored in your personal trackers. They are separate from your community contribution total unless you explicitly enable the optional Intelligence contribution above.</p>
    </section>

    <section className="personalisation-card">
      <h2>🔒 Privacy and contribution boundaries</h2>
      <ul>
        <li>Your community contribution total counts things you actively submit or share through a community workflow.</li>
        <li>Private tracker records are not automatically turned into community contributions.</li>
        <li>Optional Intelligence participation can be switched off at any time.</li>
        <li>Anonymous community contributions can still count towards the global total without exposing your identity.</li>
      </ul>
      {message && <p className="personalisation-saved" role="status">✓ {message}</p>}
      <button className="personalisation-link" type="button" onClick={() => navigate("/account/data-privacy")}>Manage all Data &amp; Privacy choices →</button>
    </section>
  </section></main>;
}
