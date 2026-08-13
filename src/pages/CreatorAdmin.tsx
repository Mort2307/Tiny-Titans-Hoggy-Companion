import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCreatorReports, getFounderApplications, getUserCount, updateCreatorReport, updateFounderApplication, type FounderApplication } from "../services/creatorService";
import type { ReportIssue } from "../types/reportIssue";
import "../styles/CreatorTools.css";

export default function CreatorAdmin() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportIssue[]>([]);
  const [founders, setFounders] = useState<FounderApplication[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [loadedReports, loadedFounders, count] = await Promise.all([getCreatorReports(), getFounderApplications(), getUserCount()]);
      setReports(loadedReports); setFounders(loadedFounders); setUserCount(count);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Creator data could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (profile?.role === "admin") void load(); }, [profile?.role]);

  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  async function changeReport(id: string, status: ReportIssue["status"]) { await updateCreatorReport(id, status); await load(); }
  async function changeFounder(id: string, status: FounderApplication["status"]) { await updateFounderApplication(id, status); await load(); }

  return <section className="creator-admin-page">
    <div className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>🛠️ Tiny Titans Control Centre</h1><p>Owner/admin tools for keeping the app healthy, useful and accurate.</p></div><button type="button" onClick={() => void load()}>↻ Refresh</button></div>
    {error && <div className="creator-error">{error}</div>}
    <div className="creator-stats"><div><strong>{userCount}</strong><span>Registered users</span></div><div><strong>{reports.filter((r) => r.status === "Pending").length}</strong><span>Open reports</span></div><div><strong>{founders.filter((f) => f.status === "Pending").length}</strong><span>Founder applications</span></div></div>
    {loading ? <div className="creator-loading">Loading Creator Centre…</div> : <>
      <section className="creator-admin-section"><h2>🐛 Issue Reports</h2>{reports.length === 0 ? <p className="creator-muted">No reports yet.</p> : <div className="creator-list">{reports.map((report) => <article className="creator-list-card" key={report.id}><div className="creator-list-top"><div><span className={`creator-badge ${report.priority.toLowerCase()}`}>{report.priority}</span><span className="creator-badge">{report.status}</span><h3>{report.title}</h3></div><small>{report.category} · {report.source}</small></div><p>{report.description}</p><div className="creator-actions"><button onClick={() => void changeReport(report.id, "Reviewing")}>Review</button><button onClick={() => void changeReport(report.id, "Resolved")}>Resolve</button><button onClick={() => void changeReport(report.id, "Rejected")}>Reject</button></div></article>)}</div>}</section>
      <section className="creator-admin-section"><h2>👑 Founder Applications</h2>{founders.length === 0 ? <p className="creator-muted">No Founder applications yet.</p> : <div className="creator-list">{founders.map((founder) => <article className="creator-list-card" key={founder.id}><div className="creator-list-top"><div><span className="creator-badge">{founder.status}</span><h3>{founder.displayName || founder.email}</h3></div><small>{founder.email}</small></div><p><strong>Why:</strong> {founder.reason}</p><p><strong>Experience:</strong> {founder.experience}</p>{founder.contribution && <p><strong>Contribution:</strong> {founder.contribution}</p>}<div className="creator-actions"><button onClick={() => void changeFounder(founder.id, "Approved")}>Approve</button><button onClick={() => void changeFounder(founder.id, "Declined")}>Decline</button></div></article>)}</div>}</section>
    </>}
  </section>;
}
