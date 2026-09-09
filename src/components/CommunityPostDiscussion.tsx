import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createCommunityPostComment, deleteCommunityPostComment, getCommunityPostComments, reportCommunityPostComment, type CommunityComment } from "../services/communityCommentService";
import { getPrivacyPreferences } from "../services/privacyService";
import { useAuth } from "../context/useAuth";
import "../styles/CommunityPostDiscussion.css";

export default function CommunityPostDiscussion({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [message, setMessage] = useState("");
  const [messagingEnabled, setMessagingEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    void getPrivacyPreferences(user.uid).then((privacy) => { if (active) setMessagingEnabled(privacy.communityMessaging === true); }).catch(() => { if (active) setMessagingEnabled(false); });
    return () => { active = false; };
  }, [user]);
  async function openDiscussion() {
    setExpanded(true); setError(""); setLoading(true);
    try { const result = await getCommunityPostComments(postId); setComments(result.comments); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Comments could not be loaded."); }
    finally { setLoading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !messagingEnabled || posting) return;
    const text = message.trim(); if (!text) return;
    setPosting(true); setError("");
    try { const created = await createCommunityPostComment(postId, text); setComments((current) => [created, ...current]); setMessage(""); }
    catch (postError) { setError(postError instanceof Error ? postError.message : "Your comment could not be posted."); }
    finally { setPosting(false); }
  }
  async function remove(commentId: string) { try { await deleteCommunityPostComment(postId, commentId); setComments((current) => current.filter((comment) => comment.id !== commentId)); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "The comment could not be deleted."); } }
  async function report(commentId: string) { const reason = window.prompt("Why are you reporting this comment?", "Inappropriate or unsafe community content"); if (!reason?.trim()) return; try { await reportCommunityPostComment(postId, commentId, reason.trim()); setError("Report sent to the Tiny Titans moderation queue."); } catch (reportError) { setError(reportError instanceof Error ? reportError.message : "The report could not be submitted."); } }
  return <section className="community-discussion" aria-label="Community discussion">
    <button type="button" className="community-discussion-toggle" onClick={() => expanded ? setExpanded(false) : void openDiscussion()}>💬 {expanded ? "Hide discussion" : "Discuss this update"} {comments.length > 0 && <span>{comments.length}</span>}</button>
    {expanded && <div className="community-discussion-body">
      {messagingEnabled && user ? <form onSubmit={submit} className="community-discussion-form"><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={3} placeholder="Share a helpful question, experience or observation…" disabled={posting} /><div><small>{message.length}/2000 · Be constructive and protect other keepers' privacy.</small><button type="submit" disabled={posting || !message.trim()}>{posting ? "Posting…" : "Post comment"}</button></div></form> : <div className="community-discussion-permission"><strong>Commenting is off for your account.</strong><span>Core community reading remains available. Enable Community Messaging in My Account → Data &amp; Privacy to participate.</span></div>}
      {error && <p className="community-discussion-error" role="alert">{error}</p>}
      {loading && <p className="community-discussion-muted">Loading discussion…</p>}
      {!loading && comments.length === 0 && <p className="community-discussion-muted">No comments yet. Start the conversation with a useful question or observation.</p>}
      {!loading && comments.length > 0 && <div className="community-discussion-list">{comments.map((comment) => <article key={comment.id} className="community-comment"><div><strong>{comment.authorName}</strong>{comment.authorIsCreator && <span className="community-comment-badge">Creator</span>}<time>{new Date(comment.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></div><p>{comment.text}</p><footer>{comment.canDelete ? <button type="button" onClick={() => void remove(comment.id)}>Delete</button> : <button type="button" onClick={() => void report(comment.id)}>Report</button>}</footer></article>)}</div>}
    </div>}
  </section>;
}
