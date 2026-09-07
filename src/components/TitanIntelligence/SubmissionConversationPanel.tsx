import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ensureSubmissionConversation, sendSubmissionConversationMessage, markSubmissionConversationRead, watchSubmissionConversationMessages, type SubmissionConversation, type SubmissionConversationMessage, type SubmissionConversationType } from "../../services/submissionConversationService";
import "../../styles/ConversationInbox.css";
import "../../styles/contributor-thank-you.css";

const suggestedQuestions: Record<SubmissionConversationType, string[]> = {
  direct: ["How can Tiny Titans help with your reptile keeping question?", "Would you like help with a submission, genetics question, husbandry topic or app issue?"],
  "morph-image": ["Can you confirm the animal's known parents or genetic background?", "What makes you confident this phenotype matches the submitted morph?"],
  "morph-terminology": ["Where did this morph name originate, and is there a breeder or published source we can check?", "Is this term intended as a synonym, combo name, locality term, or a separate morph?"],
  species: ["Which sources are strongest for the husbandry values in this submission?", "Are any of these husbandry details locality-, season-, or life-stage-specific?"],
  "vivarium-showcase": ["What changed after you adjusted this setup, and what did you observe afterwards?", "Which parts of this setup are species-specific rather than personal preference?"],
  observation: ["What happened immediately before and after the behaviour you observed?", "Was the animal's feeding, temperature, humidity, or handling context different from normal?"],
  "mentor-application": ["Can you provide the strongest evidence supporting the experience or verification requested?", "Which areas are you most confident mentoring, and which would you refer onward?"],
};

const DEFAULT_THANK_YOU = "🐍 Thank you for helping build Tiny Titans!\n\nWe genuinely appreciate you taking the time to share your knowledge, evidence or experience with us. Contributions like yours help us build a better reptile resource for keepers everywhere.\n\nThank you for being part of the community. ❤️\n\n— Tiny Titans";
const DEFAULT_MORPH_VERIFICATION = "Hi! We are reviewing your morph submission and would like to verify the animal before we make any canonical genetics decision.\n\nCould you please confirm the animal's known parents, genetics and/or the breeder/lineage information you have available? Any supporting photographs, records or source details would also be helpful.\n\nThanks for helping us keep the Tiny Titans Morph Library accurate.\n\n— Tiny Titans";
const DEFAULT_TERMINOLOGY_VERIFICATION = "Hi! We are reviewing your terminology submission and would like to verify the terminology before we map it into the Tiny Titans Morph Library.\n\nCould you please tell us where this name came from, who uses it, and whether it is intended as a recognised morph, combination name, regional alias, locality term or breeder-specific term? Any supporting source or lineage information would be very helpful.\n\nThanks for helping us keep the Tiny Titans Morph Library accurate.\n\n— Tiny Titans";
const THANK_YOU_PREFIX = "🐍 Thank you for helping build Tiny Titans!";

type SubmissionConversationPanelProps = {
  submissionType: Exclude<SubmissionConversationType, "direct">;
  submissionId: string;
  submitterUid?: string;
  submitterName?: string;
  submissionTitle: string;
  submissionStatus?: string;
};

