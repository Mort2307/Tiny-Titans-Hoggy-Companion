import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSpeciesContext } from "../context/SpeciesContext";
import {
  getSpeciesGeneticsStatus,
  getSpeciesVisualMorphs,
  searchGenetics,
  type GeneticsSearchResult,
} from "../data/species/speciesGenetics";
import { getApprovedMorphImages } from "../services/creatorService";
import type { ApprovedMorphImage } from "../types/morphSubmission";
import BackHomeButton from "../components/BackHomeButton";
import { SpeciesMorphImageSubmissionDialog } from "./SpeciesMorphImageSubmissionDialog";
import "../styles/morphLibrary.css";
import "../styles/morphCommunityGallery.css";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
type Filter = "all" | "gene" | "combination" | "polygenic" | "line-bred";

function matchesFilter(result: GeneticsSearchResult, filter: Filter): boolean {
  const morph = result.entry;
  if (filter === "all") return true;
  if (filter === "gene") return morph.kind === "Gene" || morph.kind === "Super";
  if (filter === "combination") return morph.kind === "Combination";
  if (filter === "polygenic") return morph.kind === "Polygenic" || morph.inheritance === "Polygenic";
  if (filter === "line-bred") return morph.kind === "Line-bred" || morph.inheritance === "Line-bred";
  return true;
}

function confidenceLabel(confidence: GeneticsSearchResult["evidence"]["confidence"]): string {
  if (confidence === "confirmed") return "Confirmed evidence";
  if (confidence === "recognised") return "Recognised catalogue record";
  return "Evidence status unknown";
}

