import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ensureSubmissionConversation, sendSubmissionConversationMessage, markSubmissionConversationRead, watchSubmissionConversationMessages, type SubmissionConversation, type SubmissionConversationMessage, type SubmissionConversationType } from "../../services/submissionConversationService";
import "../../styles/ConversationInbox.css";

const suggestedQuestions: Record<SubmissionConversationType, string[]> = {
  "morph-image": ["Can you confirm the animal's known parents or genetic background?", "What makes you confident this phenotype matches the submitted morph?"],
  "morph-terminology": ["Where did this morph name originate, and is there a breeder or published source we can check?", "Is this term intended as a synonym, combo name, locality term, or a separate morph?"],
  species: ["Which sources are strongest for the husbandry values in this submission?", "Are any of these husbandry details locality-, season-, or life-stage-specific?"],
  "vivarium-showcase": ["What changed after you adjusted this setup, and what did you observe afterwards?", "Which parts of this setup are species-specific rather than personal preference?"],
  observation: ["What happened immediately before and after the behaviour you observed?", "Was the animal's feeding, temperature, humidity, or handling context different from normal?"],
  "mentor-application": ["Can you provide the strongest evidence supporting the experience or verification requested?", "Which areas are you most confident mentoring, and which would you refer onward?"],
};

export default function SubmissionConversationPanel({ submissionType, submissionId, submitterUid, submissionTitle, submissionStatus }: { submissionType: SubmissionConversationType; submissionId: string; submitterUid: string; submissionTitle: string; submissionStatus?: string }) {
  const { user, profile } = useAuth();
  const [conversation, setConversation] = useState<SubmissionConversation | null>(null);
  const [messages, setMessages] = useState<SubmissionConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const creatorMode = profile?.role === "admin";
  const mailboxPath = creatorMode ? "/creator/submission-conversations" : "/conversations/submissions";
  const prompts = useMemo(() => suggestedQuestions[submissionType], [submissionType]);

  useEffect(() => {
    if (!user || !submitterUid || !submissionId) return;
    let active = true;
    setLoading(true);
    setError("");
    void ensureSubmissionConversation({ submissionType, submissionId, submitterUid, submissionTitle, submissionStatus })
      .then((value) => { if (active) setConversation(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Conversation could not be opened."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, submitterUid, submissionId, submissionTitle, submissionStatus, submissionType]);

  useEffect(() => {
    if (!conversation) return;
    void markSubmissionConversationRead(conversation.id, creatorMode ? "creator" : "user").catch(() => undefined);
    return watchSubmissionConversationMessages(conversation.id, (next) => setMessages(next), (reason) => setError(reason.message));
  }, [conversation, creatorMode]);

  async function send(message = draft) {
    if (!conversation || !user || !message.trim() || sending) return;
    setSending(true); setError("");
    try {
      await sendSubmissionConversationMessage({ conversationId: conversation.id, senderId: user.uid, senderRole: creatorMode ? "creator" : "user", message });
      setDraft("");
      await markSubmissionConversationRead(conversation.id, creatorMode ? "creator" : "user");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Message could not be sent.");
    } finally { setSending(false); }
  }

  return <section className="conversation-reply submission-conversation-panel">
    <div className="conversation-detail-top">
      <div><strong>💬 {creatorMode ? `Message ${submissionTitle}'s keeper` : "Message Tiny Titans"}</strong><p>Private conversation attached to this submission. Every message stays linked to its review record.</p></div>
      {conversation && <Link to={`${mailboxPath}?thread=${encodeURIComponent(conversation.id)}`}>Open full mailbox →</Link>}
    </div>
    {loading ? <p className="creator-muted">Opening submission conversation…</p> : error && <div className="creator-error">{error}</div>}
    {!loading && <>
      {creatorMode && messages.length === 0 && <div className="submission-smart-prompts"><small>🧠 Suggested questions</small><div>{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => setDraft(prompt)} disabled={sending}>{prompt}</button>)}</div></div>}
      <div className="conversation-messages submission-conversation-messages">{messages.length === 0 ? <p className="creator-muted">No messages yet. Start the conversation when you need clarification.</p> : messages.slice(-6).map((item) => <article key={item.id} className={item.senderRole === (creatorMode ? "creator" : "user") ? "creator-success" : "creator-tools-card"}><strong>{item.senderRole === "creator" ? "🐍 Tiny Titans" : "👤 Keeper"}</strong><p>{item.message}</p></article>)}</div>
      <label htmlFor={`submission-reply-${submissionType}-${submissionId}`}><strong>{creatorMode ? "Write to the keeper" : "Write to Tiny Titans"}</strong></label>
      <textarea id={`submission-reply-${submissionType}-${submissionId}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={5000} placeholder={creatorMode ? "Ask the keeper for clarification…" : "Reply to the Tiny Titans review team…"} disabled={sending} />
      <button type="button" className="creator-primary" onClick={() => void send()} disabled={sending || !draft.trim()}>{sending ? "Sending…" : "💬 Send message"}</button>
    </>}
  </section>;
}
