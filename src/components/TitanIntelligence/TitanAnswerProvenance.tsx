import type { TitanProvenance, TitanSource } from "../../intelligence/askTitan/titanChatContracts";

const labels: Record<string, string> = {
  USER_DATA: "Your Tiny Titans data",
  CALCULATED_DATA: "Calculated from your records",
  EXTERNAL_SOURCE: "External web sources",
  COMMUNITY_OBSERVATION: "Community observation",
  VERIFIED_CONTRIBUTOR: "Verified contributor material",
  VETERINARY_SOURCE: "Veterinary source",
  AI_INTERPRETATION: "Titan interpretation",
  SYSTEM_RULE: "Tiny Titans system rule",
  UNKNOWN: "Unknown source",
};

export default function TitanAnswerProvenance({ provenance, sources }: { provenance: TitanProvenance; sources: TitanSource[] }) {
  return (
    <details className="titan-provenance">
      <summary>How Titan reached this response</summary>
      <div className="titan-provenance-body">
        <p className="titan-provenance-statement">{provenance.statement}</p>
        <div className="titan-provenance-tags">
          {provenance.categories.map((category) => <span key={category}>{labels[category] || category}</span>)}
        </div>
        {sources.length > 0 && (
          <div className="titan-source-list">
            <strong>Sources used</strong>
            {sources.map((source) => (
              <a key={source.uri} href={source.uri} target="_blank" rel="noreferrer">
                {source.title || source.uri}
              </a>
            ))}
          </div>
        )}
        {sources.length === 0 && <p className="titan-provenance-muted">No external web source was used for this response.</p>}
      </div>
    </details>
  );
}