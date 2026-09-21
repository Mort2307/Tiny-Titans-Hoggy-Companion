import { Link } from "react-router-dom";
import { useContributionDashboard } from "../hooks/useContributionDashboard";
import { formatContributionDate, safeNumber } from "../lib/contributionDashboard";
import "../styles/contribution-dashboard.css";

export default function ContributionDashboard() {
  const {
    navigate, user, preferences, globalSnapshot, globalFeed, loading, saving, message, error,
    counts, events, categories, publicRecords, intelligenceRecords, totalGlobal, globalKeepers,
    toggleContribution,
  } = useContributionDashboard();

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
          <span className="contribution-dashboard-ledger-icon" aria-hidden="true">{event.icon}</span><div><h3>{event.category} · {event.title}</h3><p>{event.detail.slice(0, 240)}{event.detail.length > 240 ? "…" : ""}</p><div className="contribution-dashboard-ledger-meta">{event.status ?? "Recorded"}{event.date ? ` · ${formatContributionDate(event.date)}` : ""}</div></div>{event.link && <Link to={event.link}>Open →</Link>}
        </article>)}</div>}
      </div>

      <div className="contribution-dashboard-panel">
        <div className="contribution-dashboard-section-head"><div><h2>🌍 Global activity feed</h2><p>Recent publicly shareable contribution activity. Attribution shown here follows each contributor’s chosen credit mode.</p></div></div>
        {globalFeed.length === 0 ? <div className="contribution-dashboard-empty">No public activity is available yet. Aggregate Intelligence can still be active without exposing individual records.</div> : <div className="contribution-dashboard-global-feed">{globalFeed.slice(0, 40).map((item) => <article className="contribution-dashboard-global-item" key={`${item.source}-${item.id}`}><span>{item.source} · {item.contributor}</span><h3>{item.category} · {item.title}</h3><p>{item.snippet}</p><small>{formatContributionDate(item.createdAt)}</small></article>)}</div>}
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

