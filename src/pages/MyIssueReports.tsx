import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserIssueReports } from "../services/creatorService";
import { recordConfirmedBugReport } from "../services/learningEngine";
import type { ReportIssue } from "../types/reportIssue";
import "../styles/CreatorTools.css";

const statusMeta: Record<ReportIssue["status"], { icon: string; label: string }> = { Pending: { icon: "🆕", label: "Submitted" }, Reviewing: { icon: "👀", label: "Reviewing" }, Fixing: { icon: "🔧", label: "Confirmed · Fixing" }, Testing: { icon: "🧪", label: "Confirmed · Testing" }, Resolved: { icon: "🟢", label: "Confirmed · Resolved" }, Rejected: { icon: "🔴", label: "Rejected" }, Cleared: { icon: "⚪", label: "Cleared" } };

// Only reports that have entered the confirmed lifecycle count toward Bug Hunter progression.
// Pending/reviewing submissions must never grant achievement credit merely because they exist.
function isConfirmedBugReport(report: ReportIssue): boolean {
  return report.status === "Fixing" || report.status === "Testing" || report.status === "Resolved";
}

export default function MyIssueReports() {
  const { user } = useAuth(); const [reports, setReports] = useState<ReportIssue[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { if (!user) return; let active = true; void getUserIssueReports(user.uid).then((items) => { if (!active) return; setReports(items); items.filter(isConfirmedBugReport).forEach((item) => recordConfirmedBugReport(user.uid, item.id)); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load your reports."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [user]);
  return <section className="creator-tools-page"><div className="creator-tools-card">
    <div className="creator-tools-header"><span>🐛</span><div><h1>My Issue Reports</h1><p>Track reports you've sent to the Tiny Titans team and see what happened to them.</p></div></div>
    {error && <div className="creator-error">{error}</div>}
    {loading ? <p className="creator-muted">Loading your reports…</p> : reports.length === 0 ? <div className="creator-success"><h2>No reports yet</h2><p>When you report a problem, it will appear here and you'll be able to follow its progress.</p><Link className="creator-primary" to="/report-issue">🐛 Report an issue</Link></div> : <div className="creator-list">{reports.map((report) => { const meta = statusMeta[report.status]; const confirmed = isConfirmedBugReport(report); return <article className="creator-list-card" key={report.id}>
      <div className="creator-list-top"><div><span className="creator-badge">{meta.icon} {meta.label}</span><h3>{report.title}</h3></div><small>{report.issueToken || "No token"}</small></div>
      <p>{report.description}</p>
      {report.status === "Resolved" && <div className="creator-success"><h3>💚 Your report helped improve Tiny Titans!</h3><p>{report.creatorMessage || "Thank you for helping us find and improve this issue."}</p>{report.resolution && <p><strong>Resolution:</strong> {report.resolution}</p>}{report.fixedVersion && <p><strong>Fixed in:</strong> {report.fixedVersion}</p>}{confirmed && <p>🏆 This report entered the confirmed bug lifecycle, so your Bug Hunter progress has been updated.</p>}</div>}
      {report.status === "Rejected" && report.creatorMessage && <div className="creator-error"><strong>Creator response:</strong> {report.creatorMessage}</div>}
      {report.status !== "Resolved" && report.status !== "Rejected" && <p className="creator-muted">{report.status === "Pending" ? "Your report has been received and is waiting for review. It does not count toward Bug Hunter progression yet." : report.status === "Reviewing" ? "The Tiny Titans team is investigating this report. It does not count toward Bug Hunter progression until confirmed." : report.status === "Fixing" ? "The issue has been confirmed and is being fixed. This now counts toward Bug Hunter progression." : "The confirmed fix is being tested before release."}</p>}
    </article>; })}</div>}
    <div className="creator-actions"><Link to="/community">🌿 Community Hub</Link><Link to="/report-issue">🐛 Report another issue</Link></div>
  </div></section>;
}