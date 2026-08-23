import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { subscribeToMentorMentorshipRequests } from "../services/mentorshipRepository";
import type { MentorshipRequest } from "../services/mentorNetwork";
import "../styles/KeeperMeetsBreeder.css";

function formatDate(value?: string) {
  if (!value || value === "[object Object]") return "Date pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date pending" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function MyMentees() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    try {
      return subscribeToMentorMentorshipRequests(user.uid, setRequests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mentee relationships could not be loaded.");
    }
  }, [user]);

  const mentees = useMemo(() => requests.filter((request) => request.status === "accepted" && Boolean(request.workspaceId)), [requests]);
  const pending = useMemo(() => requests.filter((request) => request.status === "sent"), [requests]);

  return (
    <main className="kmb-page">
      <header className="kmb-hero">
        <div className="kmb-hero-mark">🧑‍🏫</div>
        <div>
          <span className="kmb-eyebrow">MENTORSHIP</span>
          <h1>My Mentees</h1>
          <p>Your active mentorship relationships, goals and private workspaces in one place.</p>
        </div>
      </header>

      {error && <p className="kmb-error">⚠️ {error}</p>}

      <section className="kmb-card-grid">
        <article className="kmb-card"><b>Active mentees</b><span>{mentees.length} {mentees.length === 1 ? "relationship" : "relationships"}</span></article>
        <article className="kmb-card"><b>Awaiting your response</b><span>{pending.length} {pending.length === 1 ? "request" : "requests"}</span></article>
      </section>

      <section className="kmb-section">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div><h2>Active mentorships</h2><p>Open a relationship to continue the private conversation and review the records the mentee chose to share.</p></div>
          <button className="kmb-secondary" onClick={() => navigate("/community/mentorship/mentor-dashboard")}>Review requests</button>
        </div>

        {mentees.length === 0 ? (
          <div className="kmb-card">
            <b>No active mentees yet.</b>
            <span>When you accept a mentorship request, its private workspace will appear here automatically.</span>
          </div>
        ) : (
          mentees.map((request) => (
            <article className="kmb-card" key={request.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <b>Mentorship goal: {request.goal}</b>
                  <p>{request.message || "No additional message supplied."}</p>
                  <small>Started {formatDate(request.acceptedAt)} · Shared records: {request.requestedRecords.join(", ") || "Profile only"}</small>
                </div>
                <button className="kmb-primary-button" onClick={() => navigate(`/community/mentorship/workspace/${request.workspaceId}`)}>Open workspace</button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="kmb-section">
        <h2>Mentor responsibility</h2>
        <div className="kmb-steps">
          <span>🔐 Respect the records the mentee explicitly shared</span>
          <span>🧠 Separate personal experience from established information</span>
          <span>🎯 Keep guidance focused on the agreed goal</span>
          <span>🚫 Stay within your competence and escalate appropriately when needed</span>
        </div>
      </section>
    </main>
  );
}
