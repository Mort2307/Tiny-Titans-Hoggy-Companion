import { useState } from "react";
import type { TitanAskResponse } from "../../intelligence/askTitan/titanChatContracts";
import { recordTitanFeedback } from "../../intelligence/askTitan/titanFeedbackService";
import TitanAnswerProvenance from "./TitanAnswerProvenance";

function provenanceSummary(response: TitanAskResponse) {
  const items: string[] = [];
  if (response.provenance.userDataUsed) items.push("your data");
  if (response.provenance.calculatedDataUsed) items.push("Tiny Titans analysis");
  if (response.provenance.externalSourcesUsed) items.push("external sources");
  return items.length ? items.join(" + ") : "available Tiny Titans context";
}

export default function TitanChatMessage({ role, content, response }: { role: "user" | "model"; content: string; response?: TitanAskResponse }) {
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | "failed" | null>(null);

  async function submitFeedback(rating: "helpful" | "not_helpful") {
    if (!response?.responseId || feedback) return;
    try {
      await recordTitanFeedback(response.responseId, rating, response.access.workspaceKind);
      setFeedback(rating);
    } catch {
      setFeedback("failed");
    }
  }

  return (
    <article className={`titan-chat-message titan-chat-message--${role}`}>
      <div className="titan-chat-message-label">{role === "user" ? "You" : "🧠 Titan Intelligence"}</div>
      {role === "model" && response && <div className="titan-answer-origin">Based on: <strong>{provenanceSummary(response)}</strong></div>}
      <div className="titan-chat-message-body">{content}</div>
      {role === "model" && response && <>
        <div className="titan-answer-feedback" aria-label="Rate this Titan answer">
          <span>{feedback === "helpful" ? "Thanks — marked helpful." : feedback === "not_helpful" ? "Thanks — marked for review." : feedback === "failed" ? "Feedback could not be saved." : "Was this useful?"}</span>
          {!feedback && <>
            <button type="button" onClick={() => void submitFeedback("helpful")}>👍</button>
            <button type="button" onClick={() => void submitFeedback("not_helpful")}>👎</button>
          </>}
        </div>
        <TitanAnswerProvenance provenance={response.provenance} sources={response.sources} />
      </>}
    </article>
  );
}