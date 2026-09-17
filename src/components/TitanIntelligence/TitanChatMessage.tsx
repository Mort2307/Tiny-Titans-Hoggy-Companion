import type { TitanAskResponse } from "../../intelligence/askTitan/titanChatContracts";
import TitanAnswerProvenance from "./TitanAnswerProvenance";

export default function TitanChatMessage({ role, content, response }: { role: "user" | "model"; content: string; response?: TitanAskResponse }) {
  return (
    <article className={`titan-chat-message titan-chat-message--${role}`}>
      <div className="titan-chat-message-label">{role === "user" ? "You" : "🧠 Titan Intelligence"}</div>
      <div className="titan-chat-message-body">{content}</div>
      {role === "model" && response && <TitanAnswerProvenance provenance={response.provenance} sources={response.sources} />}
    </article>
  );
}