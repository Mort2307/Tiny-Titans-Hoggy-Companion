import type { MorphDefinition } from "../data/morphs";
import type { OffspringResult } from "../types/genetics";

 type ResultCardProps = {
  result: OffspringResult;
  morphs: MorphDefinition[];
};

function getMorphName(geneId: string, morphs: MorphDefinition[]): string {
  return morphs.find((morph) => morph.geneId === geneId)?.name ?? geneId;
}

export default function ResultCard({ result, morphs }: ResultCardProps) {
  return (
    <article className="genetics-result-card">
      <div className="genetics-result-header">
        <div>
          <span className="genetics-result-label">POSSIBLE OUTCOME</span>
          <h3>{result.name}</h3>
        </div>
        <strong>{Number(result.percentage.toFixed(4))}%</strong>
      </div>

      {result.visualComponents.length > 0 && (
        <div className="genetics-result-section">
          <h4>Visual</h4>
          <div className="genetics-result-tags">
            {result.visualComponents.map((component) => (
              <span key={`${component.geneId}-${component.copies}`} className="genetics-tag genetics-tag-visual">
                {component.state === "Super" ? "Super " : ""}{getMorphName(component.geneId, morphs)}
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
                Het {getMorphName(component.geneId, morphs)}
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
                Possible Het {getMorphName(component.geneId, morphs)}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.recognisedCombination && result.combination && (
        <div className="genetics-combination-note">
          ✓ Recognised combination: {result.combination.name}
        </div>
      )}
    </article>
  );
}
