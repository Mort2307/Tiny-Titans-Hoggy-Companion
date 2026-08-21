import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCommunityContentById } from "../services/communityEcosystemService";
import { addCommunityReply, reactToCommunityContent, type CommunityReaction } from "../services/communityInteractionService";
import { reportCommunityContent, type CommunityReportReason } from "../services/communityModerationService";
import type { CommunityContent } from "../types/communityEcosystem";
import "../styles/CommunityHub.css";

const REPORT_REASONS: Array<{ value: CommunityReportReason; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "misinformation", label: "Misinformation" },
  { value: "harassment", label: "Harassment" },
  { value: "animal_welfare", label: "Animal welfare concern" },
  { value: "scam", label: "Scam" },
  { value: "incorrect_information", label: "Incorrect information" },
  { value: "other", label: "Other" },
];

export default function CommunityContentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [item, setItem] = useState<CommunityContent | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    void getCommunityContentById(id).then((result) => { if (mounted) setItem(result); }).catch(() => { if (mounted) setMessage("This community contribution could not be loaded."); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const react = async (reaction: CommunityReaction) => {
    if (!item || !user) { setMessage("Sign in to react to community content."); return; }
    setBusy(true); setMessage("");
    try { await reactToCommunityContent(item.id, user.uid, reaction); setItem({ ...item, engagement: { ...item.engagement, [reaction === "helpful" ? "helpful" : "likes"]: (item.engagement?.[reaction === "helpful" ? "helpful" : "likes"] ?? 0) + 1 } }); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record that reaction."); } finally { setBusy(false); }
  };

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item || !user || !reply.trim()) return;
    setBusy(true); setMessage("");
    try { await addCommunityReply(item.id, user.uid, profile?.displayName || user.displayName || "Tiny Titans Keeper", reply); setReply(""); setItem({ ...item, engagement: { ...item.engagement, comments: (item.engagement?.comments ?? 0) + 1 } }); setMessage("Reply posted."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to post your reply."); } finally { setBusy(false); }
  };

  const report = async () => {
    if (!item || !user) { setMessage("Sign in to report community content."); return; }
    const selection = window.prompt(`Why are you reporting this contribution?\n${REPORT_REASONS.map((reason, index) => `${index + 1}. ${reason.label}`).join("\n")}\n\nEnter a number:`);
    if (!selection) return;
    const index = Number.parseInt(selection, 10) - 1;
    const reason = Number.isInteger(index) ? REPORT_REASONS[index]?.value : undefined;
    if (!reason) { setMessage("Please choose a valid report reason."); return; }
    setBusy(true);
    try { await reportCommunityContent(item.id, user.uid, reason, "Reported from community detail view"); setMessage("Report submitted for moderation."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit the report."); } finally { setBusy(false); }
  };

  if (loading) return <section className="community-page"><div className="community-empty"><span>🐍</span><h2>Loading contribution…</h2></div></section>;
  if (!item) return <section className="community-page"><div className="community-empty"><span>🌱</span><h2>Contribution unavailable</h2><p>{message || "It may have been removed or is still awaiting moderation."}</p><button type="button" onClick={() => navigate("/community")}>Back to Community</button></div></section>;

  return <section className="community-page"><button type="button" className="community-back-button" onClick={() => navigate("/community")}>← Community Hub</button><article className="community-detail-card">{item.imageUrl && <img className="community-detail-image" src={item.imageUrl} alt="" />}{item.species && <span className="community-content-type">🦎 {item.species}{item.morph ? ` · ${item.morph}` : ""}</span>}<h1>{item.title}</h1><p className="community-detail-byline">Shared by {item.authorDisplayName || "Tiny Titans Keeper"}</p>{item.summary && <p className="community-detail-summary">{item.summary}</p>}{item.body && <div className="community-detail-body">{item.body.split("\n").map((line, index) => <p key={`${index}-${line.slice(0, 12)}`}>{line || " "}</p>)}</div>}<div className="community-detail-actions"><button type="button" disabled={busy} onClick={() => void react("helpful")}>🧠 Helpful · {item.engagement?.helpful ?? 0}</button><button type="button" disabled={busy} onClick={() => void react("like")}>❤️ Like · {item.engagement?.likes ?? 0}</button><button type="button" disabled={busy} onClick={() => void report()}>🚩 Report</button></div>{message && <p role="status" className="community-form-success">{message}</p>}<section className="community-reply-section"><h2>Join the conversation</h2><form onSubmit={submitReply}><textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} rows={5} placeholder={user ? "Add a useful, respectful reply…" : "Sign in to reply"} disabled={!user || busy} /><button type="submit" disabled={!user || busy || !reply.trim()}>{busy ? "Working…" : "Post reply →"}</button></form><p className="community-form-hint">Keep veterinary and welfare advice evidence-aware. Community experience is not a substitute for professional care.</p></section></article></section>;
}
