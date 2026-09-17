import type { TitanAskResponse } from "../../intelligence/askTitan/titanChatContracts";
import TitanAnswerProvenance from "./TitanAnswerProvenance";

function provenanceSummary(response: TitanAskResponse) {
  const items: string[] = [];
  if (response.provenance.userDataUsed) items.push("your data");
  if (response.provenance.calculatedDataUsed) items.push("Tiny Titans analysis");
  if (response.provenance.externalSourcesUsed) items.push("external sources");
  return items.length ? items.join(" + ") : "available Tiny Titans context";
}

export default function TitanChatMessage({ role, content, response }: { role: "user" | "model"; content: string; response?: TitanAskResponse }) {
  return (
    <article className={`titan-chat-message titan-chat-message--${role}`}>
      <div className="titan-chat-message-label">{role === "user" ? "You" : "🧠 Titan Intelligence"}</div>
      {role === "model" && response && <div className="titan-answer-origin">Based on: <strong>{provenanceSummary(response)}</strong></div>}
      <div className="titan-chat-message-body">{content}</div>
      {role === "model" && response && <TitanAnswerProvenance provenance={response.provenance} sources={response.sources} />}
    </article>
  );
}
