import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCreatorUserDisplayNames } from "../services/creatorUserDirectoryService";
import {
  ensureDirectConversation,
  ensureSubmissionConversation,
  getCreatorSubmissionConversations,
  getSubmissionConversationMessages,
  getUserSubmissionConversations,
  markSubmissionConversationRead,
  sendSubmissionConversationMessage,
  watchSubmissionConversationMessages,
  type SubmissionConversation,
  type SubmissionConversationMessage,
  type SubmissionConversationType,
} from "../services/submissionConversationService";
import "../styles/MessagesPage.css";

const labels: Record<SubmissionConversationType, string> = {
  direct: "Direct message",
  "morph-image": "Morph photo",
  "morph-terminology": "Morph terminology",
  species: "Species submission",
  "vivarium-showcase": "Vivarium showcase",
  observation: "Keeper observation",
  "mentor-application": "Mentor application",
};

const icons: Record<SubmissionConversationType, string> = {
  direct: "✉️",
  "morph-image": "📷",
  "morph-terminology": "🌎",
  species: "🐍",
  "vivarium-showcase": "🏡",
  observation: "🔎",
  "mentor-application": "🛡️",
};

function dateLabel(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleString("en-GB");
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return new Date(value.toMillis()).toLocaleString("en-GB");
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("en-GB");
}

function subjectLabel(thread: SubmissionConversation, creatorMode: boolean, names: Record<string, string>) {
  if (thread.submissionType === "direct") return creatorMode ? (names[thread.submitterUid] || "Keeper") : "Tiny Titans";
  return thread.submissionTitle || labels[thread.submissionType];
}

