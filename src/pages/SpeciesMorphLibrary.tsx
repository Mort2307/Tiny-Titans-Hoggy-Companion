import { useEffect, useMemo, useState } from "react";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesGeneticsStatus, getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import { getApprovedMorphImages } from "../services/creatorService";
import type { ApprovedMorphImage } from "../types/morphSubmission";
import BackHomeButton from "../components/BackHomeButton";
import { SpeciesMorphImageSubmissionDialog } from "./SpeciesMorphImageSubmissionDialog";
import "../styles/morphLibrary.css";
import "../styles/morphCommunityGallery.css";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
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

function SpeciesCommunityGallery({ speciesId, morphId, morphName }: { speciesId: string; morphId: string; morphName: string }) {
  const [images, setImages] = useState<ApprovedMorphImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getApprovedMorphImages(morphId, speciesId)
      .then((result) => {
        if (!cancelled) setImages(result.filter((image) => Boolean(image.imageUrl)));
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [morphId, speciesId]);

  return (
    <section className="morph-detail__section morph-community-gallery">
      <div className="morph-community-gallery__header">
        <div><h3>📷 Community examples</h3><p>Approved keeper photographs linked to this exact species and morph.</p></div>
        {!loading && images.length > 0 && <span className="morph-community-gallery__count">{images.length} {images.length === 1 ? "example" : "examples"}</span>}
      </div>
      {loading ? <p className="morph-community-gallery__state">Loading approved {morphName} examples…</p> : images.length === 0 ? <p className="morph-community-gallery__state">No approved community examples for {morphName} yet.</p> : <div className="morph-community-gallery__scroller" tabIndex={0}>{images.map((image, index) => <figure className="morph-community-gallery__card" key={image.id ?? `${image.imageUrl}-${index}`}><img src={image.imageUrl} alt={`${morphName} community example ${index + 1}`} loading={index < 2 ? "eager" : "lazy"} />{(image.creditName || image.creditSocial) && <figcaption className="morph-community-gallery__credit">Credit: {image.creditName || image.creditSocial}</figcaption>}</figure>)}</div>}
    </section>
  );
}

export default function SpeciesMorphLibrary() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<SpeciesMorphEntry | null>(null);
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
    const needle = normalise(query);
    return entries
      .filter((morph) => matchesFilter(morph, filter))
      .filter((morph) => {
        if (!needle) return true;
        const searchable = [morph.name, ...(morph.aliases ?? []), ...(morph.contains ?? []), ...(morph.components?.map((component) => component.morphId) ?? [])].map(normalise);
        return searchable.some((value) => value.includes(needle));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, filter, query]);

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
          {(["all", "gene", "combination", "polygenic", "line-bred"] as Filter[]).map((value) => <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All" : value === "gene" ? "Genes & Supers" : value === "combination" ? "Combinations" : value === "polygenic" ? "Polygenic" : "Line-bred"}</button>)}
        </div>
        <label className="morph-library__search"><span>Search {speciesName} morphs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${speciesName} genetics…`} /></label>
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
                {morph.components?.length ? <p className="morph-card__contains">Contains: {morph.components.map((component) => component.morphId).join(" + ")}</p> : null}
                {morph.description && <p className="morph-card__description">{morph.description}</p>}
                <div className="morph-card__footer"><span className="morph-card__source">{morph.sourceLabel ?? "Tiny Titans species genetics record"}</span></div>
                <div className="morph-card__actions">
                  <button type="button" className="morph-card__open" onClick={() => setSelected(morph)}>Open genetics record <span aria-hidden="true">→</span></button>
                  <button type="button" className="morph-card__image-submit" onClick={() => openImageSubmission(morph.geneId)}>📷 Add image</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {selected && <div className="morph-detail-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><article className="morph-detail" role="dialog" aria-modal="true" aria-labelledby="species-morph-title" onMouseDown={(event) => event.stopPropagation()}><button className="morph-detail__close" type="button" onClick={() => setSelected(null)} aria-label="Close morph details">×</button><div className="morph-detail__eyebrow">TINY TITANS · {speciesName.toUpperCase()}</div><h2 id="species-morph-title">{selected.name}</h2><div className="morph-detail__badges"><span>{selected.kind}</span><span>{selected.inheritance}</span><span>{selected.verification}</span></div><p className="morph-detail__description">{selected.description ?? "No description has been added yet."}</p>{selected.aliases?.length ? <section className="morph-detail__section"><h3>Recognised aliases</h3><p>{selected.aliases.join(" · ")}</p></section> : null}{selected.components?.length ? <section className="morph-detail__section"><h3>Genetic components</h3><ul>{selected.components.map((component) => <li key={`${component.morphId}-${component.copies ?? 1}`}><strong>{component.morphId}</strong>{component.copies ? ` ×${component.copies}` : ""}</li>)}</ul></section> : null}<section className="morph-detail__section"><h3>Genetics notes</h3><p>{selected.educationalNotes ?? "No additional genetics notes have been published for this entry."}</p></section><SpeciesCommunityGallery speciesId={selectedSpeciesId} morphId={selected.geneId} morphName={selected.name} /><section className="morph-detail__source"><strong>Species reference</strong><span>{selected.sourceLabel ?? "Tiny Titans species genetics record"}</span>{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Open source reference →</a> : <span className="morph-detail__source-note">Canonical species-scoped record maintained by Tiny Titans.</span>}</section></article></div>}
      {showImageSubmission && selectedSpeciesId && <SpeciesMorphImageSubmissionDialog initialMorphId={imageSubmissionMorphId} initialSpeciesId={selectedSpeciesId} onClose={closeImageSubmission} />}
    </main>
  );
}
