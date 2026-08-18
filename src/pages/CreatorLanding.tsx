import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { getCreatorReports } from "../services/creatorService";
import { isActiveReportIssueStatus } from "../services/reportLifecycle";
import type { ReportIssue } from "../types/reportIssue";

const tools = [
  ["🧬", "Morph Submission Review", "/creator/submissions", "Review and moderate morph submissions."],
  ["📢", "Community Manager", "/creator/community", "Publish updates, known issues, tester notices and releases."],
  ["🛡️", "Creator Privacy Data", "/creator/privacy-data", "Review consent-controlled creator data and privacy tools."],
];

export default function CreatorLanding() {
  const [bugCount, setBugCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  useEffect(() => {
    let active = true;
    void getCreatorReports()
      .then((reports: ReportIssue[]) => {
        if (!active) return;
        setBugCount(reports.filter((report) => report.archived !== true && isActiveReportIssueStatus(report.status)).length);
        setArchivedCount(reports.filter((report) => report.archived === true).length);
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

  return (
    <main className="page-container">
      <BackHomeButton fallback="/" />
      <section className="welcome-card">
        <p className="eyebrow">TINY TITANS · CREATOR</p>
        <h1>🛠️ Creator Centre</h1>
        <p>Your creator workflows are protected by the shared capability system. Choose the operation you want to work on.</p>
      </section>
      <section className="dashboard-grid" aria-label="Creator tools">
        <article className="dashboard-card">
          <div className="dashboard-card-icon" aria-hidden="true">🐛</div>
          <h2>{bugCount} Bug Reports</h2>
          <p>Review community bugs, evidence, status and creator decisions.</p>
          <Link className="primary-button" to="/creator/issues">Open Bug Reports →</Link>
          <Link className="secondary-button" to="/creator/issues?filter=archived">🗄️ Archive Folder ({archivedCount})</Link>
        </article>
        {tools.map(([icon, title, to, description]) => (
          <article className="dashboard-card" key={to}>
            <div className="dashboard-card-icon" aria-hidden="true">{icon}</div>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link className="primary-button" to={to}>Open →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
