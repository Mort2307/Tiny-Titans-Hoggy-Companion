import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCreatorCommunityIntelligence,
  type CreatorCommunityIntelligence,
} from "../services/creatorCommunityIntelligenceService";
import "../styles/creatorCommunityIntelligence.css";

type TileKey =
  | "consent"
  | "activity"
  | "network"
  | "locations"
  | "engagement"
  | "operations"
  | "mentors"
  | "contributions";

const fmt = (value: number) => new Intl.NumberFormat("en-GB").format(value);
const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";

const queueRoutes: Partial<Record<TileKey, { label: string; path: string }>> = {
  operations: { label: "Open Community Operations →", path: "/creator/issues" },
  contributions: { label: "Open Morph Submission Review →", path: "/creator/submissions" },
  mentors: { label: "Open Mentor Review →", path: "/creator/mentor-review" },
  network: { label: "Open Mentor Review →", path: "/creator/mentor-review" },
};

export default function CreatorCommunityIntelligence() {
  const [data, setData] = useState<CreatorCommunityIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTile, setOpenTile] = useState<TileKey | null>(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setData(await getCreatorCommunityIntelligence());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Community intelligence could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const tiles = useMemo(() => {
    if (!data) return [];
    const { consent, network, activity } = data;

    return [
      { key: "consent" as const, icon: "🔐", value: pct(consent.anyCommunityConsent, consent.registered), label: "Community consent", detail: `${fmt(consent.anyCommunityConsent)} of ${fmt(consent.registered)} users have at least one community-data permission.` },
      { key: "activity" as const, icon: "⚡", value: fmt(consent.activeWeek), label: "Active this week", detail: `${fmt(consent.activeToday)} today · ${fmt(consent.activeMonth)} this month.` },
      { key: "network" as const, icon: "🌐", value: fmt(network.mentors), label: "Mentor network", detail: `${fmt(network.verifiedMentors)} verified · ${fmt(network.mentorApplications)} applications.` },
      { key: "locations" as const, icon: "📍", value: fmt(consent.locations), label: "Visible communities", detail: `${fmt(consent.locations)} consented city/country locations available to the creator globe.` },
      { key: "engagement" as const, icon: "🐍", value: fmt(consent.contributorsWithSnakes), label: "Contributing keepers", detail: `${pct(consent.contributorsWithSnakes, consent.registered)} of registered users have consent + snake data.` },
      { key: "operations" as const, icon: "🧰", value: fmt(activity.openBugReports), label: "Community operations", detail: `${fmt(activity.bugReports)} bugs · ${fmt(activity.feedback)} feedback · ${fmt(activity.morphSubmissions)} morph submissions.` },
      { key: "mentors" as const, icon: "🤝", value: fmt(network.mentorshipRequests), label: "Mentorship pipeline", detail: `${fmt(network.pendingMentorshipRequests)} awaiting action · ${fmt(network.acceptedMentorships)} accepted.` },
      { key: "contributions" as const, icon: "📚", value: fmt(activity.feedback + activity.morphSubmissions), label: "Community contributions", detail: `${fmt(activity.feedback)} feedback + ${fmt(activity.morphSubmissions)} morph submissions + ${fmt(activity.founderApplications)} founder applications.` },
    ];
  }, [data]);

  const detail = useMemo(() => {
    if (!data || !openTile) return null;
    const { consent, network, activity } = data;
    const definitions: Record<TileKey, { title: string; why: string; rows: Array<[string, number]> }> = {
      consent: { title: "Permission & data coverage", why: "Shows the population eligible for each intelligence layer. A permission being OFF is not an error; it means that data must not be used for that purpose.", rows: [["Registered users", consent.registered], ["Setup complete", consent.setupComplete], ["Incomplete setup", consent.incomplete], ["Analytics consent ON", consent.analytics], ["Analytics consent OFF", consent.analyticsOff], ["Location consent ON", consent.location], ["Location consent OFF", consent.locationOff], ["Product updates ON", consent.productUpdates], ["Community husbandry ON", consent.communityHusbandry], ["Community husbandry OFF", consent.communityHusbandryOff], ["Any community consent", consent.anyCommunityConsent], ["Eligible keepers with snake data", consent.contributorsWithSnakes]] },
      activity: { title: "Community activity", why: "Activity is an engagement signal, not a statement about husbandry quality. It helps identify whether Tiny Titans is being used regularly.", rows: [["Active today", consent.activeToday], ["Active this week", consent.activeWeek], ["Active this month", consent.activeMonth], ["Registered users", consent.registered], ["Setup complete", consent.setupComplete], ["Contributing keepers", consent.contributorsWithSnakes]] },
      network: { title: "Mentor & mentorship network", why: "Shows the health of the keeper-to-keeper support network and where creator intervention may be useful.", rows: [["Mentor profiles", network.mentors], ["Verified mentors", network.verifiedMentors], ["Mentor applications", network.mentorApplications], ["Pending mentor applications", network.pendingMentorApplications], ["Mentorship requests", network.mentorshipRequests], ["Pending requests", network.pendingMentorshipRequests], ["Accepted mentorships", network.acceptedMentorships], ["Active workspaces", network.activeWorkspaces]] },
      locations: { title: "Community map coverage", why: "Only creator-visible approximate city/country locations are counted. Exact addresses and GPS coordinates are deliberately excluded.", rows: [["Location permission ON", consent.location], ["Creator-visible locations", consent.locations], ["Location permission OFF", consent.locationOff], ["Registered users", consent.registered]] },
      engagement: { title: "Keeper participation", why: "Identifies the population that can legitimately contribute husbandry intelligence without exposing individual husbandry records here.", rows: [["Contributing keepers", consent.contributorsWithSnakes], ["Community husbandry consent", consent.communityHusbandry], ["Community husbandry not enabled", consent.communityHusbandryOff], ["Registered users", consent.registered], ["Setup complete", consent.setupComplete]] },
      operations: { title: "Community operations", why: "These are live workflow queues. They tell you what is arriving and what still needs attention without exposing private user records.", rows: [["Bug / issue reports", activity.bugReports], ["Open bug reports", activity.openBugReports], ["Feedback records", activity.feedback], ["New feedback", activity.newFeedback], ["Morph submissions", activity.morphSubmissions], ["Pending morph submissions", activity.pendingMorphSubmissions], ["Founder applications", activity.founderApplications], ["Pending founder applications", activity.pendingFounderApplications]] },
      mentors: { title: "Mentorship pipeline", why: "Shows demand versus available mentorship capacity so you can spot bottlenecks, unanswered requests and opportunities to recruit or support mentors.", rows: [["Mentorship requests", network.mentorshipRequests], ["Pending requests", network.pendingMentorshipRequests], ["Accepted", network.acceptedMentorships], ["Active workspaces", network.activeWorkspaces], ["Mentor applications", network.mentorApplications], ["Pending mentor applications", network.pendingMentorApplications], ["Verified mentors", network.verifiedMentors]] },
      contributions: { title: "Community contribution footprint", why: "Combines the main creator-facing contribution streams so you can see where the community is actually feeding information back into Tiny Titans.", rows: [["Feedback items", activity.feedback], ["New feedback", activity.newFeedback], ["Morph submissions", activity.morphSubmissions], ["Pending morph submissions", activity.pendingMorphSubmissions], ["Founder applications", activity.founderApplications], ["Pending founder applications", activity.pendingFounderApplications], ["Bug reports", activity.bugReports]] },
    };
    return definitions[openTile];
  }, [data, openTile]);

  return (
    <section className="creator-admin-section creator-intelligence-section">
      <div className="creator-section-heading">
        <div>
          <span className="creator-admin-kicker">LIVE CREATOR SNAPSHOT</span>
          <h2>🌍 Tiny Titans Community</h2>
          <p>Consent-controlled global intelligence. Aggregates only: no exact addresses, GPS coordinates or individual husbandry records are exposed here.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "↻ Refreshing…" : "↻ Refresh intelligence"}</button>
      </div>

      {error && <div className="creator-error" role="alert">{error}</div>}
      {data?.unavailableSources.length ? <div className="creator-warning" role="status"><strong>⚠️ Partial intelligence coverage</strong><span>{fmt(data.unavailableSources.length)} source{data.unavailableSources.length === 1 ? " is" : "s are"} restricted or unavailable. Restricted sources are never silently treated as zero.</span></div> : null}

      {loading && !data ? <div className="creator-loading">Building the global community picture…</div> : <div className="creator-global-grid creator-intelligence-grid">{tiles.map((tile) => <button key={tile.key} type="button" className="creator-global-card creator-global-card-button creator-intelligence-card" onClick={() => setOpenTile(tile.key)}><span>{tile.icon}</span><strong>{tile.value}</strong><label>{tile.label}</label><small>{tile.detail}</small><em>Tap for intelligence →</em></button>)}</div>}

      {detail && data && <div className="creator-intelligence-detail" role="dialog" aria-modal="true" aria-label={detail.title}><div className="creator-intelligence-detail-inner"><div className="creator-section-heading"><div><span className="creator-admin-kicker">COMMUNITY INTELLIGENCE</span><h3>{detail.title}</h3></div><button type="button" onClick={() => setOpenTile(null)} aria-label="Close intelligence">✕</button></div><p className="creator-intelligence-why"><strong>What this tells you:</strong> {detail.why}</p><div className="creator-intelligence-rows">{detail.rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{fmt(Number(value))}</strong></div>)}</div><div className="creator-intelligence-source-list"><h4>🔎 Data source & eligibility</h4>{data.sources.map((source) => <div key={source.source} className={source.available ? "is-available" : "is-restricted"}><strong>{source.available ? "🟢" : "🟠"} {source.source}</strong><span>{source.reason}</span>{typeof source.count === "number" && <small>{fmt(source.count)} records available</small>}</div>)}</div>{queueRoutes[openTile] && <Link className="creator-intelligence-action" to={queueRoutes[openTile].path} onClick={() => setOpenTile(null)}>{queueRoutes[openTile].label}</Link>}<p className="creator-intelligence-note">These figures are live aggregate counts from the current Firebase dataset. Permission categories are intentionally separated so the creator can see exactly why a population is or is not eligible for a particular intelligence feature. No exact addresses, GPS coordinates, private health records or private husbandry notes are displayed here.</p></div></div>}
    </section>
  );
}
