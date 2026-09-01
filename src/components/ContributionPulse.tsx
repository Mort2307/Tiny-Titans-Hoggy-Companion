import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPrivacyPreferences } from "../services/privacyService";
import { getUserFeedback, getUserIssueReports } from "../services/creatorService";
import { getUserKeeperObservations } from "../services/keeperObservationService";
import { getUserMorphSubmissions } from "../services/morphUserSubmissionService";
import { getUserSnakes } from "../services/snakeService";
import { getPublicCommunityContributionFeed, getPublicCommunityContributionSnapshot, type PublicContributionEntry, type PublicContributionSnapshot } from "../services/communityIntelligenceService";
import { useAuth } from "../context/useAuth";
import type { PrivacyPreferences } from "../types/privacy";
import type { Feedback } from "../types/feedback";
import type { ReportIssue } from "../types/reportIssue";
import type { KeeperObservation } from "../types/keeperObservation";
import type { Snake } from "../types/Snake";
import type { UserMorphSubmission } from "../types/morphSubmission";
import "../styles/contribution-pulse.css";

type ModalMode = "personal" | "global" | null;

type PersonalContribution = {
  id: string;
  category: string;
  title: string;
  snippet: string;
  status?: string;
  link?: string;
  createdAt?: unknown;
};

function safeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normaliseStatus(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function contributionDate(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatContributionDate(value: unknown): string {
  const millis = contributionDate(value);
  if (!millis) return "Date not recorded";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(millis);
}

export default function ContributionPulse() {
  const { user } = useAuth();
  const [observations, setObservations] = useState<KeeperObservation[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [bugs, setBugs] = useState<ReportIssue[]>([]);
  const [morphSubmissions, setMorphSubmissions] = useState<UserMorphSubmission[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyPreferences | null>(null);
  const [globalFeed, setGlobalFeed] = useState<PublicContributionEntry[]>([]);
  const [globalSnapshot, setGlobalSnapshot] = useState<PublicContributionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [nextObservations, nextFeedback, nextBugs, nextMorphSubmissions, nextPrivacy, nextSnakes, nextGlobalFeed, nextGlobalSnapshot] = await Promise.all([
      getUserKeeperObservations(user.uid).catch(() => [] as KeeperObservation[]),
      getUserFeedback(user.uid).catch(() => [] as Feedback[]),
      getUserIssueReports(user.uid).catch(() => [] as ReportIssue[]),
      getUserMorphSubmissions(user.uid).catch(() => [] as UserMorphSubmission[]),
      getPrivacyPreferences(user.uid).catch(() => null),
      getUserSnakes(user.uid).catch(() => [] as Snake[]),
      getPublicCommunityContributionFeed().catch(() => ({ entries: [] })),
      getPublicCommunityContributionSnapshot().catch(() => null),
    ]);
    setObservations(nextObservations);
    setFeedback(nextFeedback);
    setBugs(nextBugs);
    setMorphSubmissions(nextMorphSubmissions);
    setPrivacy(nextPrivacy);
    setSnakes(nextSnakes);
    setGlobalFeed(nextGlobalFeed.entries ?? []);
    setGlobalSnapshot(nextGlobalSnapshot);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("community-contribution-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("community-contribution-changed", refresh);
    };
  }, [load]);

  const personalCounts = useMemo(() => {
    const weights = snakes.reduce((total, snake) => total + safeCount(snake.weightHistory?.length), 0);
    const feedings = snakes.reduce((total, snake) => total + safeCount(snake.feedingHistory?.length), 0);
    const sheds = snakes.reduce((total, snake) => total + safeCount(snake.shedHistory?.length), 0);
    const intelligenceRecords = privacy?.communityHusbandryData === true ? weights + feedings + sheds : 0;
    return { contributions: observations.length + feedback.length + bugs.length + morphSubmissions.length, observations: observations.length, feedback: feedback.length, bugs: bugs.length, morphs: morphSubmissions.length, intelligenceRecords, snakes: snakes.length };
  }, [observations, feedback, bugs, morphSubmissions, snakes, privacy]);

  const personalItems = useMemo<PersonalContribution[]>(() => {
    const items: PersonalContribution[] = [];
    observations.forEach((item) => {
      const data = item as KeeperObservation & Record<string, unknown>;
      items.push({ id: `observation-${String(item.id)}`, category: "Behaviour Observatory", title: String(data.title || data.behaviourName || data.observationTitle || data.primaryCategory || "Behaviour observation"), snippet: String(data.description || data.observation || "Keeper-submitted observation."), status: normaliseStatus(item.status), link: "/behaviour-observatory", createdAt: data.createdAt || data.submittedAt || data.updatedAt });
    });
    feedback.forEach((item) => {
      const data = item as Feedback & Record<string, unknown>;
      items.push({ id: `feedback-${String(data.id || data.createdAt || items.length)}`, category: "Feedback", title: String(data.subject || data.title || "Feedback sent to Tiny Titans"), snippet: String(data.message || data.description || "Feedback contribution."), status: normaliseStatus(data.status), link: "/feedback", createdAt: data.createdAt || data.updatedAt });
    });
    bugs.forEach((item) => {
      const data = item as ReportIssue & Record<string, unknown>;
      items.push({ id: `bug-${String(data.id || data.createdAt || items.length)}`, category: "Bug report", title: String(data.title || data.subject || "Bug report"), snippet: String(data.description || data.details || "Issue reported to Tiny Titans."), status: normaliseStatus(data.status), link: "/my-issue-reports", createdAt: data.createdAt || data.updatedAt });
    });
    morphSubmissions.forEach((item) => {
      items.push({ id: `morph-${item.id}`, category: "Morph Library", title: item.submittedName, snippet: item.description || "Keeper-submitted Morph Library evidence or terminology.", status: normaliseStatus(item.status), link: "/morph-library", createdAt: item.createdAt });
    });
    return items.sort((a, b) => contributionDate(b.createdAt) - contributionDate(a.createdAt)).slice(0, 80);
  }, [observations, feedback, bugs, morphSubmissions]);

  const personalDisplayItems = personalItems.length ? personalItems : [{ id: "empty", category: "Community", title: "No contributions recorded yet", snippet: "Your future observations, feedback and community contributions will appear here." }];

  return (
    <>
      <section className="contribution-pulse" aria-label="Tiny Titans contribution tracker">
        <div className="contribution-pulse-heading">
          <div>
            <span>🌍 TINY TITANS CONTRIBUTION PULSE</span>
            <strong>{loading ? "Loading contribution activity…" : "See the community growing"}</strong>
          </div>
          <Link to="/make-contribution">＋ Make a Contribution</Link>
        </div>

        <div className="contribution-pulse-grid">
          <button type="button" className={`contribution-pulse-card contribution-pulse-card--button ${personalCounts.contributions || personalCounts.intelligenceRecords ? "is-active" : "is-muted"}`} onClick={() => setModal("personal")}>
            <small>YOUR CONTRIBUTION</small>
            <strong>{loading ? "…" : personalCounts.contributions + personalCounts.intelligenceRecords}</strong>
            <span>eligible contributions and Intelligence records</span>
            <div className="contribution-pulse-mini"><b>{personalCounts.snakes}</b> {personalCounts.snakes === 1 ? "snake" : "snakes"} tracked · Click to view yours →</div>
          </button>

          <button type="button" className="contribution-pulse-card contribution-pulse-card--button global-card" onClick={() => setModal("global")}>
            <small>GLOBAL CONTRIBUTIONS</small>
            <strong>{loading ? "…" : safeCount(globalSnapshot?.totalRecords)}</strong>
            <span>community contributions recorded by Tiny Titans</span>
            <div className="contribution-pulse-mini"><b>{safeCount(globalSnapshot?.contributors)}</b> contributing keepers · Click to explore →</div>
          </button>
        </div>
      </section>

      {modal && (
        <div className="contribution-pulse-modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section className="contribution-pulse-modal" role="dialog" aria-modal="true" aria-labelledby="contribution-pulse-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="contribution-pulse-modal-head">
              <div>
                <span>{modal === "personal" ? "YOUR CONTRIBUTIONS" : "GLOBAL TINY TITANS"}</span>
                <h2 id="contribution-pulse-modal-title">{modal === "personal" ? "Your contribution history" : "What the community is contributing"}</h2>
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Close contribution details">×</button>
            </div>

            {modal === "personal" ? (
              <div className="contribution-pulse-list">
                {personalDisplayItems.map((item) => (
                  <article key={item.id} className="contribution-pulse-list-item">
                    <div>
                      <span>{item.category}</span>
                      <h3>{item.title}</h3>
                      <p>{item.snippet.slice(0, 220)}{item.snippet.length > 220 ? "…" : ""}</p>
                      <small>{item.status ? `Status: ${item.status}` : "Personal contribution"}{item.createdAt ? ` · ${formatContributionDate(item.createdAt)}` : ""}</small>
                    </div>
                    {item.link && <Link to={item.link} onClick={() => setModal(null)}>Open →</Link>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="contribution-pulse-list">
                {globalFeed.length ? globalFeed.map((item) => (
                  <article key={`${item.source}-${item.id}`} className="contribution-pulse-list-item">
                    <div>
                      <span>{item.contributor}</span>
                      <h3>{item.category} · {item.title}</h3>
                      <p>{item.snippet}</p>
                      <small>{item.source} · {formatContributionDate(item.createdAt)}</small>
                    </div>
                  </article>
                )) : (
                  <div className="contribution-pulse-empty"><strong>🌱 No public contributions yet.</strong><p>Approved contributions with public attribution will appear here. Anonymous contributions remain anonymous.</p></div>
                )}
              </div>
            )}

            <div className="contribution-pulse-modal-foot">
              <Link to={modal === "personal" ? "/account/contributions" : "/community"} onClick={() => setModal(null)}>{modal === "personal" ? "Open My Contributions →" : "Explore Community →"}</Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
