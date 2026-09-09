import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getPrivacyPreferences } from "../services/privacyService";
import { addCommunityComment, getCommunityComments, watchCommunityComments, type CommunityComment } from "../services/communityCommentService";
import "../styles/CommunityPostDiscussion.css";

function dateLabel(value: unknown) {
  if (!value) return "Just now";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleString("en-GB");
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return new Date(value.toMillis()).toLocaleString("en-GB");
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "Just now" : parsed.toLocaleString("en-GB");
}

export default function CommunityPostDiscussion({ postId }: { postId: string }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [draft, setDraft] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setLoading(true);
    setError("");
    void getPrivacyPreferences(user.uid).then((privacy) => {
      if (active) setEnabled(privacy.communityMessaging === true);
    }).catch(() => { if (active) setEnabled(false); });
    const unsubscribe = watchCommunityComments(postId, (items) => { if (active) setComments(items); }, (reason) => { if (active) setError(reason.message); });
    void getCommunityComments(postId).then((items) => { if (active) setComments(items); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Comments could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, [open, postId, user]);

  const canComment = Boolean(user && enabled);
  const countLabel = useMemo(() => `${comments.length} comment${comments.length === 1 ? "" : "s"}`, [comments.length]);

  async function send() {
    if (!user || !canComment || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await addCommunityComment({ postId, authorUid: user.uid, authorName: profile?.displayName || user.displayName || "Keeper", body: draft });
      setDraft("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Comment could not be posted.");
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  return <section className="community-discussion">
    <button type="button" className="community-discussion-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span>💬 {open ? "Hide discussion" : "Join the discussion"}</span>
      <small>{open ? countLabel : "Comments are visible to signed-in keepers"}</small>
    </button>
    {open && <div className="community-discussion-panel">
      {!enabled && <div className="community-discussion-locked"><strong>Comments are currently disabled for your account.</strong><span>You can still use Tiny Titans normally. Enable Community Conversations in My Account → Data &amp; Privacy to comment or message Tiny Titans.</span></div>}
      {loading ? <div className="community-discussion-empty">Loading the discussion…</div> : comments.length === 0 ? <div className="community-discussion-empty">No comments yet. Be the first keeper to add to the conversation.</div> : <div className="community-discussion-list">{comments.map((comment) => <article key={comment.id} className="community-discussion-comment"><div><strong>{comment.authorName}</strong><time>{dateLabel(comment.createdAt)}</time></div><p>{comment.body}</p></article>)}</div>}
      {canComment && <div className="community-discussion-composer"><textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} placeholder="Add a helpful, keeper-first comment…" rows={3} maxLength={2000} disabled={sending} /><div><small>{draft.length}/2000</small><button type="button" onClick={() => void send()} disabled={sending || !draft.trim()}>{sending ? "Posting…" : "Post comment"}</button></div></div>}
      {error && <p className="community-discussion-error" role="alert">{error}</p>}
    </div>}
  </section>;
}
