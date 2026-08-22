import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { subscribeToMentorshipRequest } from "../services/mentorshipRepository";
import type { MentorshipRequest } from "../services/mentorNetwork";
import "../styles/KeeperMeetsBreeder.css";

const statusCopy: Record<MentorshipRequest["status"], { title: string; text: string; icon: string }> = {
  draft: { title: "Draft request", text: "This request has not been sent yet.", icon: "📝" },
  sent: { title: "Request sent", text: "Your request is with the mentor. TTHC will show the status here as it changes.", icon: "📨" },
  accepted: { title: "Mentor accepted", text: "Your private mentorship workspace is now available.", icon: "🤝" },
  declined: { title: "Request declined", text: "The mentor has declined this request. You can choose another suitable mentor.", icon: "↩️" },
  cancelled: { title: "Request cancelled", text: "This mentorship request is no longer active.", icon: "✖️" },
};

export default function MentorshipRequestSent() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<MentorshipRequest | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!requestId || !user) return;
    return subscribeToMentorshipRequest(requestId, (next) => {
      if (next && next.requesterId !== user.uid) { setError("This request does not belong to your account."); setRequest(null); return; }
      setRequest(next);
    });
  }, [requestId, user]);
  if (!requestId || error || !request) return <main className="kmb-page"><div className="kmb-coming"><span>🔎</span><div><strong>{error || "Loading your mentorship request…"}</strong><p>Request status is private to the keeper who created it.</p><button type="button" className="kmb-primary-button" onClick={() => navigate("/community/keeper-meets-breeder")}>Back to Keeper Meets Breeder</button></div></div></main>;
  const copy = statusCopy[request.status];
  return <main className="kmb-page"><header className="kmb-hero"><div className="kmb-hero-mark">{copy.icon}</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">MENTORSHIP REQUEST</span><h1>{copy.title}</h1><p>{copy.text}</p></div><span className="kmb-status">{request.status}</span></header><section className="kmb-section"><div className="kmb-track-grid"><article className="kmb-track"><h3>Your goal</h3><p>{request.goal}</p></article><article className="kmb-track"><h3>Requested records</h3><p>{request.requestedRecords.join(" · ") || "None"}</p></article></div></section>{request.status === "accepted" && request.workspaceId ? <section className="kmb-workspace-launch"><div><span className="kmb-label">PRIVATE WORKSPACE</span><h2>Your mentorship is active</h2><p>The mentor accepted. Your shared permissions and private conversation are now ready.</p></div><button type="button" className="kmb-primary-button" onClick={() => navigate(`/community/keeper-meets-breeder/workspace/${request.workspaceId}`)}>Open mentorship workspace</button></section> : <section className="kmb-safety"><div><span className="kmb-label">NEXT STEP</span><h2>{request.status === "sent" ? "Wait for the mentor's decision" : "Choose another mentor if you still want help"}</h2><p>TTHC keeps the request separate from your private tracker data until a mentorship is accepted and the requested permissions are applied.</p></div><button type="button" className="kmb-secondary" onClick={() => navigate("/community/keeper-meets-breeder/mentors")}>Browse mentors</button></section>}</main>;
}
