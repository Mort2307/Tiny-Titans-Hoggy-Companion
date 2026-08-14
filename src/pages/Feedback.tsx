import { FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitFeedback } from "../services/feedbackService";
import type { FeedbackCategory, FeedbackSeverity } from "../types/Feedback";
import "../styles/Feedback.css";

const categories: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "🐛 Bug / Something isn't working" },
  { value: "suggestion", label: "💡 Suggestion" },
  { value: "confusing", label: "❓ Confusing / Need clarification" },
  { value: "general", label: "❤️ General feedback" },
  { value: "other", label: "⚠️ Something else" },
];

const severities: { value: FeedbackSeverity; label: string }[] = [
  { value: "minor", label: "Minor" },
  { value: "annoying", label: "Annoying" },
  { value: "blocked", label: "Stops me doing something" },
  { value: "broken", label: "App/function completely broken" },
];

export default function Feedback() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [severity, setSeverity] = useState<FeedbackSeverity>("annoying");
  const [whatWereYouDoing, setWhatWereYouDoing] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!user) { setError("Please sign in before sending feedback."); return; }
    if (!whatWereYouDoing.trim() || !actual.trim()) { setError("Please tell us what you were doing and what happened."); return; }

    setBusy(true);
    try {
      const result = await submitFeedback({ userId: user.uid, category, severity, whatWereYouDoing, expected, actual, file });
      setToken(result.issueToken);
      setWhatWereYouDoing(""); setExpected(""); setActual(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to send feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-container feedback-page">
      <div className="feedback-shell">
        <Link className="feedback-back" to="/">← Back to Tiny Titans</Link>
        <header className="feedback-header">
          <span className="feedback-icon" aria-hidden="true">🐛</span>
          <div><p className="feedback-eyebrow">Help make Tiny Titans better</p><h1>Feedback & bug report</h1><p>Tell us what happened. Screenshots and short videos can be attached to make tricky problems much easier to reproduce.</p></div>
        </header>

        {token && <section className="feedback-success" role="status"><strong>Thanks — feedback received. 🐍</strong><p>Your issue token is <code>{token}</code>. Keep it if you want to refer to this report later.</p><button type="button" onClick={() => setToken("")}>Send another report</button></section>}

        {!token && <form onSubmit={onSubmit} className="feedback-form">
          <label><span>What kind of feedback is this?</span><select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span>How serious is it?</span><select value={severity} onChange={(event) => setSeverity(event.target.value as FeedbackSeverity)}>{severities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span>What were you doing?</span><textarea value={whatWereYouDoing} onChange={(event) => setWhatWereYouDoing(event.target.value)} placeholder="For example: I opened Marmalade's weight tracker on my phone…" rows={3} /></label>
          <label><span>What did you expect to happen?</span><textarea value={expected} onChange={(event) => setExpected(event.target.value)} placeholder="Tell us what you expected Tiny Titans to do…" rows={3} /></label>
          <label><span>What happened instead?</span><textarea value={actual} onChange={(event) => setActual(event.target.value)} placeholder="Tell us what actually happened…" rows={4} required /></label>

          <div className="feedback-attachment"><div><strong>📷 Add photo or video</strong><p>Images are resized/compressed before upload. Videos are limited to 25 MB. Evidence is temporary and is intended to be deleted when the report is cleared.</p></div><input ref={fileRef} type="file" accept="image/*,video/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>

          {file && <p className="feedback-file">Attached: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)</p>}
          {error && <p className="feedback-error" role="alert">{error}</p>}
          <button className="feedback-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send Feedback"}</button>
          <p className="feedback-privacy">Your report gets a privacy-safe issue fingerprint so repeated problems can be grouped. The fingerprint does not include your image or video.</p>
        </form>}
      </div>
    </main>
  );
}
