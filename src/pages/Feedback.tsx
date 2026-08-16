import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitFeedback } from "../services/creatorService";
import type { FeedbackCategory } from "../types/feedback";
import "../styles/CreatorTools.css";

const categories: FeedbackCategory[] = ["Idea", "Suggestion", "Usability", "Learning", "Genetics", "Community", "Other"];

export default function Feedback() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<FeedbackCategory>("Suggestion");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      await submitFeedback({ userId: user.uid, category, title: title.trim(), message: message.trim(), appVersion: "0.0.0", metadata: { displayName: profile?.displayName ?? user.displayName ?? "", userAgent: navigator.userAgent } });
      setSent(true);
      setTitle("");
      setMessage("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send your feedback.");
    } finally { setSending(false); }
  }

  if (!user) return null;
  return <section className="creator-tools-page"><div className="creator-tools-card">
    <div className="creator-tools-header"><span>💡</span><div><h1>Send Feedback</h1><p>Ideas, suggestions and general thoughts about Tiny Titans live here — separate from bug reports.</p></div></div>
    {sent ? <div className="creator-success"><h2>💚 Thank you for your feedback!</h2><p>Your feedback has been sent to the Tiny Titans Creator team.</p><div className="creator-actions"><button type="button" onClick={() => setSent(false)}>Send more feedback</button><button type="button" onClick={() => navigate("/account")}>Back to My Account</button></div></div> : <form className="creator-form" onSubmit={handleSubmit}>
      <label>Feedback category<select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Short title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. I'd love a breeding season planner" required /></label>
      <label>Your feedback<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={9} maxLength={5000} placeholder="Tell us what you think, what you'd change, or what you'd love to see next." required /></label>
      {error && <div className="creator-error" role="alert">{error}</div>}
      <div className="creator-actions"><button type="button" onClick={() => navigate(-1)} disabled={sending}>Cancel</button><button className="creator-primary" type="submit" disabled={sending || !title.trim() || !message.trim()}>{sending ? "Sending…" : "💡 Send Feedback"}</button></div>
    </form>}
  </div></section>;
}
