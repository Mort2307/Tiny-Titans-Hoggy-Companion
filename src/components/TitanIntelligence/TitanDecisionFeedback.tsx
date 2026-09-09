import { useState } from "react";
import { submitIntelligenceFeedback, type IntelligenceFeedbackKind } from "../../services/intelligenceFeedbackService";
import "./TitanDecisionFeedback.css";

export default function TitanDecisionFeedback({ insightId, animalId, domain, destination, engineVersion = "v50" }: { insightId: string; animalId?: string; domain?: string; destination?: string; engineVersion?: string }) {
  const [submitted, setSubmitted] = useState<IntelligenceFeedbackKind | null>(null);
  const [busy, setBusy] = useState(false);
  async function send(feedback: IntelligenceFeedbackKind) { if (busy || submitted) return; setBusy(true); try { await submitIntelligenceFeedback({ insightId, feedback, animalId, domain, destination, engineVersion }); setSubmitted(feedback); } catch { /* Feedback never blocks the intelligence surface. */ } finally { setBusy(false); } }
  if (submitted) return <div className="titan-decision-feedback titan-decision-feedback--done" role="status">✓ Feedback recorded as an intelligence learning signal.</div>;
  return <div className="titan-decision-feedback" aria-label="Tell Tiny Titans whether this intelligence was useful"><span>Was this useful?</span><button type="button" disabled={busy} onClick={() => void send("helpful")}>👍 Helpful</button><button type="button" disabled={busy} onClick={() => void send("not-helpful")}>👎 Not helpful</button><button type="button" disabled={busy} onClick={() => void send("wrong")}>⚠️ Wrong</button><button type="button" disabled={busy} onClick={() => void send("acted-on")}>✅ I acted on it</button></div>;
}
