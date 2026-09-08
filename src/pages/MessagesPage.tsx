import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getCreatorUserDirectory, getCreatorUserDisplayNames, type CreatorUserDirectoryEntry } from "../services/creatorUserDirectoryService";
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

function contactLabel(contact: CreatorUserDirectoryEntry, currentUid: string) {
  return contact.displayName || (contact.uid === currentUid ? "You" : "Anonymous user");
}

export default function MessagesPage({ creatorMode = false }: { creatorMode?: boolean }) {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<SubmissionConversation[]>([]);
  const [selected, setSelected] = useState<SubmissionConversation | null>(null);
  const [messages, setMessages] = useState<SubmissionConversationMessage[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<CreatorUserDirectoryEntry[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [initialising, setInitialising] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const actualCreatorMode = creatorMode && profile?.role === "admin";
  const recipientUid = searchParams.get("recipientUid");
  const submissionId = searchParams.get("submissionId");
  const submissionType = searchParams.get("submissionType") as Exclude<SubmissionConversationType, "direct"> | null;
  const submissionTitle = searchParams.get("submissionTitle") || "Submission conversation";

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      if (actualCreatorMode) {
        const [items, directory] = await Promise.all([getCreatorSubmissionConversations(500), getCreatorUserDirectory()]);
        setThreads(items);
        setContacts(directory);
        const ids = [...new Set([...items.map((item) => item.submitterUid), ...directory.map((item) => item.uid)].filter(Boolean))];
        const resolvedNames = await getCreatorUserDisplayNames(ids);
        setNames(resolvedNames);
      } else {
        const direct = await ensureDirectConversation(user.uid, user.displayName?.trim() || "Keeper");
        const items = await getUserSubmissionConversations(user.uid);
        setThreads(items.some((item) => item.id === direct.id) ? items : [direct, ...items]);
        setNames({ [user.uid]: user.displayName?.trim() || "You" });
        setContacts([]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user, actualCreatorMode]);

  useEffect(() => {
    if (!user) return;
    void loadThreads();
  }, [user, loadThreads]);

  useEffect(() => {
    const target = searchParams.get("thread");
    if (!target || !threads.length) return;
    const found = threads.find((thread) => thread.id === target);
    if (found) setSelected(found);
  }, [searchParams, threads]);

  useEffect(() => {
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
  }, [user, actualCreatorMode, recipientUid, submissionId, submissionType, submissionTitle, loadThreads]);

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
  const visibleContacts = useMemo(() => {
    if (!actualCreatorMode) return [];
    const needle = contactSearch.trim().toLocaleLowerCase();
    return contacts.filter((contact) => {
      if (!needle) return true;
      return `${contact.displayName} ${contact.email}`.toLocaleLowerCase().includes(needle);
    });
  }, [contacts, contactSearch, actualCreatorMode]);

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

  async function openDirectContact(contact: CreatorUserDirectoryEntry) {
    if (!actualCreatorMode || !user || initialising) return;
    setInitialising(true);
    setError("");
    try {
      const conversation = await ensureDirectConversation(contact.uid, contact.displayName);
      setSelected(conversation);
      setDraft("");
      await loadThreads();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The direct conversation could not be opened.");
    } finally {
      setInitialising(false);
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
          <p>{actualCreatorMode ? "Message any registered keeper directly, request evidence or morph verification, and keep every submission conversation together." : "Message Tiny Titans and follow replies to your submissions from one dedicated inbox."}</p>
        </div>
        {!actualCreatorMode && <button type="button" className="messages-page__new" onClick={startDirect}>✉️ Message Tiny Titans</button>}
      </header>

      {error && <div className="messages-page__error" role="alert">{error}</div>}
      {(loading || initialising) && <div className="messages-page__loading">Opening your secure message centre…</div>}

      {!loading && <div className="messages-page__stats"><span>💬 {threads.length} conversation{threads.length === 1 ? "" : "s"}</span><span>🔔 {unread} unread</span>{actualCreatorMode && <span>👥 {contacts.length} registered user{contacts.length === 1 ? "" : "s"}</span>}<span>🔒 Private conversations</span></div>}

      {!loading && <div className="messages-page__layout">
        <aside className="messages-page__threads" aria-label={actualCreatorMode ? "Contacts and conversations" : "Conversation list"}>
          {actualCreatorMode && <section className="messages-page__contacts">
            <div className="messages-page__section-title">All registered users</div>
            <label className="messages-page__contact-search"><span className="messages-page__sr-only">Search users</span><input value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Search users or email…" type="search" autoComplete="off" /></label>
            <div className="messages-page__contact-list">
              {visibleContacts.length === 0 ? <div className="messages-page__empty">No users match that search.</div> : visibleContacts.map((contact) => {
                const directThread = threads.find((thread) => thread.submissionType === "direct" && thread.submitterUid === contact.uid);
                const isSelectedContact = selected?.submissionType === "direct" && selected.submitterUid === contact.uid;
                return <button key={contact.uid} type="button" className={`messages-page__contact ${isSelectedContact ? "is-selected" : ""}`} onClick={() => void openDirectContact(contact)} disabled={initialising}>
                  <span className="messages-page__contact-avatar">{contact.uid === user.uid ? "🧑‍💻" : "👤"}</span>
                  <span className="messages-page__contact-copy"><strong>{contactLabel(contact, user.uid)}{contact.uid === user.uid ? " · You" : ""}</strong>{contact.email && <small>{contact.email}</small>}<span>{directThread?.lastMessagePreview || "No direct messages yet — start the conversation."}</span></span>
                  {directThread && Number(directThread.unreadForCreator ?? 0) > 0 && <b className="messages-page__unread">{Number(directThread.unreadForCreator ?? 0)}</b>}
                </button>;
              })}
            </div>
          </section>}

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
          {!selected ? <div className="messages-page__placeholder"><span>💬</span><h2>Select a conversation</h2><p>{actualCreatorMode ? "Choose any registered user to start or continue a direct message. The composer remains ready for replies." : "Your message composer will stay here permanently once you choose a thread."}</p></div> : <>
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
