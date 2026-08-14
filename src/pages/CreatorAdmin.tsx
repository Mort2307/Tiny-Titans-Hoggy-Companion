import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  approveMorphImageSubmission,
  getApprovedMorphImages,
  getCreatorReports,
  getFounderApplications,
  getGlobalStats,
  getMorphImageSubmissions,
  rejectMorphImageSubmission,
  updateCreatorReport,
  updateFounderApplication,
  type FounderApplication,
  type GlobalStats,
} from "../services/creatorService";
import type { ReportIssue } from "../types/reportIssue";
import type { MorphImageSubmission } from "../types/morphSubmission";
import "../styles/CreatorTools.css";

const EMPTY_STATS: GlobalStats = { registeredUsers: 0, activeUsers: 0, snakeProfiles: 0, mealsFed: 0, weightLogs: 0, totalWeightKg: 0, totalWeightLb: 0, shedsLogged: 0, totalShedLengthCm: 0, totalShedLengthIn: 0, geneticsCalculations: 0 };
function formatNumber(value: number, maximumFractionDigits = 0) { return new Intl.NumberFormat("en-GB", { maximumFractionDigits }).format(value); }

export default function CreatorAdmin() {
  const { profile, user } = useAuth();
  const [reports, setReports] = useState<ReportIssue[]>([]); const [founders, setFounders] = useState<FounderApplication[]>([]); const [morphSubmissions, setMorphSubmissions] = useState<MorphImageSubmission[]>([]); const [stats, setStats] = useState<GlobalStats>(EMPTY_STATS); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [workingMorphId, setWorkingMorphId] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const [loadedReports, loadedFounders, loadedStats, loadedMorphSubmissions] = await Promise.all([getCreatorReports(), getFounderApplications(), getGlobalStats(), getMorphImageSubmissions()]); setReports(loadedReports); setFounders(loadedFounders); setStats(loadedStats); setMorphSubmissions(loadedMorphSubmissions.filter((submission) => submission.status === "Pending" || submission.status === "NeedsInfo")); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Creator data could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (profile?.role === "admin") void load(); }, [profile?.role]);
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  async function changeReport(id: string, status: ReportIssue["status"]) { await updateCreatorReport(id, status); await load(); }
  async function changeFounder(id: string, status: FounderApplication["status"]) { await updateFounderApplication(id, status); await load(); }
  async function approveMorph(submission: MorphImageSubmission) { setWorkingMorphId(submission.id); setError(""); try { await approveMorphImageSubmission(submission, user?.uid); await load(); } catch (approvalError) { setError(approvalError instanceof Error ? approvalError.message : "Morph image approval failed."); } finally { setWorkingMorphId(""); } }
  async function rejectMorph(submission: MorphImageSubmission) { setWorkingMorphId(submission.id); setError(""); try { await rejectMorphImageSubmission(submission.id, submission.attachment.path, user?.uid, "Rejected by Creator."); await load(); } catch (rejectError) { setError(rejectError instanceof Error ? rejectError.message : "Morph image rejection failed."); } finally { setWorkingMorphId(""); } }

  return (
    <section className="creator-admin-page">
      <div className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>🛠️ Tiny Titans Control Centre</h1><p>Global app activity, community health and owner/admin tools.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button></div>
      {error && <div className="creator-error">{error}</div>}
      {loading ? <div className="creator-loading">Loading global Tiny Titans statistics…</div> : <>
        <section className="creator-admin-section creator-global-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">FUN GLOBAL TRACKERS</span><h2>🌍 Tiny Titans Community</h2><p>Aggregated totals only — individual user records are not shown here.</p></div></div><div className="creator-global-grid">
          <div className="creator-global-card creator-global-card-users"><span>👥</span><strong>{formatNumber(stats.registeredUsers)}</strong><label>Registered Users</label><small>● {formatNumber(stats.activeUsers)} active in the last 15 minutes</small></div>
          <div className="creator-global-card"><span>🐍</span><strong>{formatNumber(stats.activeUsers)}</strong><label>Active Users</label><small>Recent app activity</small></div><div className="creator-global-card"><span>🐍</span><strong>{formatNumber(stats.snakeProfiles)}</strong><label>Snake Profiles</label><small>Total profiles tracked</small></div><div className="creator-global-card"><span>🍽️</span><strong>{formatNumber(stats.mealsFed)}</strong><label>Meals Fed</label><small>Global feeding records</small></div><div className="creator-global-card"><span>⚖️</span><strong>{formatNumber(stats.weightLogs)}</strong><label>Weight Logs</label><small>Individual weight records</small></div><div className="creator-global-card"><span>⚖️</span><strong>{formatNumber(stats.totalWeightKg, 2)} kg</strong><label>Global Weight Logged</label><small>{formatNumber(stats.totalWeightLb, 2)} lb</small></div><div className="creator-global-card"><span>🐍</span><strong>{formatNumber(stats.shedsLogged)}</strong><label>Sheds Logged</label><small>Global shed records</small></div><div className="creator-global-card"><span>📏</span><strong>{formatNumber(stats.totalShedLengthCm / 100, 2)} m</strong><label>Total Shed Length</label><small>{formatNumber(stats.totalShedLengthIn / 12, 2)} ft</small></div><div className="creator-global-card"><span>🧬</span><strong>{formatNumber(stats.geneticsCalculations)}</strong><label>Genetics Calculations</label><small>Tracked when calculation events are added</small></div>
        </div></section>

        <div className="creator-stats"><div><strong>{formatNumber(stats.registeredUsers)}</strong><span>Registered users</span></div><div><strong>{formatNumber(stats.activeUsers)}</strong><span>Active users</span></div><div><strong>{reports.filter((r) => r.status === "Pending").length}</strong><span>Open reports</span></div><div><strong>{formatNumber(morphSubmissions.length)}</strong><span>Morph images awaiting review</span></div></div>

        <section className="creator-admin-section"><h2>🧬 Morph Image Submissions</h2><p className="creator-muted">Community images are submitted to a canonical morph ID. Approving one adds it directly to that morph — no catalogue hunting.</p>{morphSubmissions.length === 0 ? <p className="creator-muted">No morph image submissions awaiting review.</p> : <div className="creator-list">{morphSubmissions.map((submission) => <article className="creator-list-card" key={submission.id}>
          <div className="creator-list-top"><div><span className="creator-badge">{submission.status}</span><h3>{submission.morphName}</h3></div><small>geneId: {submission.morphId}</small></div>
          <img src={submission.attachment.path ? `${import.meta.env.VITE_FIREBASE_STORAGE_PLACEHOLDER ?? ""}` : ""} alt={`Submitted ${submission.morphName}`} style={{ display: "none" }} />
          <p>{submission.description}</p>{submission.geneticsNotes && <p><strong>Genetics:</strong> {submission.geneticsNotes}</p>}
          <p><strong>Credit:</strong> {submission.creditType === "anonymous" ? "Anonymous" : submission.creditType === "social" ? submission.creditSocial || "Social media" : submission.creditName || "Name"}</p>
          <div className="creator-actions"><button disabled={workingMorphId === submission.id} onClick={() => void approveMorph(submission)}>{workingMorphId === submission.id ? "Approving…" : `✓ Approve & Add to ${submission.morphName}`}</button><button disabled={workingMorphId === submission.id} onClick={() => void rejectMorph(submission)}>Reject</button></div>
        </article>)}</div>}</section>

        <section className="creator-admin-section"><h2>🐛 Issue Reports</h2>{reports.length === 0 ? <p className="creator-muted">No reports yet.</p> : <div className="creator-list">{reports.map((report) => <article className="creator-list-card" key={report.id}><div className="creator-list-top"><div><span className={`creator-badge ${report.priority.toLowerCase()}`}>{report.priority}</span><span className="creator-badge">{report.status}</span><h3>{report.title}</h3></div><small>{report.category} · {report.source}</small></div><p>{report.description}</p><div className="creator-actions"><button onClick={() => void changeReport(report.id, "Reviewing")}>Review</button><button onClick={() => void changeReport(report.id, "Resolved")}>Resolve</button><button onClick={() => void changeReport(report.id, "Rejected")}>Reject</button></div></article>)}</div>}</section>

        <section className="creator-admin-section"><h2>👑 Legacy Founder Applications</h2><p className="creator-muted">This legacy section remains visible for existing records. New supporter payments will use the Titan Supporter system.</p>{founders.length === 0 ? <p className="creator-muted">No legacy applications.</p> : <div className="creator-list">{founders.map((founder) => <article className="creator-list-card" key={founder.id}><div className="creator-list-top"><div><span className="creator-badge">{founder.status}</span><h3>{founder.displayName || founder.email}</h3></div><small>{founder.email}</small></div><p><strong>Why:</strong> {founder.reason}</p><p><strong>Experience:</strong> {founder.experience}</p>{founder.contribution && <p><strong>Contribution:</strong> {founder.contribution}</p>}<div className="creator-actions"><button onClick={() => void changeFounder(founder.id, "Approved")}>Approve</button><button onClick={() => void changeFounder(founder.id, "Declined")}>Decline</button></div></article>)}</div>}</section>
      </>}
    </section>
  );
}
