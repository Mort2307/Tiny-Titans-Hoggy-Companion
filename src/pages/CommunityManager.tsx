import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { publishCommunityDraft } from "../services/communityService";
import type { CommunityAudience, CommunityCategory, CommunityPriority, KnownIssueStatus } from "../types/community";
import "../styles/CommunityHub.css";

export default function CommunityManager() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CommunityCategory>("update");
  const [audience, setAudience] = useState<CommunityAudience>("everyone");
  const [priority, setPriority] = useState<CommunityPriority>("normal");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [affectedPlatform, setAffectedPlatform] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [status, setStatus] = useState<KnownIssueStatus>("Investigating");
  const [workaround, setWorkaround] = useState("");
  const [resolvedVersion, setResolvedVersion] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  function resetOptionalFields(nextCategory: CommunityCategory) {
    setCategory(nextCategory);
    if (nextCategory !== "known_issue") {
      setStatus("Investigating");
      setSeverity("medium");
      setWorkaround("");
      setResolvedVersion("");
    }
    if (nextCategory === "update" || nextCategory === "tester" || nextCategory === "release") setAudience((current) => current === "admin" ? "everyone" : current);
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim() || !message.trim()) return;
    setSending(true); setError(""); setDone(false);
    try {
      await publishCommunityDraft({
        category,
        audience,
        priority,
        title: title.trim(),
        message: message.trim(),
        appVersion: appVersion.trim() || undefined,
        affectedVersion: appVersion.trim() || undefined,
        affectedPlatform: affectedPlatform.trim() || undefined,
        severity: category === "known_issue" ? severity : undefined,
        status: category === "known_issue" ? status : undefined,
        workaround: category === "known_issue" ? workaround.trim() || undefined : undefined,
        resolvedVersion: category === "known_issue" ? resolvedVersion.trim() || undefined : undefined,
        imageUrl: imageUrl.trim() || undefined,
      }, user.uid);
      setDone(true); setTitle(""); setMessage(""); setAppVersion(""); setAffectedPlatform(""); setWorkaround(""); setResolvedVersion(""); setImageUrl("");
    } catch (publishError) { setError(publishError instanceof Error ? publishError.message : "Unable to publish the community update."); }
    finally { setSending(false); }
  }

  const needsVersion = category === "known_issue" || category === "tester" || category === "release";

  return <section className="community-page">
    <header className="community-hero"><div className="community-hero-icon">📢</div><div><p className="community-eyebrow">CREATOR CENTRE</p><h1>Community Manager</h1><p>Publish the official information users see in the Community Hub.</p></div></header>
    <form className="community-manager-form" onSubmit={publish}>
      <div className="community-manager-grid">
        <label>Content type<select value={category} onChange={(e) => resetOptionalFields(e.target.value as CommunityCategory)}><option value="update">📢 Announcement / Update</option><option value="known_issue">🐛 Known Issue</option><option value="tester">🧪 Tester Update</option><option value="release">📋 Release Note</option></select></label>
        <label>Audience<select value={audience} onChange={(e) => setAudience(e.target.value as CommunityAudience)}><option value="everyone">Everyone</option><option value="testers">Testers</option><option value="admin">Creator/Admin</option></select></label>
        <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value as CommunityPriority)}><option value="normal">Normal</option><option value="important">Important</option><option value="critical">Critical</option></select></label>
        {category === "known_issue" && <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as KnownIssueStatus)}><option>Investigating</option><option>Fixing</option><option>Testing</option><option>Resolved</option></select></label>}
        {category === "known_issue" && <label>Severity<select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>}
      </div>
      <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="e.g. Tiny Titans v1.4.2 — tester build ready" required /></label>
      <label>Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={6000} rows={8} placeholder="Write the official update…" required /></label>
      {needsVersion && <div className="community-manager-grid"><label>App / affected version<input value={appVersion} onChange={(e) => setAppVersion(e.target.value)} placeholder="e.g. 0.9.8" /></label><label>Affected platform<input value={affectedPlatform} onChange={(e) => setAffectedPlatform(e.target.value)} placeholder="e.g. Android / iOS / Web" /></label></div>}
      {category === "known_issue" && <><label>Workaround<input value={workaround} onChange={(e) => setWorkaround(e.target.value)} placeholder="Optional workaround users can try" /></label><label>Resolved version<input value={resolvedVersion} onChange={(e) => setResolvedVersion(e.target.value)} placeholder="Fill this when resolved" /></label></>}
      <label>Optional image URL<input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" inputMode="url" /></label>
      {done && <div className="community-manager-success">✓ Published successfully. It will now appear in the Community Hub for the selected audience.</div>}
      {error && <div className="community-manager-error">{error}</div>}
      <div className="community-manager-actions"><button type="button" onClick={() => navigate("/community")}>Back to Hub</button><button type="submit" disabled={sending || !title.trim() || !message.trim()}>{sending ? "Publishing…" : "🚀 Publish to Community Hub"}</button></div>
    </form>
  </section>;
}
