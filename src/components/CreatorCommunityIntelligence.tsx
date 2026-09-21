import { Link } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
import ContributorThankYouCentre from "./ContributorThankYouCentre";
import { useCreatorCommunityIntelligence } from "../hooks/useCreatorCommunityIntelligence";
import { formatCommunityNumber } from "../lib/creatorCommunityIntelligence";
import "../styles/creatorCommunityIntelligence.css";

export default function CreatorCommunityIntelligence() {
  const {
    data, loading, error, openTile, setOpenTile, showThankYous, setShowThankYous,
    refresh, tiles, detail, selectedQueueRoute,
  } = useCreatorCommunityIntelligence();

  return () => document.removeEventListener("keydown", onKeyDown);
  }, [openTile, showThankYous]);

  const tiles = useMemo(() => {
    if (!data) return [];
    const { consent, network, activity } = data;
    return [
      { key: "consent" as const, icon: "🔐", value: pct(consent.anyCommunityConsent, consent.registered), label: "Community consent" },
      { key: "activity" as const, icon: "⚡", value: fmt(consent.activeWeek), label: "Active this week" },
      { key: "network" as const, icon: "🌐", value: fmt(network.mentors), label: "Mentor network" },
      { key: "locations" as const, icon: "📍", value: fmt(consent.locations), label: "Map-represented users" },
      { key: "engagement" as const, icon: "🐍", value: fmt(consent.contributorsWithSnakes), label: "Contributing keepers" },
      { key: "operations" as const, icon: "🧰", value: fmt(activity.openBugReports), label: "Community operations" },
      { key: "mentors" as const, icon: "🤝", value: fmt(network.mentorshipRequests), label: "Mentorship pipeline" },
      { key: "contributions" as const, icon: "📚", value: fmt(activity.feedback + activity.morphSubmissions), label: "Community contributions" },
    ];
  }, [data]);

  const detail = useMemo(() => {
    if (!data || !openTile) return null;
    const { consent, network, activity } = data;
    const definitions: Record<TileKey, { title: string; why: string; rows: Array<[string, number]> }> = {
      consent: { title: "Permission & data coverage", why: "Shows the population eligible for each intelligence layer. A permission being OFF is not an error; it means that data must not be used for that purpose.", rows: [["Registered users", consent.registered], ["Setup complete", consent.setupComplete], ["Incomplete setup", consent.incomplete], ["Analytics consent ON", consent.analytics], ["Analytics consent OFF", consent.analyticsOff], ["Location consent ON", consent.location], ["Location consent OFF", consent.locationOff], ["Location records requiring repair", consent.locationInvalid], ["Product updates ON", consent.productUpdates], ["Community husbandry ON", consent.communityHusbandry], ["Community husbandry OFF", consent.communityHusbandryOff], ["Any community consent", consent.anyCommunityConsent], ["Eligible keepers with snake data", consent.contributorsWithSnakes]] },
      activity: { title: "Community activity", why: "Activity is an engagement signal, not a statement about husbandry quality. It helps identify whether Tiny Titans is being used regularly.", rows: [["Active today", consent.activeToday], ["Active this week", consent.activeWeek], ["Active this month", consent.activeMonth], ["Registered users", consent.registered], ["Setup complete", consent.setupComplete], ["Contributing keepers", consent.contributorsWithSnakes]] },
      network: { title: "Mentor & mentorship network", why: "Shows the health of the keeper-to-keeper support network and where creator intervention may be useful.", rows: [["Mentor profiles", network.mentors], ["Verified mentors", network.verifiedMentors], ["Mentor applications", network.mentorApplications], ["Pending mentor applications", network.pendingMentorApplications], ["Mentorship requests", network.mentorshipRequests], ["Pending requests", network.pendingMentorshipRequests], ["Accepted mentorships", network.acceptedMentorships], ["Active workspaces", network.activeWorkspaces]] },
      locations: { title: "Community map coverage", why: "A map-represented user has location consent, a usable city/country and either stored valid coordinates or a successfully geocodable city-level fallback. Multiple users may share one community area.", rows: [["Location consent ON", consent.location], ["Map-represented users", consent.locations], ["Location records requiring repair", consent.locationInvalid], ["Location permission OFF", consent.locationOff], ["Registered users", consent.registered]] },
      engagement: { title: "Keeper participation", why: "Identifies the population that can legitimately contribute husbandry intelligence without exposing individual husbandry records here.", rows: [["Contributing keepers", consent.contributorsWithSnakes], ["Community husbandry consent", consent.communityHusbandry], ["Community husbandry not enabled", consent.communityHusbandryOff], ["Registered users", consent.registered], ["Setup complete", consent.setupComplete]] },
      operations: { title: "Community operations", why: "These are live workflow queues. They tell you what is arriving and what still needs attention without exposing private user records.", rows: [["Bug / issue reports", activity.bugReports], ["Open bug reports", activity.openBugReports], ["Feedback records", activity.feedback], ["New feedback", activity.newFeedback], ["Morph submissions", activity.morphSubmissions], ["Pending morph submissions", activity.pendingMorphSubmissions], ["Founder applications", activity.founderApplications], ["Pending founder applications", activity.pendingFounderApplications]] },
      mentors: { title: "Mentorship pipeline", why: "Shows demand versus available mentorship capacity so you can spot bottlenecks, unanswered requests and opportunities to recruit or support mentors.", rows: [["Mentorship requests", network.mentorshipRequests], ["Pending requests", network.pendingMentorshipRequests], ["Accepted", network.acceptedMentorships], ["Active workspaces", network.activeWorkspaces], ["Mentor applications", network.mentorApplications], ["Pending mentor applications", network.pendingMentorApplications], ["Verified mentors", network.verifiedMentors]] },
      contributions: { title: "Community contribution footprint", why: "Combines the main creator-facing contribution streams so you can see where the community is actually feeding information back into Tiny Titans.", rows: [["Feedback items", activity.feedback], ["New feedback", activity.newFeedback], ["Morph submissions", activity.morphSubmissions], ["Pending morph submissions", activity.pendingMorphSubmissions], ["Founder applications", activity.founderApplications], ["Pending founder applications", activity.pendingFounderApplications], ["Bug reports", activity.bugReports]] },
    };
    return definitions[openTile];
  }, [data, openTile]);

  const selectedQueueRoute = openTile ? queueRoutes[openTile] : undefined;

  return (
    <section className="creator-admin-section creator-intelligence-section">
      <div className="creator-section-heading">
        <div><span className="creator-admin-kicker">LIVE CREATOR SNAPSHOT</span><h2><TinyTitansIcon name="community" size={22} /> Tiny Titans Community</h2><p>Consent-controlled global intelligence. Aggregates only: no exact addresses, GPS coordinates or individual husbandry records are exposed here.</p></div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "↻ Refreshing…" : "↻ Refresh intelligence"}</button>
      </div>
      {error && <div className="creator-error" role="alert">{error}</div>}
      {data?.unavailableSources.length ? <div className="creator-warning" role="status"><strong><TinyTitansIcon name="warning" size={18} /> Partial intelligence coverage</strong><span>{fmt(data.unavailableSources.length)} source{data.unavailableSources.length === 1 ? " is" : "s are"} restricted or unavailable. Restricted sources are never silently treated as zero.</span></div> : null}
      {loading && !data ? <div className="creator-loading">Building the global community picture…</div> : <div className="creator-global-grid creator-intelligence-grid">
        {tiles.map((tile) => <button key={tile.key} type="button" className="creator-global-card creator-global-card-button creator-intelligence-card" onClick={() => setOpenTile(tile.key)} aria-haspopup="dialog" aria-label={`Open ${tile.label} intelligence`}><span><TinyTitansIcon name={tile.icon} size={22} /></span><strong>{tile.value}</strong><label>{tile.label}</label><em>Tap to explore</em></button>)}
        <button type="button" className="creator-global-card creator-global-card-button creator-intelligence-card" onClick={() => { setOpenTile(null); setShowThankYous(true); }} aria-haspopup="dialog" aria-label="Open contributor thank-you centre"><span><TinyTitansIcon name="messages" size={22} /><//span><strong>Thank</strong><label>Contributor Thank-Yous</label><em>Find & message contributors</em></button>
      </div>}
      {detail && data && <div className="creator-intelligence-detail" role="dialog" aria-modal="true" aria-label={detail.title} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenTile(null); }}><div className="creator-intelligence-detail-inner"><div className="creator-section-heading"><div><span className="creator-admin-kicker">COMMUNITY INTELLIGENCE</span><h3>{detail.title}</h3></div><button type="button" onClick={() => setOpenTile(null)} aria-label="Close intelligence"><TinyTitansIcon name="close" size={18} /></button></div><p className="creator-intelligence-why"><strong>What this tells you:</strong> {detail.why}</p><div className="creator-intelligence-rows">{detail.rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{fmt(Number(value))}</strong></div>)}</div><div className="creator-intelligence-source-list"><h4><TinyTitansIcon name="search" size={18} /> Data source & eligibility</h4>{data.sources.map((source) => <div key={source.source} className={source.available ? "is-available" : "is-restricted"}><strong>{source.available ? "🟢" : "🟠"} {source.source}</strong><span>{source.reason}</span>{typeof source.count === "number" && <small>{fmt(source.count)} records available</small>}</div>)}</div>{selectedQueueRoute && <Link className="creator-intelligence-action" to={selectedQueueRoute.path} onClick={() => setOpenTile(null)}>{selectedQueueRoute.label}</Link>}<p className="creator-intelligence-note">These figures are live aggregate counts from the current Firebase dataset. A user is considered map-represented only when the community-location permission is ON and their city/country can be mapped to a valid city-level point. No exact addresses, GPS coordinates, private health records or private husbandry notes are displayed here.</p></div></div>}
      {showThankYous && <ContributorThankYouCentre onClose={() => setShowThankYous(false)} />}
    </section>
  );
}

}
