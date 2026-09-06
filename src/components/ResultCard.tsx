import { Link } from "react-router-dom";
import type { MorphDefinition } from "../data/morphs";
import type { OffspringResult } from "../types/genetics";
import { getCanonicalOffspringPresentation } from "../utils/geneticsPresentation";

type ResultCardProps = { result: OffspringResult; morphs: MorphDefinition[] };

function formatPercentage(value: number): string {
  const rounded = Number(value.toFixed(4));
  return `${rounded}%`;
}

export default function ResultCard({ result, morphs }: ResultCardProps) {
  const presentation = getCanonicalOffspringPresentation(result, morphs);
  const reversalUrl = `/calculator?mode=reversal&morph=${encodeURIComponent(presentation.name)}`;
  const bounded = result.certainty === "bounded" || result.percentage === undefined;
  const probabilityLabel = bounded
    ? result.probabilityRange
      ? `${formatPercentage(result.probabilityRange.min)}–${formatPercentage(result.probabilityRange.max)}`
      : "Conditional"
    : formatPercentage(result.percentage);

  return (
    <article className={`genetics-result-card ${bounded ? "genetics-result-card-bounded" : ""}`}>
      <div className="genetics-result-header">
        <div>
          <span className="genetics-result-label">POSSIBLE OUTCOME</span>
          <h3>{presentation.name}</h3>
          <span className="genetics-result-recognised-label">
            {presentation.recognisedCombination ? "Database-recognised combination" : "Canonical genetic phenotype"}
          </span>
        </div>
        <strong aria-label={bounded ? `Conditional probability ${probabilityLabel}` : `Probability ${probabilityLabel}`}>
          {probabilityLabel}
        </strong>
      </div>

      {bounded && (
        <div className="genetics-result-uncertainty" role="note">
          <strong>Conditional result</strong>
          <span>The parent’s genotype is not fully established, so this outcome is shown as a conditional range rather than an invented single percentage.</span>
        </div>
      )}

      {presentation.signature.length > 0 && (
        <div className="genetics-result-section genetics-result-basis">
          <h4>Genetic basis</h4>
          <div className="genetics-result-tags">
            {presentation.signature.map((entry) => (
              <span key={`${entry.geneId}-${entry.copies}`} className="genetics-tag genetics-tag-basis">{entry.name} ×{entry.copies}</span>
            ))}
          </div>
        </div>
      )}

      {result.visualComponents.length > 0 && (
        <div className="genetics-result-section"><h4>Visual</h4><div className="genetics-result-tags">{result.visualComponents.map((component) => <span key={`${component.geneId}-${component.copies}`} className="genetics-tag genetics-tag-visual">{component.state === "Super" ? "Super " : ""}{component.name}</span>)}</div></div>
      )}

      {result.hetComponents.length > 0 && (
        <div className="genetics-result-section"><h4>Confirmed carrier genetics</h4><div className="genetics-result-tags">{result.hetComponents.map((component) => <span key={component.geneId} className="genetics-tag genetics-tag-het">Het {component.name}</span>)}</div></div>
      )}

      {result.possibleHetComponents.length > 0 && (
        <div className="genetics-result-section"><h4>Possible carrier genetics</h4><div className="genetics-result-tags">{result.possibleHetComponents.map((component) => <span key={component.geneId} className="genetics-tag genetics-tag-possible">Possible Het {component.name}</span>)}</div></div>
      )}

      {result.genotypeScenarioLabels?.length ? (
        <div className="genetics-result-section"><h4>Genotype scenarios</h4><div className="genetics-scenario-list">{result.genotypeScenarioLabels.map((label) => <span key={label}>{label}</span>)}</div></div>
      ) : null}

      {(presentation.recognisedCombination || presentation.alternateRecognisedCombinations.length > 0) && (
        <div className="genetics-combination-actions"><Link to={reversalUrl} className="calculator-back-button">↩ Reverse this morph</Link>{presentation.alternateRecognisedCombinations.length > 0 && <span className="genetics-combination-note"><strong>Also recognised as:</strong> {presentation.alternateRecognisedCombinations.map((morph) => morph.name).join(" · ")}</span>}</div>
      )}
    </article>
  );
}
