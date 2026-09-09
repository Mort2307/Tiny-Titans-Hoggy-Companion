import type { ReactElement } from "react";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import { getHognosePhenotypeGuide } from "../data/hognosePhenotypeGuide";

export default function HognosePhenotypeGuide({ morph }: { morph: MorphReferenceEntry }): ReactElement {
  const guide = getHognosePhenotypeGuide(morph.geneId, morph.components);
  const confidence = guide.visualDescription.startsWith("No verified") ? "Limited" : "Keeper guide";

  return (
    <section className="morph-detail__section" aria-labelledby="phenotype-guide-title">
      <div className="morph-phenotype-guide__header">
        <div>
          <h3 id="phenotype-guide-title">👁️ Visual identification guide</h3>
          <p className="morph-detail__source-note">{confidence} · Use appearance to compare, never as genetic proof.</p>
        </div>
      </div>
      <p>{guide.visualDescription}</p>
      {guide.identificationMarkers.length > 0 && <>
        <h4>What to look for</h4>
        <ul>{guide.identificationMarkers.map((marker) => <li key={marker}>{marker}</li>)}</ul>
      </>}
      {guide.differentiators.length > 0 && <>
        <h4>How to tell it apart</h4>
        <ul>{guide.differentiators.map((item) => <li key={item}>{item}</li>)}</ul>
      </>}
      {guide.variabilityNotes.length > 0 && <>
        <h4>Expression &amp; variability</h4>
        <ul>{guide.variabilityNotes.map((item) => <li key={item}>{item}</li>)}</ul>
      </>}
      <div className="morph-phenotype-guide__caveat">
        <strong>Genetic confirmation:</strong> {guide.identificationCaveat}
      </div>
    </section>
  );
}
