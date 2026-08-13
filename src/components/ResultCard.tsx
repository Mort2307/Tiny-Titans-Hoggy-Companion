import type { MorphDefinition } from "../data/morphs";
import type { OffspringResult } from "../types/genetics";

type ResultCardProps = { result: OffspringResult; morphs: MorphDefinition[] };

function getMorphName(geneId: string, morphs: MorphDefinition[]): string {
  return morphs.find((morph) => morph.geneId === geneId)?.name ?? geneId;
}

export default function ResultCard({ result, morphs }: ResultCardProps) {
  return (
    <article className={`genetics-result-card${result.hasUnresolvedGenetics ? " genetics-result-unresolved" : ""}`} aria-label={`${result.name} ${result.percentage}% outcome`}>
      <div className="genetics-result-header">
        <h3>{result.name}</h3>
        <strong>{result.percentage}%</strong>
      </div>
      {result.hasUnresolvedGenetics && <div className="genetics-result-warning" role="status">This outcome contains genetics that are not sufficiently verified to label as confirmed.</div>}
      {result.visualComponents.length > 0 && <div className="genetics-result-section"><h4>Visual</h4><div className="genetics-result-tags">{result.visualComponents.map((component) => <span key={component.geneId} className="genetics-tag genetics-tag-visual">{getMorphName(component.geneId, morphs)}</span>)}</div></div>}
      {result.hetComponents.length > 0 && <div className="genetics-result-section"><h4>Known Hets</h4><div className="genetics-result-tags">{result.hetComponents.map((component) => <span key={component.geneId} className="genetics-tag genetics-tag-het">Het {getMorphName(component.geneId, morphs)}</span>)}</div></div>}
      {result.possibleHetComponents.length > 0 && <div className="genetics-result-section"><h4>Possible Hets</h4><div className="genetics-result-tags">{result.possibleHetComponents.map((component) => <span key={component.geneId} className="genetics-tag genetics-tag-possible">Possible Het {getMorphName(component.geneId, morphs)}</span>)}</div></div>}
    </article>
  );
}
