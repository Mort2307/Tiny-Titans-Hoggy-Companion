import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCreatorFeedback, getCreatorReports, getUserFeedback, getUserIssueReports, updateCreatorReport } from "../services/creatorService";
import { getCreatorUserDisplayNames } from "../services/creatorUserDirectoryService";
import { getConversationMessages, sendConversationMessage } from "../services/conversationService";
import { getCreatorSubmissionConversations, getUserSubmissionConversations, getSubmissionConversationMessages, sendSubmissionConversationMessage, type SubmissionConversationType } from "../services/submissionConversationService";
import { canTransitionReport, getReportLifecycleLabel } from "../services/reportLifecycle";
import { canonicaliseReportIssueStatus } from "../types/reportIssue";
import type { ConversationKind, ConversationMessage } from "../services/conversationService";
import type { Feedback } from "../types/feedback";
import type { ReportIssue } from "../types/reportIssue";
import type { SubmissionConversationMessage } from "../services/submissionConversationService";
import "../styles/CreatorTools.css";
import "../styles/ConversationInbox.css";

type Thread = { kind: ConversationKind | "submission"; id: string; title: string; summary: string; status: string; token?: string; userId: string; userDisplayName: string; createdAt?: unknown; submissionType?: SubmissionConversationType };
type Queue = "active" | "history";
type AnyMessage = ConversationMessage | SubmissionConversationMessage;
function displayDate(value: unknown) { if (!value) return ""; if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleString("en-GB"); if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return new Date(value.toMillis()).toLocaleString("en-GB"); const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-GB"); }
function timestamp(value: unknown) { if (!value) return 0; if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return Number(value.toMillis()) || 0; if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime() || 0; const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : 0; }
function isHistoryThread(thread: Thread) { if (thread.kind === "submission") return false; if (thread.kind === "bug") return ["Resolved", "Verified", "Rejected", "Duplicate", "Won't Fix"].includes(thread.status); return ["Implemented", "Declined", "Duplicate"].includes(thread.status); }
function threadStatusLabel(thread: Thread) { if (thread.kind === "submission") return thread.status || "Submission conversation"; return thread.kind === "bug" && thread.status === "Resolved" ? "Fixed & Confirmed" : getReportLifecycleLabel(thread.status as ReportIssue["status"]); }
function threadIcon(thread: Thread) { if (thread.kind === "submission") return "💬"; return thread.kind === "bug" ? "🐛" : "💡"; }

export default function ConversationInbox({ creatorMode = false }: { creatorMode?: boolean }) {
  const { user } = useAuth(); const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]); const [selected, setSelected] = useState<Thread | null>(null); const [messages, setMessages] = useState<AnyMessage[]>([]); const [draft, setDraft] = useState(""); const [loading, setLoading] = useState(true); const [loadingMessages, setLoadingMessages] = useState(false); const [sending, setSending] = useState(false); const [fixing, setFixing] = useState(false); const [error, setError] = useState(""); const [queue, setQueue] = useState<Queue>("active");

  async function loadThreads() {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const [bugs, feedback, submissions] = creatorMode
        ? await Promise.all([getCreatorReports(), getCreatorFeedback(), getCreatorSubmissionConversations()])
        : await Promise.all([getUserIssueReports(user.uid), getUserFeedback(user.uid), getUserSubmissionConversations(user.uid)]);
      const bugThreads = (bugs as ReportIssue[]).map((item) => ({ kind: "bug" as const, id: item.id, title: item.title, summary: item.description, status: canonicaliseReportIssueStatus(item.status), token: item.issueToken, userId: item.userId ?? "", userDisplayName: "", createdAt: item.createdAt })).filter((item) => item.userId);
      const feedbackThreads = (feedback as Feedback[]).map((item) => ({ kind: "feedback" as const, id: item.id, title: item.title, summary: item.message, status: String(item.status ?? "New"), userId: item.userId ?? "", userDisplayName: "", createdAt: item.createdAt })).filter((item) => item.userId);
      const submissionThreads = submissions.map((item) => ({ kind: "submission" as const, id: item.id, title: item.submissionTitle, summary: item.lastMessagePreview || "Submission conversation — open to view and reply.", status: item.submissionStatus || "Submission conversation", userId: item.submitterUid, userDisplayName: "", createdAt: item.lastMessageAt ?? item.createdAt, submissionType: item.submissionType }));
      const nextThreads = [...bugThreads, ...feedbackThreads, ...submissionThreads];
      const names = creatorMode ? await getCreatorUserDisplayNames(nextThreads.map((item) => item.userId)) : { [user.uid]: user.displayName?.trim() || "You" };
      setThreads(nextThreads.map((item) => ({ ...item, userDisplayName: names[item.userId] || "Anonymous user" })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load messages.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadThreads(); }, [user, creatorMode]);
  useEffect(() => { const target = searchParams.get("thread"); if (!target || !threads.length || selected) return; const [targetKind, targetId] = target.split(":"); const targetThread = threads.find((thread) => thread.kind === targetKind && thread.id === targetId); if (targetThread) setSelected(targetThread); }, [searchParams, threads, selected]);
  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    let active = true;
    setLoadingMessages(true); setError("");
    const load = selected.kind === "submission" ? getSubmissionConversationMessages(selected.id) : getConversationMessages(selected.kind, selected.id);
    void load.then((items) => { if (active) setMessages(items); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load this conversation."); }).finally(() => { if (active) setLoadingMessages(false); });
    return () => { active = false; };
  }, [selected]);

  const activeThreads = useMemo(() => threads.filter((thread) => !isHistoryThread(thread)).sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt)), [threads]);
  const historyThreads = useMemo(() => threads.filter(isHistoryThread).sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt)), [threads]);
  const visibleThreads = queue === "active" ? activeThreads : historyThreads;

  async function sendReply(message = draft) {
    if (!user || !selected || !message.trim() || sending || fixing) return;
    setSending(true); setError("");
    try {
      if (selected.kind === "submission") await sendSubmissionConversationMessage({ conversationId: selected.id, senderId: user.uid, senderRole: creatorMode ? "creator" : "user", message });
      else await sendConversationMessage({ kind: selected.kind, parentId: selected.id, senderId: user.uid, senderRole: creatorMode ? "creator" : "user", message });
      setMessages(selected.kind === "submission" ? await getSubmissionConversationMessages(selected.id) : await getConversationMessages(selected.kind, selected.id));
      setDraft("");
      await loadThreads();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to send your message."); }
    finally { setSending(false); }
  }

  async function markFixedAndNotify() {
    if (!user || !selected || selected.kind !== "bug" || fixing || sending) return;
    const currentStatus = selected.status as ReportIssue["status"];
    if (!canTransitionReport(currentStatus, "Resolved")) { setError(`This report cannot be marked Fixed & Confirmed from ${threadStatusLabel(selected)}.`); return; }
    const message = draft.trim() || "We've fixed this issue and confirmed the fix. Thank you for reporting it to Tiny Titans.";
    setFixing(true); setError("");
    try { await updateCreatorReport(selected.id, "Resolved", { creatorMessage: message }, user.uid); await sendConversationMessage({ kind: "bug", parentId: selected.id, senderId: user.uid, senderRole: "creator", message }); const next = { ...selected, status: "Resolved" }; setThreads((current) => current.map((thread) => thread.kind === next.kind && thread.id === next.id ? next : thread)); setSelected(next); setMessages(await getConversationMessages("bug", selected.id)); setDraft(""); setQueue("history"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to confirm the fix and notify the reporter."); }
    finally { setFixing(false); }
  }

  function selectQueue(nextQueue: Queue) { setQueue(nextQueue); setSelected(null); setMessages([]); setDraft(""); setError(""); }
  if (!user) return null;
  const canMarkFixed = creatorMode && selected?.kind === "bug" && canTransitionReport(selected.status as ReportIssue["status"], "Resolved");
  const otherPartyLabel = selected?.kind === "submission" ? (creatorMode ? `${selected.userDisplayName}'s keeper` : "Tiny Titans") : selected?.userDisplayName;

  return <main className="page-container conversation-inbox"><section className="creator-tools-card conversation-shell">
    <div className="creator-tools-header conversation-header"><span aria-hidden="true">💬</span><div><p className="eyebrow">TINY TITANS · {creatorMode ? "CREATOR MESSAGE CENTRE" : "MESSAGE CENTRE"}</p><h1>{creatorMode ? "Community Message Centre" : "My Message Centre"}</h1><p>{creatorMode ? "One place for submission messages, bug reports and feedback. Reply directly to keepers and every message stays attached to its source." : "One place for Tiny Titans replies, submission updates, questions and feedback. Send and receive messages without leaving the app."}</p></div></div>
    {error && <div className="creator-error" role="alert">{error}</div>}
    {loading ? <p className="creator-muted">Loading messages…</p> : <>
      <div className="conversation-queue-tabs" role="tablist" aria-label="Message queues"><button type="button" role="tab" aria-selected={queue === "active"} className={queue === "active" ? "conversation-queue-tab conversation-queue-tab-active" : "conversation-queue-tab"} onClick={() => selectQueue("active")}>💬 Active <span>{activeThreads.length}</span></button><button type="button" role="tab" aria-selected={queue === "history"} className={queue === "history" ? "conversation-queue-tab conversation-queue-tab-active" : "conversation-queue-tab"} onClick={() => selectQueue("history")}>🗄️ History <span>{historyThreads.length}</span></button></div>
      {visibleThreads.length === 0 ? <div className="creator-success conversation-empty"><h2>{queue === "active" ? "Your message centre is clear" : "No message history yet"}</h2><p>{queue === "active" ? "New replies and submission conversations will appear here automatically." : "Completed conversations are retained here for reference."}</p>{!creatorMode && queue === "active" && <div className="creator-actions"><Link to="/report-bug">🐛 Report an issue</Link><Link to="/feedback">💡 Send feedback</Link></div>}</div> : <div className="conversation-grid">
        <div className="creator-list conversation-thread-list"><div className="conversation-queue-label">{queue === "active" ? "Active messages" : "Completed messages"}</div>{visibleThreads.map((thread) => <button key={`${thread.kind}-${thread.id}`} type="button" className={`creator-list-card conversation-thread ${selected?.id === thread.id && selected.kind === thread.kind ? "conversation-thread-selected" : ""}`} onClick={() => setSelected(thread)}><span className="conversation-thread-type">{threadIcon(thread)} {thread.kind === "submission" ? "Submission" : thread.kind === "bug" ? "Bug Report" : "Feedback"}</span><strong>{thread.title}</strong><small>{thread.userDisplayName} · {threadStatusLabel(thread)}{thread.token ? ` · ${thread.token}` : ""}</small><p>{thread.summary}</p></button>)}</div>
        <section className="creator-list-card conversation-detail" aria-live="polite">{selected ? <>
          <div className="creator-list-top conversation-detail-top"><div><span className="creator-badge">{threadIcon(selected)} {selected.kind === "submission" ? "Submission conversation" : selected.kind === "bug" ? "Bug Report" : "Feedback"}</span><h2>{selected.title}</h2><p className="conversation-user"><strong>{otherPartyLabel}</strong><span> · {threadStatusLabel(selected)}</span>{selected.token && <span> · {selected.token}</span>}</p></div><button type="button" onClick={() => setSelected(null)}>Close</button></div>
          {queue === "active" && creatorMode && selected.kind !== "submission" && <div className="conversation-reply conversation-reply-top"><label htmlFor="conversation-reply-creator"><strong>💬 Reply to {selected.userDisplayName}</strong></label><textarea id="conversation-reply-creator" value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} maxLength={5000} placeholder="Write a reply…" disabled={sending || fixing}/><div className="creator-actions"><button type="button" className="creator-primary" onClick={() => void sendReply()} disabled={sending || fixing || !draft.trim()}>{sending ? "Sending…" : "💬 Send Reply"}</button>{canMarkFixed && <button type="button" className="creator-primary" onClick={() => void markFixedAndNotify()} disabled={sending || fixing}>{fixing ? "Confirming fix…" : "✅ Fixed & Confirmed"}</button>}</div>{canMarkFixed && <small className="creator-muted">This marks the bug Resolved and sends the reporter your message immediately.</small>}</div>}
          <div className="conversation-messages">{loadingMessages ? <p>Loading messages…</p> : messages.length === 0 ? <p className="creator-muted">No messages yet. Start the conversation.</p> : messages.map((item) => <article key={item.id} className={item.senderRole === (creatorMode ? "creator" : "user") ? "creator-success" : "creator-tools-card"}><strong>{item.senderRole === "creator" ? "🐍 Tiny Titans" : selected.userDisplayName ? `👤 ${selected.userDisplayName}` : "👤 Keeper"}</strong><p>{item.message}</p><small>{displayDate(item.createdAt)}</small></article>)}</div>
          {queue === "history" ? <div className="conversation-history-note"><strong>🗄️ Archived conversation</strong><p>This conversation is retained for reference.</p></div> : <div className="conversation-reply"><label htmlFor={`conversation-reply-${selected.kind}-${selected.id}`}><strong>{creatorMode ? `Write a message to ${selected.userDisplayName}` : "Reply to Tiny Titans"}</strong></label><textarea id={`conversation-reply-${selected.kind}-${selected.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} maxLength={5000} placeholder={creatorMode ? "Write a reply, thank-you, question or clarification…" : "Write your message…"} disabled={sending}/><button type="button" className="creator-primary" onClick={() => void sendReply()} disabled={sending || !draft.trim()}>{sending ? "Sending…" : "💬 Send Message"}</button></div>}
        </> : <div className="creator-muted conversation-detail-placeholder">Select a message to view its history.</div>}</section>
      </div>}
    </>}
  </section></main>;
}