export default function SubmissionConversationPanel({ submissionType, submissionId, submitterUid, submitterName, submissionTitle, submissionStatus }: SubmissionConversationPanelProps) {
  const { user, profile } = useAuth();
  const [conversation, setConversation] = useState<SubmissionConversation | null>(null);
  const [messages, setMessages] = useState<SubmissionConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const creatorMode = profile?.role === "admin";
  const mailboxPath = creatorMode ? "/creator/submission-conversations" : "/conversations/submissions";
  const prompts = useMemo(() => suggestedQuestions[submissionType], [submissionType]);
  const recipientName = creatorMode ? (submitterName?.trim() || "the keeper") : "Tiny Titans";
  const composerId = `submission-reply-${submissionType}-${submissionId}`;

  useEffect(() => {
    if (!user || !submissionId) {
      setLoading(false);
      return;
    }
    if (!submitterUid) {
      setLoading(false);
      setConversation(null);
      setError("This submission does not have a valid submitter account, so messaging is unavailable.");
      return;
    }
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
    const unsubscribe = watchSubmissionConversationMessages(conversation.id, (next) => setMessages(next), (reason) => setError(reason.message));
    const focusComposer = window.setTimeout(() => {
      replyRef.current?.focus({ preventScroll: true });
      replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 80);
    return () => { window.clearTimeout(focusComposer); unsubscribe(); };
  }, [conversation, creatorMode]);

  async function send(message = draft) {
    const cleanMessage = message.trim();
    if (!conversation || !user || !cleanMessage || sending) return;
    setSending(true);
    setError("");
    try {
      await sendSubmissionConversationMessage({ conversationId: conversation.id, senderId: user.uid, senderRole: creatorMode ? "creator" : "user", message: cleanMessage, kind: creatorMode && cleanMessage.startsWith(THANK_YOU_PREFIX) ? "contributor-thank-you" : undefined });
      setDraft("");
      await markSubmissionConversationRead(conversation.id, creatorMode ? "creator" : "user");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  function focusComposer(message?: string) {
    if (message) setDraft(message);
    setError("");
    window.requestAnimationFrame(() => {
      replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      replyRef.current?.focus({ preventScroll: true });
    });
  }

  function useDefaultThankYou() {
    focusComposer(DEFAULT_THANK_YOU);
  }

  function requestVerification() {
    focusComposer(submissionType === "morph-terminology" ? DEFAULT_TERMINOLOGY_VERIFICATION : DEFAULT_MORPH_VERIFICATION);
  }

  const hasThankYou = Boolean(conversation?.contributorThankedAt) || messages.some((item) => item.senderRole === "creator" && item.message.startsWith(THANK_YOU_PREFIX));

  return <section id={`submission-conversation-${submissionType}-${submissionId}`} className={`conversation-reply submission-conversation-panel ${hasThankYou ? "submission-conversation-thanked" : ""}`}>
    <div className="conversation-detail-top">
      <div>
        <strong>💬 {creatorMode ? `Message ${recipientName}` : "Message Tiny Titans"}</strong>
        <p>{creatorMode ? `Private conversation with ${recipientName} about this submission. You can ask for evidence, verify the morph, clarify terminology or send a thank-you.` : "Private conversation with the Tiny Titans review team. Reply here for questions, evidence or submission follow-up."}</p>
      </div>
      {conversation && <Link className="secondary-button" to={`${mailboxPath}?thread=${encodeURIComponent(conversation.id)}`}>🗨 Open Messenger →</Link>}
    </div>
    {hasThankYou && creatorMode && <div className="contributor-thanked-badge" role="status">✓ THANKED · Contributor has received the Tiny Titans thank-you</div>}
    {loading && <p className="creator-muted">Opening conversation with {recipientName}…</p>}
    {!loading && error && <div className="creator-error" role="alert">{error}</div>}
    {!loading && conversation && <>
      {creatorMode && <div className="submission-smart-prompts">
        <small>💬 Message {recipientName}</small>
        <div className="submission-message-actions">
          {submissionType === "morph-image" || submissionType === "morph-terminology" ? <button type="button" onClick={requestVerification} disabled={sending}>🧬 Request morph verification</button> : null}
          <button type="button" onClick={useDefaultThankYou} disabled={sending || hasThankYou}>💌 Load thank-you template</button>
          {hasThankYou && <span className="creator-muted">Already thanked in this thread.</span>}
        </div>
      </div>}
      {creatorMode && messages.length === 0 && <div className="submission-smart-prompts">
        <small>🧠 Suggested questions</small>
        <div>{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => focusComposer(prompt)} disabled={sending}>{prompt}</button>)}</div>
      </div>}
      <div className="conversation-messages submission-conversation-messages">
        {messages.length === 0 ? <p className="creator-muted">No messages yet. Start the conversation with {recipientName} when you need clarification or want to thank the contributor.</p> : messages.slice(-8).map((item) => <article key={item.id} className={item.senderRole === (creatorMode ? "creator" : "user") ? "creator-success" : "creator-tools-card"}><strong>{item.senderRole === "creator" ? "🐍 Tiny Titans" : `👤 ${recipientName}`}</strong><p>{item.message}</p></article>)}
      </div>
      <label htmlFor={composerId}><strong>{creatorMode ? `Write a message to ${recipientName}` : "Write a message to Tiny Titans"}</strong></label>
      <textarea ref={replyRef} id={composerId} value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} maxLength={5000} placeholder={creatorMode ? `Write your message to ${recipientName}…` : "Reply to the Tiny Titans review team…"} disabled={sending} autoComplete="off" spellCheck="true" />
      <div className="creator-actions">
        <button type="button" className="creator-primary" onClick={() => void send()} disabled={sending || !draft.trim()}>{sending ? "Sending…" : `💬 Send to ${recipientName}`}</button>
        {creatorMode && <button type="button" className="secondary-button" onClick={useDefaultThankYou} disabled={sending || hasThankYou}>Use thank-you template</button>}
      </div>
    </>}
  </section>;
}
