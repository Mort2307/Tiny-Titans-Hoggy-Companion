import { useNavigate } from "react-router-dom";
import CommunitySubmissionForm from "../components/community/CommunitySubmissionForm";
import { useAuth } from "../context/useAuth";
import "../styles/CommunityHub.css";

export default function CommunityCreate() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  if (!user) return <section className="community-page"><div className="community-empty"><span>🔐</span><h2>Sign in to contribute</h2><p>Community submissions are linked to your keeper account so permissions and ownership remain clear.</p></div></section>;

  return <section className="community-page"><button type="button" className="community-back-button" onClick={() => navigate("/community")}>← Community Hub</button><CommunitySubmissionForm authorId={user.uid} authorDisplayName={profile?.displayName || user.displayName || "Tiny Titans Keeper"} onCreated={() => undefined} /></section>;
}