export default function MessagesPage({ creatorMode = false }: { creatorMode?: boolean }) {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<SubmissionConversation[]>([]);
  const [selected, setSelected] = useState<SubmissionConversation | null>(null);
  const [messages, setMessages] = useState<SubmissionConversationMessage[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [initialising, setInitialising] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const actualCreatorMode = creatorMode && profile?.role === "admin";

  const loadThreads = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      if (actualCreatorMode) {
        const items = await getCreatorSubmissionConversations(250);
        setThreads(items);
        const ids = [...new Set(items.map((item) => item.submitterUid).filter(Boolean))];
        setNames(await getCreatorUserDisplayNames(ids));
      } else {
        const direct = await ensureDirectConversation(user.uid, user.displayName?.trim() || "Keeper");
        const items = await getUserSubmissionConversations(user.uid);
        setThreads(items.some((item) => item.id === direct.id) ? items : [direct, ...items]);
        setNames({ [user.uid]: user.displayName?.trim() || "You" });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadThreads();
  }, [user, actualCreatorMode]);

  useEffect(() => {
    const target = searchParams.get("thread");
    if (!target || !threads.length) return;
    const found = threads.find((thread) => thread.id === target);
    if (found) setSelected(found);
  }, [searchParams, threads]);

  useEffect(() => {
    const recipientUid = searchParams.get("recipientUid");
    const submissionId = searchParams.get("submissionId");
    const submissionType = searchParams.get("submissionType") as Exclude<SubmissionConversationType, "direct"> | null;
    const submissionTitle = searchParams.get("submissionTitle") || "Submission conversation";
    if (!user || !actualCreatorMode || !recipientUid || !submissionId || !submissionType || !Object.prototype.hasOwnProperty.call(labels, submissionType)) return;
    let active = true;
    setInitialising(true);
    setError("");
    void ensureSubmissionConversation({ submissionType, submissionId, submitterUid: recipientUid, submissionTitle })
      .then(async (conversation) => {
        if (!active) return;
        setSelected(conversation);
        await loadThreads();
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "The conversation could not be opened."); })
      .finally(() => { if (active) setInitialising(false); });
    return () => { active = false; };
  }, [user, actualCreatorMode, searchParams.get("recipientUid"), searchParams.get("submissionId"), searchParams.get("submissionType")]);

  useEffect(() => {
    if (!selected || !user) {
      setMessages([]);
      return;
    }
    void markSubmissionConversationRead(selected.id, actualCreatorMode ? "creator" : "user").catch(() => undefined);
    let active = true;
    setError("");
    const unsubscribe = watchSubmissionConversationMessages(selected.id, (items) => { if (active) setMessages(items); }, (reason) => { if (active) setError(reason.message); });
    void getSubmissionConversationMessages(selected.id).then((items) => { if (active) setMessages(items); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Messages could not be loaded."); });
    const focusTimer = window.setTimeout(() => {
      replyRef.current?.focus({ preventScroll: true });
      replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 120);
    return () => { active = false; window.clearTimeout(focusTimer); unsubscribe(); };
  }, [selected, user, actualCreatorMode]);

  const recipientName = selected ? subjectLabel(selected, actualCreatorMode, names) : actualCreatorMode ? "Keeper" : "Tiny Titans";
  const unread = useMemo(() => threads.reduce((total, item) => total + (actualCreatorMode ? Number(item.unreadForCreator ?? 0) : Number(item.unreadForSubmitter ?? 0)), 0), [threads, actualCreatorMode]);

  async function send() {
    const message = draft.trim();
    if (!selected || !user || !message || sending) return;
    setSending(true);
    setError("");
    try {
      await sendSubmissionConversationMessage({ conversationId: selected.id, senderId: user.uid, senderRole: actualCreatorMode ? "creator" : "user", message });
      setDraft("");
      await markSubmissionConversationRead(selected.id, actualCreatorMode ? "creator" : "user");
      const latest = await getSubmissionConversationMessages(selected.id);
      setMessages(latest);
      await loadThreads();
      window.setTimeout(() => replyRef.current?.focus({ preventScroll: true }), 0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  function startDirect() {
    const direct = threads.find((item) => item.submissionType === "direct");
    if (direct) {
      setSelected(direct);
      setDraft("");
    }
  }

  if (!user) return null;
  return (
    <main className="messages-page">
      <header className="messages-page__header">
        <div>
          <span className="messages-page__eyebrow">TINY TITANS · {actualCreatorMode ? "CREATOR MESSAGING" : "MESSAGES"}</span>
          <h1>{actualCreatorMode ? "Community Messages" : "My Messages"}</h1>
          <p>{actualCreatorMode ? "Message keepers directly, request evidence or morph verification, and keep every submission conversation together." : "Message Tiny Titans and follow replies to your submissions from one dedicated inbox."}</p>
        </div>
        {!actualCreatorMode && <button type="button" className="messages-page__new" onClick={startDirect}>✉️ Message Tiny Titans</button>}
      </header>

      {error && <div className="messages-page__error" role="alert">{error}</div>}
      {(loading || initialising) && <div className="messages-page__loading">Opening your secure message centre…</div>}

      {!loading && <div className="messages-page__stats"><span>💬 {threads.length} conversation{threads.length === 1 ? "" : "s"}</span><span>🔔 {unread} unread</span><span>🔒 Private conversations</span></div>}

      {!loading && <div className="messages-page__layout">
        <aside className="messages-page__threads" aria-label="Conversation list">
          <div className="messages-page__section-title">Conversations</div>
          {threads.length === 0 ? <div className="messages-page__empty">No conversations yet.</div> : threads.map((thread) => {
            const myUnread = actualCreatorMode ? Number(thread.unreadForCreator ?? 0) : Number(thread.unreadForSubmitter ?? 0);
            const name = subjectLabel(thread, actualCreatorMode, names);
            return <button key={thread.id} type="button" className={`messages-page__thread ${selected?.id === thread.id ? "is-selected" : ""}`} onClick={() => setSelected(thread)}>
              <span className="messages-page__thread-icon">{icons[thread.submissionType]}</span>
              <span className="messages-page__thread-copy"><strong>{name}</strong><small>{labels[thread.submissionType]}{thread.submissionStatus ? ` · ${thread.submissionStatus}` : ""}</small><span>{thread.lastMessagePreview || "No messages yet — open this conversation to write."}</span></span>
              {myUnread > 0 && <b className="messages-page__unread">{myUnread}</b>}
            </button>;
          })}
        </aside>

        <section className="messages-page__conversation" aria-label="Conversation">
          {!selected ? <div className="messages-page__placeholder"><span>💬</span><h2>Select a conversation</h2><p>Your message composer will stay here permanently once you choose a thread.</p></div> : <>
            <div className="messages-page__conversation-header">
              <div><span>{icons[selected.submissionType]} {labels[selected.submissionType]}</span><h2>{recipientName}</h2><p>{actualCreatorMode ? `Messaging ${recipientName}` : "Private conversation with Tiny Titans"}</p>{selected.submissionType !== "direct" && <strong className="messages-page__context">Submission: {selected.submissionTitle}</strong>}</div>
              <Link to={actualCreatorMode ? "/creator/messages" : "/messages"}>All messages</Link>
            </div>

            <div className="messages-page__message-list">
              {messages.length === 0 ? <div className="messages-page__no-messages"><strong>Ready to message {recipientName}.</strong><span>This is the live conversation. Type your message below and send it.</span></div> : messages.map((item) => <article key={item.id} className={`messages-page__message ${item.senderRole === (actualCreatorMode ? "creator" : "user") ? "is-mine" : ""}`}><strong>{item.senderRole === "creator" ? "🐍 Tiny Titans" : `👤 ${actualCreatorMode ? recipientName : "You"}`}</strong><p>{item.message}</p><small>{dateLabel(item.createdAt)}</small></article>)}
            </div>

            <div className="messages-page__composer">
              <label htmlFor="tiny-titans-message-composer"><strong>{actualCreatorMode ? `Message ${recipientName}` : "Message Tiny Titans"}</strong><span>Private · replies stay in this conversation</span></label>
              <textarea ref={replyRef} id="tiny-titans-message-composer" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void send(); } }} rows={6} maxLength={5000} placeholder={actualCreatorMode ? `Write a message to ${recipientName}…` : "Write your message to Tiny Titans…"} disabled={sending} autoComplete="off" spellCheck="true" />
              <div className="messages-page__composer-footer"><small>Ctrl/Cmd + Enter to send</small><button type="button" className="messages-page__send" onClick={() => void send()} disabled={sending || !draft.trim()}>{sending ? "Sending…" : "💬 Send message"}</button></div>
            </div>
          </>}
        </section>
      </div>}
    </main>
  );
}
