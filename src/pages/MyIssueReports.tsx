import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserIssueReports } from "../services/creatorService";
import { recordConfirmedBugReport } from "../services/learningEngine";
import { canonicaliseReportIssueStatus, isConfirmedBugReportStatus } from "../types/reportIssue";
import type { CanonicalReportIssueStatus, ReportIssue } from "../types/reportIssue";
import "../styles/CreatorTools.css";

const statusMeta: Record<CanonicalReportIssueStatus, { icon: string; label: string; description: string }> = {
  Draft: { icon: "📝", label: "Draft", description: "Your report is still being prepared." },
  Submitted: { icon: "🆕", label: "Submitted", description: "Your report has been received and is waiting for review." },
  "Under Review": { icon: "👀", label: "Under Review", description: "The Tiny Titans team is investigating this report." },
  Confirmed: { icon: "✅", label: "Confirmed", description: "The issue has been confirmed and is ready to be worked on." },
  "In Progress": { icon: "🔧", label: "In Progress", description: "The confirmed issue is being fixed." },
  Resolved: { icon: "🟢", label: "Resolved", description: "A fix has been completed." },
  Verified: { icon: "🧪", label: "Verified", description: "The fix has been tested and verified." },
  Rejected: { icon: "🔴", label: "Rejected", description: "The report was reviewed but was not accepted as a valid issue." },
  Duplicate: { icon: "🗂️", label: "Duplicate", description: "This report matches an issue already reported." },
  "Won't Fix": { icon: "⚪", label: "Won't Fix", description: "The report was reviewed but will not be changed." },
};

// Only reports that have entered the confirmed lifecycle count toward Bug Hunter progression.
function isConfirmedBugReport(report: ReportIssue): boolean {
  return isConfirmedBugReportStatus(report.status);
}

export default function MyIssueReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getUserIssueReports(user.uid)
      .then((items) => {
        if (!active) return;
        setReports(items);
        items.filter(isConfirmedBugReport).forEach((item) => void recordConfirmedBugReport(user.uid, item.id));
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load your reports.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <section className="creator-tools-page">
      <div className="creator-tools-card">
        <div className="creator-tools-header">
          <span>🐛</span>
          <div>
            <h1>My Issue Reports</h1>
            <p>Track reports you've sent to the Tiny Titans team and see what happened to them.</p>
          </div>
        </div>

        {error && <div className="creator-error">{error}</div>}

        {loading ? (
          <p className="creator-muted">Loading your reports…</p>
        ) : reports.length === 0 ? (
          <div className="creator-success">
            <h2>No reports yet</h2>
            <p>When you report a problem, it will appear here and you'll be able to follow its progress.</p>
            <Link className="creator-primary" to="/report-issue">🐛 Report an issue</Link>
          </div>
        ) : (
          <div className="creator-list">
            {reports.map((report) => {
              const status = canonicaliseReportIssueStatus(report.status);
              const meta = statusMeta[status];
              const confirmed = isConfirmedBugReport(report);

              return (
                <article className="creator-list-card" key={report.id}>
                  <div className="creator-list-top">
                    <div>
                      <span className="creator-badge">{meta.icon} {meta.label}</span>
                      <h3>{report.title}</h3>
                    </div>
                    <small>{report.issueToken || "No token"}</small>
                  </div>

                  <p>{report.description}</p>
                  <p className="creator-muted">{meta.description}</p>

                  {status === "Resolved" || status === "Verified" ? (
                    <div className="creator-success">
                      <h3>💚 Your report helped improve Tiny Titans!</h3>
                      <p>{report.creatorMessage || "Thank you for helping us find and improve this issue."}</p>
                      {report.resolution && <p><strong>Resolution:</strong> {report.resolution}</p>}
                      {report.fixedVersion && <p><strong>Fixed in:</strong> {report.fixedVersion}</p>}
                      {confirmed && <p>🏆 This report entered the confirmed bug lifecycle, so your Bug Hunter progress has been updated.</p>}
                    </div>
                  ) : null}

                  {status === "Rejected" || status === "Duplicate" || status === "Won't Fix" ? (
                    report.creatorMessage ? (
                      <div className="creator-error"><strong>Creator response:</strong> {report.creatorMessage}</div>
                    ) : null
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <div className="creator-actions">
          <Link to="/community">🌿 Community Hub</Link>
          <Link to="/report-issue">🐛 Report another issue</Link>
        </div>
      </div>
    </section>
  );
}
