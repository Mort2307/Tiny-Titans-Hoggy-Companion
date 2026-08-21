import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { addCommunityReply, reactToCommunityContent } from "../services/communityInteractionService";
import { getCommunityContentById, getCommunityReplies, type CommunityReply } from "../services/communityThreadService";
import { getCommunitySignals } from "../services/communityIntelligence";
import type { CommunityContent } from "../types/communityEcosystem";
import "../styles/CommunityHub.css";

function displayDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function CommunityThread() {
  const { contentId } = useParams<{ contentId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<CommunityContent | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!contentId) return;
    setLoading(true); setError("");
    try {
      const [nextContent, nextReplies] = await Promise.all([getCommunityContentById(contentId), getCommunityReplies(contentId)]);
      if (!nextContent) throw new Error("This community contribution could not be found.");
      if (nextContent.moderationStatus === "pending" && nextContent.authorId !== user?.uid && profile?.role !== "admin") throw new Error("This contribution is awaiting moderation.");
      if (nextContent.moderationStatus === "rejected" && nextContent.authorId !== user?.uid && profile?.role !== "admin") throw new Error("This contribution is no longer available.");
      setContent(nextContent); setReplies(nextReplies);
    } catch (threadError) { setError(threadError instanceof Error ? threadError.message : "Unable to load this community contribution."); }
    finally { setLoading(false); }
  }, [contentId, user?.uid, profile?.role]);

  useEffect(() => { void load(); }, [load]);

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contentId || !user || !reply.trim()) return;
    setSaving(true); setError("");
    try {
      await addCommunityReply(contentId, user.uid, profile?.displayName || user.displayName || "Tiny Titans Keeper", reply);
      setReply(""); await load();
    } catch (replyError) { setError(replyError instanceof Error ? replyError.message : "Unable to add your reply."); }
    finally { setSaving(false); }
  };

  const react = async (reaction: "like" | "helpful") => {
    if (!contentId || !user) return;
    try { await reactToCommunityContent(contentId, user.uid, reaction); await load(); } catch (reactionError) { setError(reactionError instanceof Error ? reactionError.message : "Unable to record that reaction."); }
  };

  if (loading) return <section className="community-page"><div className="community-empty"><span>🐍</span><h2>Loading discussion…</h2><p>Putting the conversation together.</p></div></section>;
  if (error && !content) return <section className="community-page"><button type="button" className="community-back-button" onClick={() => navigate("/community")}>← Community Hub</button><div className="community-empty community-error"><span>⚠️</span><h2>Unable to open this contribution</h2><p>{error}</p></div></section>;
  if (!content) return null;

  const signals = getCommunitySignals(content);
  return <section className="community-page">
    <button type="button" className="community-back-button" onClick={() => navigate("/community")}>← Community Hub</button>
    <article className="community-thread">
      <header className="community-thread-header"><div><span className="community-eyebrow">{content.type.toUpperCase()}</span><h1>{content.title}</h1><p>Shared by <strong>{content.authorDisplayName || "Tiny Titans Keeper"}</strong>{content.createdAt ? ` · ${displayDate(content.createdAt)}` : ""}</p></div>{content.moderationStatus === "pending" && <span className="community-priority">Awaiting moderation</span>}</header>
      {content.imageUrl && <img className="community-thread-image" src={content.imageUrl} alt="" />}
      {content.summary && <p className="community-thread-summary">{content.summary}</p>}
      {content.body && <div className="community-thread-body">{content.body.split("\n").map((line, index) => <p key={`${index}-${line}`}>{line || " "}</p>)}</div>}
      {(content.species || content.morph || content.board) && <div className="community-thread-meta">{content.species && <span>🐍 {content.species}</span>}{content.morph && <span>🧬 {content.morph}</span>}{content.board && <span>💬 {content.board}</span>}</div>}
      {signals.length > 0 && <div className="community-thread-signals">{signals.map((signal) => <span key={signal.label} title={signal.reason}>✓ {signal.label}</span>)}</div>}
      <div className="community-thread-actions"><button type="button" onClick={() => void react("like")} disabled={!user}>❤️ {content.engagement?.likes ?? 0}</button><button type="button" onClick={() => void react("helpful")} disabled={!user}>🧠 Helpful {content.engagement?.helpful ?? 0}</button></div>
    </article>

    <section className="community-replies"><div className="community-subheading"><div><span className="community-eyebrow">DISCUSSION</span><h2>{replies.length} {replies.length === 1 ? "reply" : "replies"}</h2><p>Keep the conversation useful, respectful and focused on the animal.</p></div></div>
      {replies.length === 0 && <div className="community-empty"><span>💬</span><h3>Start the conversation</h3><p>No replies yet. Be the first useful voice.</p></div>}
      {replies.map((item) => <article className="community-reply" key={item.id}><div><strong>{item.authorDisplayName || "Tiny Titans Keeper"}</strong><time>{displayDate(item.createdAt)}</time></div><p>{item.body}</p></article>)}
      {user ? <form className="community-reply-form" onSubmit={submitReply}><label>Your reply<textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} rows={4} placeholder="Add something useful…" required /></label>{error && <p className="community-form-error" role="alert">{error}</p>}<button type="submit" disabled={saving || !reply.trim()}>{saving ? "Posting…" : "Reply →"}</button></form> : <div className="community-empty"><p>Sign in to join the conversation.</p></div>}
    </section>
  </section>;
}
