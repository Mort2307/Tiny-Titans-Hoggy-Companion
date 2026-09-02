import type { MorphDefinition } from "../data/morphs";
import type { OffspringResult } from "../types/genetics";
import { getCanonicalOffspringPresentation } from "../utils/geneticsPresentation";

type ResultCardProps = {
  result: OffspringResult;
  morphs: MorphDefinition[];
};

export default function ResultCard({ result, morphs }: ResultCardProps) {
  const presentation = getCanonicalOffspringPresentation(result, morphs);

  return (
    <article className="genetics-result-card">
      <div className="genetics-result-header">
        <div>
          <span className="genetics-result-label">POSSIBLE OUTCOME</span>
          <h3>{presentation.name}</h3>
          <span className="genetics-result-recognised-label">
            {presentation.recognisedCombination ? "Database-recognised combination" : "Canonical genetic phenotype"}
          </span>
        </div>
        <strong>{Number(result.percentage.toFixed(4))}%</strong>
      </div>

      {presentation.signature.length > 0 && (
        <div className="genetics-result-section genetics-result-basis">
          <h4>Genetic basis</h4>
          <div className="genetics-result-tags">
            {presentation.signature.map((entry) => (
              <span key={`${entry.geneId}-${entry.copies}`} className="genetics-tag genetics-tag-basis">
                {entry.name} ×{entry.copies}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.visualComponents.length > 0 && (
        <div className="genetics-result-section">
          <h4>Visual</h4>
          <div className="genetics-result-tags">
            {result.visualComponents.map((component) => (
              <span key={`${component.geneId}-${component.copies}`} className="genetics-tag genetics-tag-visual">
                {component.state === "Super" ? "Super " : ""}{component.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.hetComponents.length > 0 && (
        <div className="genetics-result-section">
          <h4>Confirmed carrier genetics</h4>
          <div className="genetics-result-tags">
            {result.hetComponents.map((component) => (
              <span key={component.geneId} className="genetics-tag genetics-tag-het">
                Het {component.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.possibleHetComponents.length > 0 && (
        <div className="genetics-result-section">
          <h4>Possible carrier genetics</h4>
          <div className="genetics-result-tags">
            {result.possibleHetComponents.map((component) => (
              <span key={component.geneId} className="genetics-tag genetics-tag-possible">
                Possible Het {component.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {presentation.alternateRecognisedCombinations.length > 0 && (
        <div className="genetics-combination-note">
          <strong>Also recognised as:</strong> {presentation.alternateRecognisedCombinations.map((morph) => morph.name).join(" · ")}
        </div>
      )}
    </article>
  );
}
