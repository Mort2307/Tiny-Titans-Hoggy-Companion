import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getMentorshipWorkspace, appendWorkspaceMessage } from "../services/mentorshipRepository";
import { canSendMessage, type MentorshipWorkspace } from "../services/mentorshipWorkspace";
import { getMentorshipTrackerEvidence } from "../services/mentorshipTrackerEvidence";
import { getCloudLearningProgress } from "../services/learningPersistence";
import { buildMentorBrief, type MentorBrief as MentorBriefData } from "../services/mentorshipBrief";
import MentorBrief from "../components/KeeperMeetsBreeder/MentorBrief";
import "../styles/KeeperMeetsBreeder.css";

export default function MentorshipWorkspace() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<MentorshipWorkspace | null>(null);
  const [brief, setBrief] = useState<MentorBriefData | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!workspaceId) return;
    try {
      const nextWorkspace = await getMentorshipWorkspace(workspaceId);
      setWorkspace(nextWorkspace);
      if (!nextWorkspace || !user) return;
      const participant = nextWorkspace.participants.find((item) => item.userId === user.uid);
      if (participant?.role !== "mentee") return;
      setLoadingBrief(true);
      const [tracker, learning] = await Promise.all([getMentorshipTrackerEvidence(user.uid), getCloudLearningProgress(user.uid)]);
      setBrief(buildMentorBrief(nextWorkspace.goal as Parameters<typeof buildMentorBrief>[0], tracker, learning, nextWorkspace));
    } catch { setError("The workspace could not be loaded."); }
    finally { setLoadingBrief(false); }
  };

  useEffect(() => { void load(); }, [workspaceId, user?.uid]);

  const send = async () => {
    if (!workspace || !user || !body.trim() || !canSendMessage(workspace, user.uid)) return;
    setSaving(true); setError("");
    try {
      await appendWorkspaceMessage(workspace.id, { id: crypto.randomUUID(), senderId: user.uid, body: body.trim(), createdAt: new Date().toISOString() });
      setBody("");
      await load();
    } catch { setError("The message could not be sent."); }
    finally { setSaving(false); }
  };

  if (!workspace) return <main className="kmb-page"><div className="kmb-coming"><span>🤝</span><div><strong>{error || "This mentorship workspace is not available yet."}</strong><p>If you have just sent a request, the workspace becomes active after the mentor accepts.</p></div></div></main>;

  const participant = user && workspace.participants.find((item) => item.userId === user.uid);
  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">🤝</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">PRIVATE MENTORSHIP</span><h1>Mentorship Workspace</h1><p>Goal: <strong>{workspace.goal}</strong>. Only the two participants should have access.</p></div><span className="kmb-status">{workspace.status}</span></header>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">RELATIONSHIP</span><h2>Your workspace</h2><p>You are signed in as {participant?.role ?? "participant"}.</p></div></div><div className="kmb-track-grid"><article className="kmb-track"><h3>Shared records</h3><div className="kmb-focus-list">{Object.entries(workspace.permissions).filter(([, value]) => value).map(([key]) => <span key={key}>✓ {key.replace("view_", "")}</span>)}{!Object.values(workspace.permissions).some(Boolean) && <span>✓ Profile only</span>}</div></article><article className="kmb-track"><h3>Milestones</h3><p>Milestone tracking is connected to the mentorship journey and can be expanded without duplicating tracker data.</p></article></div></section>
    {participant?.role === "mentee" && (loadingBrief ? <section className="kmb-section"><div className="kmb-coming"><span>🧠</span><div><strong>Preparing your mentor brief…</strong><p>TTHC is analysing your existing tracker and learning evidence locally for your review.</p></div></div></section> : brief ? <MentorBrief brief={brief} workspace={workspace} onShared={() => void load()} /> : null)}
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">MESSAGES</span><h2>Private conversation</h2></div></div><div className="kmb-sharing"><div>{workspace.messages.map((message) => <article className="kmb-milestone" key={message.id}><span>💬</span><div><strong>{message.senderId === user?.uid ? "You" : "Mentor"}</strong><p>{message.body}</p></div><em>{new Date(message.createdAt).toLocaleString()}</em></article>)}{!workspace.messages.length && <p>No messages yet.</p>}</div>{workspace.status === "active" && <div className="kmb-how"><textarea className="kmb-textarea" rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a useful, respectful message…" /><button type="button" className="kmb-primary-button" disabled={saving || !body.trim()} onClick={() => void send()}>{saving ? "Sending…" : "Send message"}</button>{error && <p className="kmb-network-error">⚠️ {error}</p>}</div>}</div></section>
  </main>;
}
