import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { acceptMentorshipRequest, subscribeToMentorMentorshipRequests, updateMentorshipRequestStatus } from "../services/mentorshipRepository";
import type { MentorshipRequest } from "../services/mentorNetwork";
import "../styles/KeeperMeetsBreeder.css";

export default function MentorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => user ? subscribeToMentorMentorshipRequests(user.uid, setRequests) : undefined, [user]);
  const accept = async (request: MentorshipRequest) => {
    if (!user) return;
    setSavingId(request.id); setError("");
    try { const workspaceId = await acceptMentorshipRequest(request.id, user.uid); navigate(`/community/keeper-meets-breeder/workspace/${workspaceId}`); }
    catch (e) { setError(e instanceof Error ? e.message : "The mentorship request could not be accepted."); }
    finally { setSavingId(""); }
  };
  const decline = async (request: MentorshipRequest) => {
    setSavingId(request.id); setError("");
    try { await updateMentorshipRequestStatus(request.id, "declined"); }
    catch (e) { setError(e instanceof Error ? e.message : "The mentorship request could not be declined."); }
    finally { setSavingId(""); }
  };
  const incoming = requests.filter((request) => request.status === "sent");
  const active = requests.filter((request) => request.status === "accepted");
  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">📋</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">MENTOR SPACE</span><h1>Mentor Dashboard</h1><p>Review requests, accept the right relationships and keep active mentorship focused around goals.</p></div><span className="kmb-status">🧑‍🏫 Mentor</span></header>
    {error && <div className="kmb-network-error">⚠️ {error}</div>}
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">INCOMING REQUESTS</span><h2>{incoming.length} waiting for review</h2><p>Each request shows the keeper's goal, context and the specific records they asked to discuss. Accepting creates the private workspace atomically.</p></div><button type="button" className="kmb-secondary" onClick={() => navigate("/community/keeper-meets-breeder")}>Back to KMB</button></div><div className="kmb-milestones">{incoming.map((request) => <article className="kmb-milestone" key={request.id}><span>🤝</span><div><strong>{request.goal}</strong><p>{request.message}</p><small>Requested records: {request.requestedRecords.join(", ") || "none"}</small><div className="kmb-admin-actions"><button type="button" className="kmb-primary-button" disabled={savingId === request.id} onClick={() => void accept(request)}>{savingId === request.id ? "Opening…" : "Accept & open workspace"}</button><button type="button" className="kmb-secondary" disabled={savingId === request.id} onClick={() => void decline(request)}>Decline</button></div></div><em>{new Date(request.createdAt).toLocaleDateString()}</em></article>)}{!incoming.length && <div className="kmb-coming"><span>🌱</span><div><strong>No incoming requests right now.</strong><p>Approved mentors will see new requests here when keepers choose them.</p></div></div>}</div></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">ACTIVE MENTORSHIPS</span><h2>{active.length} active relationship{active.length === 1 ? "" : "s"}</h2></div></div><div className="kmb-milestones">{active.map((request) => <article className="kmb-milestone" key={request.id}><span>🧠</span><div><strong>{request.goal}</strong><p>Accepted mentorship with the keeper. Workspace permissions remain explicit.</p><button type="button" className="kmb-secondary" onClick={() => navigate(request.workspaceId ? `/community/keeper-meets-breeder/workspace/${request.workspaceId}` : "/community/keeper-meets-breeder")}>{request.workspaceId ? "Open workspace" : "Workspace pending"}</button></div><em>Active</em></article>)}{!active.length && <p>No active mentorships yet.</p>}</div></section>
    <section className="kmb-safety"><div><span className="kmb-label">MENTORING PRINCIPLE</span><h2>Teach the reasoning, not just the answer.</h2><p>Good mentorship should help a keeper make better decisions independently. TTHC can surface records and learning gaps, but the mentor remains responsible for their own advice and boundaries.</p></div></section>
  </main>;
}
