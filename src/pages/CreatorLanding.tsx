import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import CreatorMorphCorrections from "../components/CreatorMorphCorrections";
import TinyTitansIcon from "../components/TinyTitansIcon";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import { getCreatorReports } from "../services/creatorService";
import { isActiveReportIssueStatus } from "../services/reportLifecycle";
import type { ReportIssue } from "../types/reportIssue";

const tools: Array<[TinyTitansIconName, string, string, string]> = [
  ["animals", "Species Submission Review", "/creator/species-submissions", "Review proposed species, evidence, husbandry, imagery and implementation notes before anything becomes canonical."],
  ["genetics", "Morph Submission Review", "/creator/submissions", "Review and moderate morph submissions."],
  ["morph", "Morph Library Editor", "/creator/morph-library", "Repair approved morph images, swap image assignments, crop, move, edit credits and remove incorrect imagery."],
  ["enclosure", "Vivarium Showcase Review", "/creator/vivarium-showcase", "Review keeper enclosure setups, images and walkthrough videos before public publication."],
  ["observatory", "Keeper Observation Review", "/creator/observations", "Review behaviour footage, context and educational-use consent before public inclusion."],
  ["messages", "Community Manager", "/creator/community", "Publish updates, known issues, tester notices and releases."],
  ["lock", "Creator Privacy Data", "/creator/privacy-data", "Review consent-controlled creator data and privacy tools."],
  ["analytics", "Creator Benchmarks", "/creator/benchmarks", "Inspect app performance and intelligence benchmarks."],
  ["testing", "Tester Centre", "/creator/tester", "Run focused QA, diagnostics and regression checks."],
  ["billing", "Paid Tier Control", "/creator/tester/paid-tiers", "See effective user tiers, grant controlled trials and test paid features without creating Stripe charges."],
  ["messages", "Creator Conversations", "/creator/conversations", "Handle creator-facing conversations and follow-ups."],
];

export default function CreatorLanding() {
  const [bugCount, setBugCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    void getCreatorReports()
      .then((reports: ReportIssue[]) => {
        if (!active) return;
        setBugCount(reports.filter((report) => report.archived !== true && isActiveReportIssueStatus(report.status)).length);
        setArchivedCount(reports.filter((report) => report.archived === true).length);
        setLastRefresh(new Date());
      })
      .catch(() => {
        if (!active) return;
        setBugCount(0);
        setArchivedCount(0);
      });
    return () => {
      active = false;
    };
  }, []);

  const healthLabel = useMemo(() => {
    if (bugCount >= 10) return "Busy operations";
    if (bugCount > 0) return "Needs attention";
    return "No active bug backlog";
  }, [bugCount]);

  return (
    <main className="page-container creator-landing-page">
      <BackHomeButton fallback="/" />
      <section className="creator-landing-hero">
        <div className="creator-landing-hero-icon" aria-hidden="true"><TinyTitansIcon name="creator" size={30} /></div>
        <div>
          <p className="eyebrow">TINY TITANS · CREATOR</p>
          <h1>Creator Hub</h1>
          <p>Your operational workspace for moderation, submissions, community publishing, QA and creator tools.</p>
        </div>
        <div className="creator-landing-health" aria-label="Creator hub status"><span className="creator-status-dot" aria-hidden="true" /><div><strong>{healthLabel}</strong><small>{lastRefresh ? `Checked ${lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Checking live queues…"}</small></div></div>
      </section>
      <section className="creator-landing-command-grid" aria-label="Creator command centre">
        <Link className="creator-command-card creator-command-primary" to="/creator/issues"><span className="creator-command-icon"><TinyTitansIcon name="testing" size={24} /></span><div><small>ACTIVE QUEUE</small><strong>{bugCount} Bug Reports</strong><p>Review reports, evidence, severity and creator decisions.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
        <Link className="creator-command-card" to="/creator/species-submissions"><span className="creator-command-icon"><TinyTitansIcon name="animals" size={24} /></span><div><small>CONTENT PIPELINE</small><strong>Species Submissions</strong><p>Review proposed species and the evidence package before canonical implementation.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
        <Link className="creator-command-card" to="/creator/morph-library"><span className="creator-command-icon"><TinyTitansIcon name="morph" size={24} /></span><div><small>MORPH LIBRARY · CREATOR</small><strong>Morph Library Editor</strong><p>Crop, swap, move, reassign, re-credit or remove approved morph imagery.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
        <Link className="creator-command-card" to="/creator/submissions"><span className="creator-command-icon"><TinyTitansIcon name="genetics" size={24} /></span><div><small>CONTENT PIPELINE</small><strong>Morph Submissions</strong><p>Keep the community morph database accurate and evidence-led.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
        <Link className="creator-command-card" to="/creator/vivarium-showcase"><span className="creator-command-icon"><TinyTitansIcon name="enclosure" size={24} /></span><div><small>COMMUNITY SETUPS</small><strong>Vivarium Showcase Review</strong><p>Review enclosure setups, photographs and videos before they become shared community learning material.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
        <Link className="creator-command-card" to="/creator/observations"><span className="creator-command-icon"><TinyTitansIcon name="animals" size={24} /></span><div><small>BEHAVIOUR INTELLIGENCE</small><strong>Keeper Observations</strong><p>Review community behaviour footage and context before anything reaches the public catalogue.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
        <Link className="creator-command-card" to="/creator/community"><span className="creator-command-icon"><TinyTitansIcon name="messages" size={24} /></span><div><small>COMMUNITY OPS</small><strong>Publish & Moderate</strong><p>Manage official updates, releases and known issues.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
        <Link className="creator-command-card" to="/creator/tester?notificationLab=1"><span className="creator-command-icon"><TinyTitansIcon name="reminders" size={24} /></span><div><small>NOTIFICATION QA</small><strong>Notification Delivery Lab</strong><p>Send focused real-push checks and verify the production notification delivery path.</p></div><span className="creator-command-arrow"><TinyTitansIcon name="forward" size={16} /></span></Link>
      </section>
      <section className="creator-landing-section">
        <div className="creator-landing-section-heading"><div><p className="eyebrow">WORKSPACE</p><h2>Creator tools</h2><p>Everything else in one tidy grid, with the same visual language as the Creator Centre.</p></div><div className="creator-archive-pill"><TinyTitansIcon name="knowledge" size={15} /> {archivedCount} archived reports</div></div>
        <section className="dashboard-grid creator-tool-grid" aria-label="Creator tools">{tools.map(([icon, title, to, description]) => <article className="dashboard-card creator-tool-card" key={to}><div className="dashboard-card-icon" aria-hidden="true"><TinyTitansIcon name={icon} size={25} /></div><p className="creator-tool-kicker">CREATOR TOOL</p><h2>{title}</h2><p>{description}</p><Link className="primary-button" to={to}>Open tool <TinyTitansIcon name="forward" size={14} /></Link></article>)}</section>
      </section>
      <CreatorMorphCorrections />
      <section className="creator-landing-footer-card"><div><span aria-hidden="true"><TinyTitansIcon name="creator" size={22} /></span><div><strong>Creator Centre is the control room.</strong><p>Use the command cards for daily work; use the specialist tools when you need deeper diagnostics or administration.</p></div></div><Link className="secondary-button" to="/creator/issues?filter=archived">View archived reports</Link></section>
    </main>
  );
}
