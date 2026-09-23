import TinyTitansIcon from "../components/TinyTitansIcon";
import { Link, Navigate } from "react-router-dom";
import CreatorCommunityGlobe from "../components/CreatorCommunityGlobeV2";
import CreatorCommunityIntelligence from "../components/CreatorCommunityIntelligence";
import CreatorMorphLibraryEditor from "../components/CreatorMorphLibraryEditor";
import PageBackButton from "../components/PageBackButton";
import { useCreatorAdmin } from "../hooks/useCreatorAdmin";
import { creatorActivityBand, formatCreatorDate, formatCreatorNumber } from "../lib/creatorAdminAnalytics";
import "../styles/CreatorTools.css";
import "../styles/CreatorUsers.css";

export default function CreatorAdmin() {
  const {
    profile, stats, users, morphPending, bugPending, feedbackNew, loading, usersLoading, error,
    panel, setPanel, selectedUser, setSelectedUser, search, setSearch, claimBusy, claimMessage,
    setClaimMessage, now, filteredUsers, userInsights, loadDashboard, loadUsers, grantCreatorTesterClaim,
  } = useCreatorAdmin();

  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  return <section className="creator-admin-page">
    <div className="creator-admin-header"><div><PageBackButton fallbackPath="/" label="Back to App" /><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1><TinyTitansIcon name="creator" size={24} /> Tiny Titans Creator Centre</h1><p>One organised command centre for community intelligence, moderation, QA and app operations.</p></div><button type="button" onClick={() => { void loadDashboard(); void loadUsers(); }} disabled={loading || usersLoading}>{loading || usersLoading ? "↻ Loading…" : "↻ Refresh"}</button></div>
    {error && <div className="creator-error">{error}</div>}
    {claimMessage && <div className="creator-success" role="status">{claimMessage}</div>}
    {loading ? <div className="creator-loading">Loading global Tiny Titans intelligence…</div> : <>
      <CreatorCommunityIntelligence />
      <CreatorCommunityGlobe />
      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR OPERATIONS</span><h2><TinyTitansIcon name="creator" size={24} /> Tools & queues</h2><p>Everything you need to run, review and improve Tiny Titans without hunting through tiny links.</p></div></div>
        <div className="creator-global-grid creator-tools-grid">
          <Link className="creator-global-card creator-feature-tile" to="/creator/species-preview"><span><TinyTitansIcon name="reptiles" size={22} /></span><strong>Species Preview Lab</strong><label>Species Intelligence QA</label><small>Preview every species currently in the registry and verify taxonomy, husbandry, feeding, breeding and safety data follow the selected species.</small><span className="creator-feature-tile-cta">Open Species Preview Lab →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/morph-library/evidence"><span><TinyTitansIcon name="knowledge" size={22} /></span><strong>Morph Evidence Audit</strong><label>Source & Genetics QA</label><small>Audit every published morph against its evidence status, source links and calculator eligibility. Unmapped entries are surfaced instead of silently treated as facts.</small><span className="creator-feature-tile-cta">Open Morph Evidence Audit →</span></Link>
          <button type="button" className="creator-global-card creator-feature-tile" onClick={() => setPanel("morph-editor")}><span><TinyTitansIcon name="morph" size={22} /></span><strong>Morph Library Editor</strong><label>Approved image maintenance</label><small>Search a morph, crop images, swap incorrect assignments, move images and edit contributor credit.</small><span className="creator-feature-tile-cta">Open Morph Library Editor →</span></button>
          <Link className="creator-global-card creator-feature-tile" to="/creator/submissions"><span><TinyTitansIcon name="genetics" size={22} /></span><strong>{morphPending} Morph Submissions</strong><label>Submission Review</label><small>Inspect uploaded photographs, proof and genetics notes before approval.</small><span className="creator-feature-tile-cta">Open Submission Review →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/issues"><span><TinyTitansIcon name="testing" size={22} /></span><strong>{bugPending} Bug Reports</strong><label>Bug Report Review</label><small>Review community bugs, severity, reproduction information, attachments, platform and app version.</small><span className="creator-feature-tile-cta">Open Bug Reports →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/issues"><span><TinyTitansIcon name="messages" size={22} /></span><strong>{feedbackNew} Feedback</strong><label>Feedback Review</label><small>Review ideas, suggestions, usability feedback and creator decisions in a dedicated queue.</small><span className="creator-feature-tile-cta">Open Feedback →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/tester"><span><TinyTitansIcon name="testing" size={22} /></span><strong>Tester Bot Centre</strong><label>Automated QA & Diagnostics</label><small>Run the targeted Tiny Titans QA suites across core, trackers, genetics, notifications and feedback.</small><span className="creator-feature-tile-cta">Open Tester Centre →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/tester/paid-tiers"><span><TinyTitansIcon name="billing" size={22} /></span><strong>Paid Tier Control</strong><label>Subscriptions, trials & tester access</label><small>See the effective tier of every user, grant or revoke paid trials, and open the paid-feature tester without touching live billing.</small><span className="creator-feature-tile-cta">Open Paid Tier Control →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/community"><span><TinyTitansIcon name="messages" size={22} /></span><strong>Community Manager</strong><label>Announcements & Known Issues</label><small>Publish updates, tester notices, release notes and known-issue information.</small><span className="creator-feature-tile-cta">Open Community Manager →</span></Link>
          <Link className="creator-global-card creator-feature-tile" to="/creator/community"><span><TinyTitansIcon name="health" size={22} /></span><strong>Moderation & Reports</strong><label>Community Operations</label><small>Keep reports, moderation workflows and creator-facing communications in one place.</small><span className="creator-feature-tile-cta">Open Operations →</span></Link>
        </div>
      </section>
      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">QUICK ACCESS</span><h2><TinyTitansIcon name="weight" size={24} /> App intelligence</h2></div></div>
        <div className="creator-actions"><button className="secondary-button" type="button" onClick={() => setPanel("users")}><TinyTitansIcon name="community" size={24} /> Browse Users</button><button className="secondary-button" type="button" onClick={() => setPanel("trackers")}><TinyTitansIcon name="weight" size={24} /> Tracker Analytics</button><button className="secondary-button" type="button" onClick={() => setPanel("snakes")}><TinyTitansIcon name="reptile" size={24} /> Snake Overview</button></div>
      </section>
    </>}

    {panel === "morph-editor" && <section className="creator-admin-section" id="creator-morph-library-editor"><div className="creator-section-heading"><div><span className="creator-admin-kicker">SPECIALIST TOOL</span><h2><TinyTitansIcon name="morph" size={24} /> Morph Library Editor</h2><p>Maintain approved community imagery without changing the canonical genetics database.</p></div><button type="button" onClick={() => setPanel(null)}><TinyTitansIcon name="close" size={24} /> Close editor</button></div><CreatorMorphLibraryEditor /></section>}

    {panel === "users" && <section className="creator-admin-section">
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">GLOBAL USER OVERVIEW</span><h2><TinyTitansIcon name="community" size={24} /> Users</h2><p>Tap an account to see creator-safe usage, permissions and engagement signals. Private contact details and private tracker records are intentionally excluded.</p></div><button type="button" onClick={() => void loadUsers()} disabled={usersLoading}>{usersLoading ? "Loading…" : "↻ Refresh users"}</button></div>
      <div className="creator-global-grid creator-tools-grid">
        <div className="creator-global-card"><span><TinyTitansIcon name="community" size={22} /></span><strong>{formatCreatorNumber(users.length)}</strong><label>Registered accounts</label><small>Current user documents visible to the Creator Centre.</small></div>
        <div className="creator-global-card"><span><TinyTitansIcon name="check" size={22} /></span><strong>{formatCreatorNumber(userInsights.bands.today + userInsights.bands.week)}</strong><label>Active within 7 days</label><small>{formatCreatorNumber(userInsights.bands.today)} today · {formatCreatorNumber(userInsights.bands.week)} earlier this week.</small></div>
        <div className="creator-global-card"><span><TinyTitansIcon name="warning" size={22} /></span><strong>{formatCreatorNumber(userInsights.bands.month + userInsights.bands.cooling)}</strong><label>Cooling / monthly users</label><small>Users who may benefit from a nudge, new content or a check-in.</small></div>
        <div className="creator-global-card"><span><TinyTitansIcon name="info" size={22} /></span><strong>{formatCreatorNumber(userInsights.setupComplete)}</strong><label>Setup complete</label><small>{users.length ? Math.round((userInsights.setupComplete / users.length) * 100) : 0}% of the visible registered population.</small></div>
        <div className="creator-global-card"><span><TinyTitansIcon name="community" size={22} /></span><strong>{formatCreatorNumber(userInsights.locationOn)}</strong><label>Location consent</label><small>Approximate city/country community mapping enabled.</small></div>
        <div className="creator-global-card"><span><TinyTitansIcon name="titan" size={22} /></span><strong>{formatCreatorNumber(userInsights.husbandryOn)}</strong><label>Community husbandry consent</label><small>Eligible for the relevant aggregate husbandry intelligence layer.</small></div>
      </div>
      <div className="creator-user-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search account name, profile, experience, city, platform or version…" aria-label="Search users" /><strong>{filteredUsers.length} shown</strong></div>
      {usersLoading ? <div className="creator-loading">Loading registered users…</div> : <div className="creator-list">
        {filteredUsers.map((item) => { const band = creatorActivityBand(item.lastActiveAt, now); return <button className="creator-user-row" type="button" key={item.uid} onClick={() => { setSelectedUser(item); setClaimMessage(""); }}>
          <span className="creator-user-avatar">{item.displayName?.trim().charAt(0).toUpperCase() || "T"}</span>
          <span className="creator-user-main"><strong>{item.displayName || "Unnamed user"}</strong><small>{item.profileType || "user"} · {item.experienceLevel || "experience not set"}</small></span>
          <span className="creator-user-meta"><strong>{band.label}</strong><small>{item.approximateLocation?.city && item.dataCollectionPreferences?.approximateLocation === true ? `${item.approximateLocation.city}, ${item.approximateLocation.country || ""}` : "Location not shared"}</small></span>
          <span aria-hidden="true">→</span>
        </button>; })}
        {filteredUsers.length === 0 && <div className="creator-list-item"><strong>No users found</strong><span>Try another search.</span></div>}
      </div>}
      <button type="button" onClick={() => setPanel(null)}>← Back to Creator Centre</button>
    </section>}

    {panel === "snakes" && <section className="creator-admin-section"><h2><TinyTitansIcon name="reptile" size={24} /> Snake Overview</h2><div className="creator-global-grid"><div className="creator-global-card"><span><TinyTitansIcon name="reptiles" size={22} /></span><strong>{formatCreatorNumber(stats.snakeProfiles)}</strong><label>Total Snake Profiles</label></div><div className="creator-global-card"><span><TinyTitansIcon name="weight" size={22} /></span><strong>{formatCreatorNumber(stats.weightLogs)}</strong><label>Weight Records</label></div><div className="creator-global-card"><span><TinyTitansIcon name="feeding" size={22} /></span><strong>{formatCreatorNumber(stats.mealsFed)}</strong><label>Feeding Records</label></div><div className="creator-global-card"><span><TinyTitansIcon name="shed" size={22} /></span><strong>{formatCreatorNumber(stats.shedsLogged)}</strong><label>Shed Cycles</label></div></div><button type="button" onClick={() => setPanel(null)}><TinyTitansIcon name="back" size={16} /> Back</button></section>}
    {panel === "trackers" && <section className="creator-admin-section"><h2><TinyTitansIcon name="weight" size={24} /> Tracker Analytics</h2><div className="creator-list"><div className="creator-list-card"><strong><TinyTitansIcon name="feeding" size={17} /> Feeding</strong><span>{formatCreatorNumber(stats.mealsFed)} canonical meals recorded globally.</span></div><div className="creator-list-card"><strong><TinyTitansIcon name="weight" size={17} /> Weight</strong><span>{formatCreatorNumber(stats.weightLogs)} canonical weight records · {formatCreatorNumber(stats.validWeightLogs ?? stats.weightLogs)} valid · {formatCreatorNumber(stats.invalidWeightLogs ?? 0)} data-quality candidates.</span></div><div className="creator-list-card"><strong><TinyTitansIcon name="shed" size={17} /> Sheds</strong><span>{formatCreatorNumber(stats.shedsLogged)} canonical shed cycles · {formatCreatorNumber(stats.validShedLogs ?? stats.shedsLogged)} with valid measurements · {formatCreatorNumber(stats.invalidShedLogs ?? 0)} missing/invalid measurements.</span></div><div className="creator-list-card"><strong><TinyTitansIcon name="genetics" size={17} /> Genetics</strong><span>{formatCreatorNumber(stats.geneticsCalculations)} persisted calculations.</span></div><div className="creator-list-card"><strong><TinyTitansIcon name="testing" size={17} /> Data quality</strong><span>{formatCreatorNumber(stats.dataQualityIssues ?? 0)} tracker data-quality candidates require review.</span></div></div><button type="button" onClick={() => setPanel(null)}><TinyTitansIcon name="back" size={16} /> Back</button></section>}

    {selectedUser && <div className="creator-user-modal-backdrop" role="presentation" onClick={() => setSelectedUser(null)}><section className="creator-user-modal" role="dialog" aria-modal="true" aria-labelledby="creator-user-title" onClick={(event) => event.stopPropagation()}>
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR-SAFE ACCOUNT INTELLIGENCE</span><h2 id="creator-user-title"><TinyTitansIcon name="account" size={22} /> {selectedUser.displayName || "Unnamed user"}</h2><p>Public app/profile signals only. No private contact details, exact location, health records or private husbandry data are shown.</p></div><button type="button" onClick={() => setSelectedUser(null)} aria-label="Close user details"><TinyTitansIcon name="close" size={18} /></button></div>
      <div className="creator-user-detail-grid">
        <div><strong>Engagement</strong><span>{creatorActivityBand(selectedUser.lastActiveAt, now).label}</span></div>
        <div><strong>Latest activity</strong><span>{formatCreatorDate(selectedUser.lastActiveAt)}</span></div>
        <div><strong>Account age</strong><span>{formatCreatorDate(selectedUser.createdAt)}</span></div>
        <div><strong>Role</strong><span>{selectedUser.role || "user"}</span></div>
        <div><strong>Profile</strong><span>{selectedUser.profileType || "—"}</span></div>
        <div><strong>Category</strong><span>{selectedUser.category || "—"}</span></div>
        <div><strong>Experience</strong><span>{selectedUser.experienceLevel || "—"}</span></div>
        <div><strong>Learning level</strong><span>{selectedUser.learningLevel || "—"}</span></div>
        <div><strong>Setup</strong><span>{selectedUser.setupComplete ? "Complete" : "Incomplete"}</span></div>
        <div><strong>Platform</strong><span>{selectedUser.platform || "Not recorded"}</span></div>
        <div><strong>App version</strong><span>{selectedUser.appVersion || "Not recorded"}</span></div>
        <div><strong>Activity signal</strong><span>{creatorActivityBand(selectedUser.lastActiveAt, now).detail}</span></div>
      </div>
      <div className="creator-user-detail-section"><h3><TinyTitansIcon name="community" size={18} /> Community visibility</h3><p>{selectedUser.dataCollectionPreferences?.approximateLocation && selectedUser.approximateLocation?.visibleToCreator && selectedUser.approximateLocation.city && selectedUser.approximateLocation.country ? `${selectedUser.approximateLocation.city}, ${selectedUser.approximateLocation.country}` : "Not shared / consent not enabled"}</p><small>Only approximate city/country is used for the Creator community map.</small></div>
      <div className="creator-user-detail-section"><h3><TinyTitansIcon name="lock" size={18} /> Permission matrix</h3><div className="creator-user-permissions"><span><TinyTitansIcon name="community" size={15} /> Community location: {selectedUser.dataCollectionPreferences?.approximateLocation ? "ON" : "OFF"}</span><span><TinyTitansIcon name="weight" size={15} /> Analytics: {selectedUser.dataCollectionPreferences?.analytics ? "ON" : "OFF"}</span><span><TinyTitansIcon name="husbandry" size={15} /> Community husbandry: {selectedUser.dataCollectionPreferences?.communityHusbandryData ? "ON" : "OFF"}</span><span><TinyTitansIcon name="messages" size={15} /> Product updates: {selectedUser.dataCollectionPreferences?.productUpdates ? "ON" : "OFF"}</span></div><small>OFF means the relevant intelligence layer must exclude that user's data. It is not a missing-data error.</small></div>
      <div className="creator-user-detail-section"><h3><TinyTitansIcon name="titan" size={18} /> Creator interpretation</h3><p>{creatorActivityBand(selectedUser.lastActiveAt, now).label === "Long inactive" ? "This account has gone quiet. Consider a friendly feedback prompt or check whether the user is struggling with onboarding or finding the right features." : creatorActivityBand(selectedUser.lastActiveAt, now).label === "Cooling off" ? "Usage is cooling. This is a useful population for targeted education, feature discovery or a lightweight check-in." : creatorActivityBand(selectedUser.lastActiveAt, now).label === "No activity signal" ? "There is not enough activity data to classify this account yet." : "This account shows recent activity. Use the profile signals and contribution permissions to understand which parts of Tiny Titans are working for them."}</p></div>
      <div className="creator-user-detail-section"><h3><TinyTitansIcon name="testing" size={18} /> Creator Tester authorization</h3><p>This uses the existing server-side Creator claim workflow for approved test accounts.</p><button type="button" className="secondary-button" disabled={claimBusy} onClick={() => void grantCreatorTesterClaim(selectedUser)}>{claimBusy ? "Granting Creator access…" : "Grant Creator Tester access"}</button></div>
    </section></div>}
  </section>;
}
