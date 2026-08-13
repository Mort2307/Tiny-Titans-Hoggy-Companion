import type { MorphDefinition } from "../data/morphs";
import { findRecognisedCombination } from "../data/morphs";
import type { OffspringResult } from "../types/genetics";

type ResultCardProps = {
  result: OffspringResult;
  morphs: MorphDefinition[];
};

function getMorphName(geneId: string, morphs: MorphDefinition[]): string {
  return morphs.find((morph) => morph.geneId === geneId)?.name ?? geneId;
}

function getSuperMorphId(geneId: string, morphs: MorphDefinition[]): string | undefined {
  return morphs.find(
    (morph) => morph.kind === "Super" && morph.superFormId === geneId
  )?.geneId;
}

function getRecognisedName(result: OffspringResult, morphs: MorphDefinition[]): string | undefined {
  if (result.visualComponents.length === 0) {
    return undefined;
  }

  const visualValues = result.visualComponents.flatMap((component) => {
    if (component.state === "Super") {
      return [getSuperMorphId(component.geneId, morphs) ?? component.geneId];
    }

    return [component.geneId];
  });

  return findRecognisedCombination(visualValues)?.name;
}

export default function ResultCard({ result, morphs }: ResultCardProps) {
  const recognisedName =
    getRecognisedName(result, morphs) ??
    (result.recognisedCombination && result.combination?.name);

  return (
    <article className="genetics-result-card">
      <div className="genetics-result-header">
        <div>
          <span className="genetics-result-label">POSSIBLE OUTCOME</span>
          <h3>{recognisedName ?? result.name}</h3>
          {recognisedName && recognisedName !== result.name && (
            <span className="genetics-result-recognised-label">
              Recognised combination
            </span>
          )}
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

      {recognisedName && (
        <div className="genetics-combination-note">
          ✓ Recognised combination: {recognisedName}
        </div>
      )}
    </article>
  );
}
