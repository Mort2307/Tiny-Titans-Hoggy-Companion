import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesGeneticsStatus, getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import { getApprovedMorphImages } from "../services/creatorService";
import type { ApprovedMorphImage } from "../types/morphSubmission";
import BackHomeButton from "../components/BackHomeButton";
import { SpeciesMorphImageSubmissionDialog } from "./SpeciesMorphImageSubmissionDialog";
import { rankSearchResults } from "../utils/searchRanking";
import "../styles/morphLibrary.css";
import "../styles/morphCommunityGallery.css";

type SpeciesMorphEntry = ReturnType<typeof getSpeciesVisualMorphs>[number];
type Filter = "all" | "gene" | "combination" | "polygenic" | "line-bred";

function matchesFilter(morph: SpeciesMorphEntry, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "gene") return morph.kind === "Gene" || morph.kind === "Super";
  if (filter === "combination") return morph.kind === "Combination";
  if (filter === "polygenic") return morph.kind === "Polygenic" || morph.inheritance === "Polygenic";
  if (filter === "line-bred") return morph.kind === "Line-bred" || morph.inheritance === "Line-bred";
  return true;
}

function searchFields(morph: SpeciesMorphEntry): { canonical: string[]; aliases: string[]; secondary: string[] } {
  const enriched = morph as SpeciesMorphEntry & { searchTerms?: string[]; recognisedNames?: string[]; geneticFormula?: string; directFormula?: string };
  return {
    canonical: [morph.name],
    aliases: morph.aliases ?? [],
    secondary: [
      ...(enriched.searchTerms ?? []),
      ...(enriched.recognisedNames ?? []),
      ...(enriched.geneticFormula ? [enriched.geneticFormula] : []),
      ...(enriched.directFormula ? [enriched.directFormula] : []),
      ...(morph.contains ?? []),
      ...(morph.components?.map((component) => component.morphId) ?? []),
    ],
  };
}

export default function SpeciesMorphLibrary() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showImageSubmission, setShowImageSubmission] = useState(false);
  const [imageSubmissionMorphId, setImageSubmissionMorphId] = useState("");
  const [cardImages, setCardImages] = useState<Record<string, ApprovedMorphImage>>({});
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "Selected species";
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const entries = useMemo(() => getSpeciesVisualMorphs(selectedSpeciesId), [selectedSpeciesId]);

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
    const filteredEntries = entries.filter((morph) => matchesFilter(morph, filter));
    if (!query.trim()) return [...filteredEntries].sort((a, b) => a.name.localeCompare(b.name));
    return rankSearchResults(query, filteredEntries, searchFields).map(({ item }) => item);
  }, [entries, filter, query]);

  const statusLabel = geneticsStatus === "mapped"
    ? "🟢 Reviewed species genetics catalogue"
    : "🟠 Species genetics catalogue pending review";
  const baselineOnly = geneticsStatus === "baseline-only";

  function openImageSubmission(morphId: string) {
    setImageSubmissionMorphId(morphId);
    setShowImageSubmission(true);
  }

  function closeImageSubmission() {
    setShowImageSubmission(false);
    setImageSubmissionMorphId("");
  }

  function openMorphRecord(morphId: string) {
    navigate(`/morph-library/${encodeURIComponent(morphId)}`);
  }

  function handleMorphCardClick(event: React.MouseEvent<HTMLElement>, morphId: string) {
    const target = event.target as HTMLElement;
    if (target.closest("a,button,input,textarea,select")) return;
    openMorphRecord(morphId);
  }

  function handleMorphCardKeyDown(event: React.KeyboardEvent<HTMLElement>, morphId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openMorphRecord(morphId);
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
        <label className="morph-library__search"><span>Search {speciesName} morphs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${speciesName} genetics…`} autoComplete="off" spellCheck={false} /></label>
        <div className={`morph-library__source-strip ${geneticsStatus === "mapped" ? "is-ready" : "is-pending"}`}><strong>{statusLabel}</strong><span>{filtered.length} species-scoped entries currently published</span></div>
      </header>

      {baselineOnly && (
        <section className="tracker-card" aria-label="Baseline genetics coverage notice">
          <h2>🧬 Baseline species genetics record</h2>
          <p>Tiny Titans knows this species, but no reviewed species-specific genetic morph catalogue has been published yet. Until those traits are sourced and reviewed, this library contains only the canonical baseline phenotype.</p>
          <p><strong>This is intentional intelligence.</strong> We will never substitute Hognose, Ball Python, or another species' genetics here.</p>
        </section>
      )}

      <section className="morph-library-grid" aria-live="polite">
        {filtered.map((morph) => {
          const image = cardImages[morph.geneId];
          return (
            <article
              key={morph.geneId}
              className="morph-card morph-card--library morph-card--clickable"
              role="link"
              tabIndex={0}
              aria-label={`Open ${morph.name} genetics record`}
              onClick={(event) => handleMorphCardClick(event, morph.geneId)}
              onKeyDown={(event) => handleMorphCardKeyDown(event, morph.geneId)}
            >
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
                {morph.components?.length ? <p className="morph-card__contains">Contains: {morph.components.map((component) => component.morphId).join(" + ")}</p> : null}
                {morph.description && <p className="morph-card__description">{morph.description}</p>}
                <div className="morph-card__footer"><span className="morph-card__source">{morph.sourceLabel ?? "Tiny Titans species genetics record"}</span></div>
                <div className="morph-card__actions">
                  <Link className="morph-card__open" to={`/morph-library/${encodeURIComponent(morph.geneId)}`}>Open genetics record <span aria-hidden="true">→</span></Link>
                  <Link className="morph-card__image-submit" to={`/morph-library/${encodeURIComponent(morph.geneId)}/gallery`}>📷 Morph Gallery</Link>
                  <button type="button" className="morph-card__image-submit" onClick={() => openImageSubmission(morph.geneId)}>Add image</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {showImageSubmission && selectedSpeciesId && <SpeciesMorphImageSubmissionDialog initialMorphId={imageSubmissionMorphId} initialSpeciesId={selectedSpeciesId} onClose={closeImageSubmission} />}
    </main>
  );
}
