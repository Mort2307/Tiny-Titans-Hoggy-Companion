import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitIssueReport } from "../services/creatorService";
import type { ReportIssueCategory, ReportIssuePriority, ReportIssueSource } from "../types/reportIssue";
import "../styles/CreatorTools.css";

const categories: ReportIssueCategory[] = ["Genetics", "Morph Database", "Calculator", "Breeding Planner", "Husbandry", "App Bug", "Other"];
const sources: ReportIssueSource[] = ["Genetics Calculator", "Morph Library", "Breeding Planner", "Snake Profile", "Knowledge Base", "Other"];

export default function ReportIssue() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [category, setCategory] = useState<ReportIssueCategory>("App Bug");
  const [source, setSource] = useState<ReportIssueSource>("Other");
  const [priority, setPriority] = useState<ReportIssuePriority>("Normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim() || !description.trim()) return;
    setSending(true);
    setError("");
    try {
      await submitIssueReport({
        category,
        priority,
        status: "Pending",
        source,
        title: title.trim(),
        description: description.trim(),
        context: location.pathname,
        userId: user.uid,
        appVersion: "0.0.0",
        metadata: { displayName: profile?.displayName ?? user.displayName ?? "", userAgent: navigator.userAgent },
      });
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send the report.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="creator-tools-page">
      <div className="creator-tools-card">
        <div className="creator-tools-header"><span>🐛</span><div><h1>Report an Issue</h1><p>Tell us what went wrong and we'll get it into the Tiny Titans issue queue.</p></div></div>
        {sent ? <div className="creator-success"><h2>Report submitted ✓</h2><p>Thanks. Your report has been sent to the Tiny Titans team.</p><button type="button" onClick={() => navigate("/account")}>Back to My Account</button></div> : (
          <form className="creator-form" onSubmit={handleSubmit}>
            <label>Category<select value={category} onChange={(e) => setCategory(e.target.value as ReportIssueCategory)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Where did it happen?<select value={source} onChange={(e) => setSource(e.target.value as ReportIssueSource)}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value as ReportIssuePriority)}>{["Low", "Normal", "High", "Critical"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Short title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Axanthic selector changes Albino" required /></label>
            <label>What happened?<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={7} maxLength={3000} placeholder="Tell us what you expected, what happened, and how to reproduce it." required /></label>
            {error && <div className="creator-error">{error}</div>}
            <div className="creator-actions"><button type="button" onClick={() => navigate(-1)}>Cancel</button><button className="creator-primary" type="submit" disabled={sending || !title.trim() || !description.trim()}>{sending ? "Sending…" : "🐛 Submit Issue"}</button></div>
          </form>
        )}
      </div>
    </section>
  );
}
