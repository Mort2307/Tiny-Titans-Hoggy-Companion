import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCreatorSubmissionConversations, getSubmissionConversationMessages, getUserSubmissionConversations, markSubmissionConversationRead, sendSubmissionConversationMessage, watchSubmissionConversationMessages, type SubmissionConversation, type SubmissionConversationMessage } from "../services/submissionConversationService";
import "../styles/ConversationInbox.css";

function dateLabel(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleString("en-GB");
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return new Date(value.toMillis()).toLocaleString("en-GB");
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("en-GB");
}

const typeLabel: Record<SubmissionConversation["submissionType"], string> = { direct: "✉️ Direct message", "morph-image": "📷 Morph photo", "morph-terminology": "🌎 Morph terminology", species: "🐍 Species", "vivarium-showcase": "🏡 Vivarium", observation: "🔎 Observation", "mentor-application": "🛡️ Mentor application" };

export default function SubmissionConversationInbox({ creatorMode = false }: { creatorMode?: boolean }) {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<SubmissionConversation[]>([]);
  const [selected, setSelected] = useState<SubmissionConversation | null>(null);
  const [messages, setMessages] = useState<SubmissionConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const actualCreatorMode = creatorMode && profile?.role === "admin";
  const mailboxPath = actualCreatorMode ? "/creator/submission-conversations" : "/conversations/submissions";

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError("");
    void (actualCreatorMode ? getCreatorSubmissionConversations() : getUserSubmissionConversations(user.uid))
      .then((items) => { if (active) setThreads(items); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Submission conversations could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, actualCreatorMode]);

  useEffect(() => {
    const id = searchParams.get("thread");
    if (!id || selected || !threads.length) return;
    const target = threads.find((thread) => thread.id === id);
    if (target) setSelected(target);
  }, [searchParams, selected, threads]);

  useEffect(() => {
    if (!selected || !user) { setMessages([]); return; }
    void markSubmissionConversationRead(selected.id, actualCreatorMode ? "creator" : "user").catch(() => undefined);
    let active = true;
    const unsubscribe = watchSubmissionConversationMessages(selected.id, (items) => { if (active) setMessages(items); }, (reason) => { if (active) setError(reason.message); });
    void getSubmissionConversationMessages(selected.id).then((items) => { if (active) setMessages(items); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load messages."); });
    return () => { active = false; unsubscribe(); };
  }, [selected, user, actualCreatorMode]);

  const unread = useMemo(() => threads.reduce((sum, thread) => sum + (actualCreatorMode ? Number(thread.unreadForCreator ?? 0) : Number(thread.unreadForSubmitter ?? 0)), 0), [threads, actualCreatorMode]);

  async function send() {
    if (!selected || !user || !draft.trim() || sending) return;
    setSending(true); setError("");
    try { await sendSubmissionConversationMessage({ conversationId: selected.id, senderId: user.uid, senderRole: actualCreatorMode ? "creator" : "user", message: draft }); setDraft(""); await markSubmissionConversationRead(selected.id, actualCreatorMode ? "creator" : "user"); const updated = await getSubmissionConversationMessages(selected.id); setMessages(updated); const latest = await (actualCreatorMode ? getCreatorSubmissionConversations() : getUserSubmissionConversations(user.uid)); setThreads(latest); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Message could not be sent."); }
    finally { setSending(false); }
  }

  if (!user) return null;
  return <main className="page-container conversation-inbox"><section className="creator-tools-card conversation-shell"><div className="creator-tools-header conversation-header"><span aria-hidden="true">💬</span><div><p className="eyebrow">TINY TITANS · SUBMISSION MESSAGES</p><h1>{actualCreatorMode ? "Submission Conversations" : "Submission Messages"}</h1><p>{actualCreatorMode ? "Ask keepers questions directly from the review queue." : "Keep every Tiny Titans submission conversation in one place."}</p></div></div>{error && <div className="creator-error" role="alert">{error}</div>}{loading ? <p className="creator-muted">Loading submission conversations…</p> : <div className="conversation-queue-tabs"><div className="conversation-queue-tab conversation-queue-tab-active">💬 {threads.length} threads · {unread} unread for you</div></div>}{!loading && <div className="conversation-grid"><div className="creator-list conversation-thread-list"><div className="conversation-queue-label">Submission threads</div>{threads.length === 0 ? <div className="creator-list-item"><strong>No submission conversations yet.</strong><span>When a submission needs clarification, its conversation appears here.</span></div> : threads.map((thread) => { const myUnread = actualCreatorMode ? Number(thread.unreadForCreator ?? 0) : Number(thread.unreadForSubmitter ?? 0); return <button key={thread.id} type="button" className={`creator-list-card conversation-thread ${selected?.id === thread.id ? "conversation-thread-selected" : ""}`} onClick={() => setSelected(thread)}><span className="conversation-thread-type">{typeLabel[thread.submissionType]}</span><strong>{thread.submissionTitle}</strong><small>{thread.submissionStatus || "Conversation"}{myUnread > 0 ? ` · ${myUnread} unread` : ""}</small><p>{thread.lastMessagePreview || (thread.submissionType === "direct" ? "Direct message with Tiny Titans — open to start messaging." : "No messages yet — open to start the conversation.")}</p></button>; })}</div><section className="creator-list-card conversation-detail">{selected ? <><div className="creator-list-top conversation-detail-top"><div><span className="creator-badge">{typeLabel[selected.submissionType]}</span><h2>{selected.submissionTitle}</h2><p className="conversation-user">Conversation status: {selected.submissionStatus || "Open"}</p></div><Link to={mailboxPath}>Close</Link></div><div className="conversation-messages">{messages.length === 0 ? <p className="creator-muted">No messages yet.</p> : messages.map((item) => <article key={item.id} className={item.senderRole === (actualCreatorMode ? "creator" : "user") ? "creator-success" : "creator-tools-card"}><strong>{item.senderRole === "creator" ? "🐍 Tiny Titans" : "👤 Keeper"}</strong><p>{item.message}</p><small>{dateLabel(item.createdAt)}</small></article>)}</div><div className="conversation-reply"><label htmlFor="submission-mailbox-reply"><strong>{actualCreatorMode ? "Message the keeper" : "Message Tiny Titans"}</strong></label><textarea id="submission-mailbox-reply" value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} maxLength={5000} placeholder={actualCreatorMode ? "Write a reply, thank-you, question or clarification…" : "Write your message to Tiny Titans…"} disabled={sending} /><button type="button" className="creator-primary" onClick={() => void send()} disabled={sending || !draft.trim()}>{sending ? "Sending…" : "💬 Send message"}</button></div></> : <div className="creator-muted conversation-detail-placeholder">Select a conversation.</div>}</section></div>}</section></main>;
}
