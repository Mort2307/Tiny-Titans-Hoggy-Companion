import type { MorphDefinition } from "../data/morphs";

export type GeneticsResult = {
  name: string;
  percentage: number;
  visualMorphs: string[];
  hets: string[];
  possibleHets?: string[];
};

type ResultCardProps = {
  result: GeneticsResult;
  morphs: MorphDefinition[];
};

function getMorphName(
  geneId: string,
  morphs: MorphDefinition[]
): string {
  return (
    morphs.find(
      (morph) =>
        morph.geneId === geneId
    )?.name ?? geneId
  );
}

export default function ResultCard({
  result,
  morphs,
}: ResultCardProps) {
  return (
    <article className="genetics-result-card">
      <div className="genetics-result-header">
        <h3>{result.name}</h3>

        <strong>
          {result.percentage}%
        </strong>
      </div>

      {result.visualMorphs.length > 0 && (
        <div className="genetics-result-section">
          <h4>Visual</h4>

          <div className="genetics-result-tags">
            {result.visualMorphs.map(
              (geneId) => (
                <span
                  key={geneId}
                  className="genetics-tag genetics-tag-visual"
                >
                  {getMorphName(
                    geneId,
                    morphs
                  )}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {result.hets.length > 0 && (
        <div className="genetics-result-section">
          <h4>Known Hets</h4>

          <div className="genetics-result-tags">
            {result.hets.map(
              (geneId) => (
                <span
                  key={geneId}
                  className="genetics-tag genetics-tag-het"
                >
                  Het {getMorphName(
                    geneId,
                    morphs
                  )}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {result.possibleHets &&
        result.possibleHets.length > 0 && (
          <div className="genetics-result-section">
            <h4>Possible Hets</h4>

            <div className="genetics-result-tags">
              {result.possibleHets.map(
                (geneId) => (
                  <span
                    key={geneId}
                    className="genetics-tag genetics-tag-possible"
                  >
                    50% Het{" "}
                    {getMorphName(
                      geneId,
                      morphs
                    )}
                  </span>
                )
              )}
            </div>
          </div>
        )}
    </article>
  );
}