export default function SpeciesMorphLibrary() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showImageSubmission, setShowImageSubmission] = useState(false);
  const [imageSubmissionMorphId, setImageSubmissionMorphId] = useState("");
  const [cardImages, setCardImages] = useState<Record<string, ApprovedMorphImage>>({});
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "Selected species";
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const speciesVisualMorphs = useMemo(() => getSpeciesVisualMorphs(selectedSpeciesId), [selectedSpeciesId]);

  useEffect(() => {
    let cancelled = false;
    setCardImages({});
    if (!selectedSpeciesId) return undefined;
    void getApprovedMorphImages(undefined, selectedSpeciesId)
      .then((result) => {
        if (cancelled) return;
        const next: Record<string, ApprovedMorphImage> = {};
        result.forEach((image) => {
          if (image.morphId && image.imageUrl && !next[image.morphId]) next[image.morphId] = image;
        });
        setCardImages(next);
      })
      .catch(() => {
        if (!cancelled) setCardImages({});
      });
    return () => { cancelled = true; };
  }, [selectedSpeciesId]);

  const filtered = useMemo(() => {
    const results = searchGenetics(selectedSpeciesId, query, { limit: 150 });
    return results
      .filter((result) => matchesFilter(result, filter))
      .sort((a, b) => query.trim() ? b.score - a.score || a.entry.name.localeCompare(b.entry.name) : a.entry.name.localeCompare(b.entry.name));
  }, [filter, query, selectedSpeciesId]);

  const statusLabel = geneticsStatus === "mapped"
    ? "🟢 Full species genetics catalogue"
    : geneticsStatus === "partial"
      ? "🟡 Species genetics partially catalogued"
      : "🟠 Species genetics catalogue pending";
  const baselineOnly = geneticsStatus === "baseline-only";

  function openImageSubmission(morphId: string) {
    setImageSubmissionMorphId(morphId);
    setShowImageSubmission(true);
  }

  function closeImageSubmission() {
    setShowImageSubmission(false);
    setImageSubmissionMorphId("");
  }

  return (
    <main className="page-container morph-library-page">
      <BackHomeButton />
      <header className="morph-library__header">
        <div className="morph-library__eyebrow">🧬 TINY TITANS · SPECIES GENETICS</div>
        <h1>{speciesName} Morph Library</h1>
        <p>This library is driven by the selected species context. Tiny Titans will never display another species' genetics as a substitute.</p>
        <div className="morph-library__filters" role="group" aria-label="Morph type">
          {["all", "gene", "combination", "polygenic", "line-bred"].map((value) => <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value as Filter)}>{value === "all" ? "All" : value === "gene" ? "Genes & Supers" : value === "combination" ? "Combinations" : value === "polygenic" ? "Polygenic" : "Line-bred"}</button>)}
        </div>
        <label className="morph-library__search"><span>Search {speciesName} morphs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${speciesName} genetics…`} /></label>
        <div className={`morph-library__source-strip ${geneticsStatus === "mapped" ? "is-ready" : "is-pending"}`}><strong>{statusLabel}</strong><span>{filtered.length} matching species-scoped entries · {speciesVisualMorphs.length} visual phenotype records</span></div>
      </header>

      {baselineOnly && (
        <section className="tracker-card" aria-label="Baseline genetics coverage notice">
          <h2>🧬 Baseline species genetics record</h2>
          <p>Tiny Titans knows this species, but no reviewed species-specific genetic morph catalogue has been published yet. Until those traits are sourced and reviewed, this library contains only the canonical baseline phenotype.</p>
          <p><strong>This is intentional intelligence.</strong> We will never substitute Hognose, Ball Python, or another species' genetics here.</p>
        </section>
      )}

      <section className="morph-library-grid" aria-live="polite">
        {filtered.map((result) => {
          const morph = result.entry;
          const image = cardImages[morph.geneId];
          return (
            <article key={morph.geneId} className="morph-card morph-card--library">
              <div className="morph-card__media">
                {image ? (
                  <div className="morph-card__image-wrap"><img src={image.imageUrl} alt={`${morph.name} reference example`} loading="lazy" />{(image.creditName || image.creditSocial) && <span className="morph-card__credit">Credit: {image.creditName || image.creditSocial}</span>}</div>
                ) : (
                  <div className="morph-card__image-empty"><span className="morph-card__image-icon">🧬</span><strong>{baselineOnly ? "Baseline phenotype" : "Species-scoped morph"}</strong><span>{baselineOnly ? "Canonical wild-type reference" : "Open for genetics and evidence"}</span></div>
                )}
              </div>
              <div className="morph-card__body">
                <div className="morph-card__topline"><span>{morph.kind}</span><span>{morph.verification}</span></div>
                <h2>{morph.name}</h2>
                <div className="morph-card__classification"><span>{morph.category}</span><span>{morph.inheritance}</span></div>
                {morph.aliases && morph.aliases.length > 0 && <p className="morph-card__canonical">Also known as: {morph.aliases.join(", ")}</p>}
                {result.components.length ? <p className="morph-card__contains">Components: {result.components.map((component) => `${component.name}${component.copies > 1 ? ` ×${component.copies}` : ""}`).join(" + ")}</p> : null}
                <p className="morph-card__description">{result.explanation}</p>
                <div className="morph-card__footer">
                  <span className="morph-card__source">{morph.sourceLabel ?? "Tiny Titans species genetics record"}</span>
                  <span title={result.evidence.note}>{confidenceLabel(result.evidence.confidence)}</span>
                </div>
                {result.matchedOn.length > 0 && <div className="morph-card__classification"><span>Matched: {result.matchedOn.join(", ")}</span>{result.calculatorEligible ? <span>🧮 Calculator eligible</span> : <span>📚 Evidence/reference only</span>}</div>}
                <div className="morph-card__actions">
                  <Link className="morph-card__open" to={`/morph-library/${encodeURIComponent(morph.geneId)}`}>Open genetics record <span aria-hidden="true">→</span></Link>
                  <Link className="morph-card__image-submit" to={`/morph-library/${encodeURIComponent(morph.geneId)}/gallery`}>📷 Morph Gallery</Link>
                  <button type="button" className="morph-card__image-submit" onClick={() => openImageSubmission(morph.geneId)}>Add image</button>
                </div>
              </div>
            </article>
          );
        })}
        {!filtered.length && query.trim() && (
          <div className="tracker-card" role="status">
            <h2>No species-scoped genetics match</h2>
            <p>No published genetics record matched <strong>{query}</strong> for {speciesName}. Tiny Titans has deliberately not fallen back to another species.</p>
          </div>
        )}
      </section>

      {showImageSubmission && selectedSpeciesId && <SpeciesMorphImageSubmissionDialog initialMorphId={imageSubmissionMorphId} initialSpeciesId={selectedSpeciesId} onClose={closeImageSubmission} />}
    </main>
  );
}