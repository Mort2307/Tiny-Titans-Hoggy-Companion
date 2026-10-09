import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesGeneticsStatus, getSpeciesVariationLibraryStatus, getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import { getApprovedMorphImages } from "../services/creatorService";
import type { ApprovedMorphImage } from "../types/morphSubmission";
import { getApprovedCommunityVariationCards, type ApprovedCommunityVariationCard } from "../services/communityVariationCardService";
import BackHomeButton from "../components/BackHomeButton";
import { SpeciesMorphImageSubmissionDialog } from "./SpeciesMorphImageSubmissionDialog";
import NewMorphSubmissionDialog from "../components/morph-library/NewMorphSubmissionDialog";
import CommunityVariationImageSubmissionDialog from "../components/morph-library/CommunityVariationImageSubmissionDialog";
import { rankSearchResults } from "../utils/searchRanking";
import "../styles/morphLibrary.css";
import "../styles/morphCommunityGallery.css";
import TinyTitansIcon from "../components/TinyTitansIcon";

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
  const { selectedSpeciesId, selectedUniversalSpecies } = useSpeciesContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showImageSubmission, setShowImageSubmission] = useState(false);
  const [showVariationProposal, setShowVariationProposal] = useState(false);
  const [variationImageCard, setVariationImageCard] = useState<ApprovedCommunityVariationCard | null>(null);
  const [imageSubmissionMorphId, setImageSubmissionMorphId] = useState("");
  const [cardImages, setCardImages] = useState<Record<string, ApprovedMorphImage>>({});
  const [communityCards, setCommunityCards] = useState<ApprovedCommunityVariationCard[]>([]);
  const speciesName = selectedUniversalSpecies?.commonNames[0] ?? selectedUniversalSpecies?.acceptedScientificName ?? "Selected species";
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const variationStatus = getSpeciesVariationLibraryStatus(selectedSpeciesId);
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

  useEffect(() => {
    let cancelled = false;
    setCommunityCards([]);
    if (!selectedSpeciesId) return undefined;
    void getApprovedCommunityVariationCards(selectedSpeciesId)
      .then((cards) => { if (!cancelled) setCommunityCards(cards); })
      .catch(() => { if (!cancelled) setCommunityCards([]); });
    return () => { cancelled = true; };
  }, [selectedSpeciesId]);

  const filteredCommunityCards = useMemo(() => {
    if (filter !== "all") return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return communityCards;
    return communityCards.filter((card) =>
      [card.name, card.category, card.description, card.knownGenetics, card.sourceOrBreeder]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [communityCards, filter, query]);

  const filtered = useMemo(() => {
    const filteredEntries = entries.filter((morph) => matchesFilter(morph, filter));
    if (!query.trim()) return [...filteredEntries].sort((a, b) => a.name.localeCompare(b.name));
    return rankSearchResults(query, filteredEntries, searchFields).map(({ item }) => item);
  }, [entries, filter, query]);

  const statusLabel = variationStatus === "catalogued"
    ? "Reviewed species morph & variation catalogue"
    : variationStatus === "reviewed-no-established-variants"
      ? "Variation review complete · no established captive morph system documented"
      : "Wild Type baseline · reviewed variations added as evidence arrives";
  const baselineOnly = geneticsStatus === "baseline-only";
  const variationReviewRequired = variationStatus === "research-required";

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
        <div className="morph-library__eyebrow"><TinyTitansIcon name="morph" size={14} /> TINY TITANS · SPECIES GENETICS</div>
        <h1>{speciesName} Morph &amp; Variation Library</h1>
        <p>This library is driven by the selected species context. Tiny Titans will never display another species' genetics or variations as a substitute. Catalogue imagery is never copied in: reference photos come only from approved community submissions.</p>
        <div className="morph-library__filters" role="group" aria-label="Morph type">
          {["all", "gene", "combination", "polygenic", "line-bred"].map((value) => <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value as Filter)}>{value === "all" ? "All" : value === "gene" ? "Genes & Supers" : value === "combination" ? "Combinations" : value === "polygenic" ? "Polygenic" : "Line-bred"}</button>)}
        </div>
        <label className="morph-library__search"><span>Search {speciesName} morphs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${speciesName} genetics…`} autoComplete="off" spellCheck={false} /></label>
        <div className={`morph-library__source-strip ${geneticsStatus === "mapped" ? "is-ready" : "is-pending"}`}><strong>{statusLabel}</strong><span>{filtered.length + (filter === "all" ? filteredCommunityCards.length : 0)} species-scoped entries currently published</span></div>
        {selectedSpeciesId && <div className="morph-card__actions"><button type="button" className="morph-card__open" onClick={() => setShowVariationProposal(true)}>Suggest a morph / variation card</button><button type="button" className="morph-card__image-submit" onClick={() => openImageSubmission("normal")}><TinyTitansIcon name="camera" size={13} /> Contribute Wild Type / Unclassified image</button></div>}
      </header>

      {variationReviewRequired && (
        <section className="tracker-card" aria-label="Baseline genetics coverage notice">
          <h2><TinyTitansIcon name="genetics" size={16} /> Wild Type baseline active</h2>
          <p>Tiny Titans gives this species a truthful Wild Type / Unclassified baseline first. Reviewed genetic morphs, colour forms, pattern variants, line-bred traits, locality forms and community variation cards can then be added as evidence becomes available. We do not fill empty space by guessing.</p>
          <p><strong>Absence is safer than invention.</strong> We will never substitute another species' genetics, turn an unusual appearance into a gene without evidence, or copy third-party catalogue images into Tiny Titans.</p>
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
                  <div className="morph-card__image-empty"><span className="morph-card__image-icon"><TinyTitansIcon name="genetics" size={20} /></span><strong>{baselineOnly ? "Baseline phenotype" : "Species-scoped morph"}</strong><span>{baselineOnly ? "Canonical wild-type reference" : "Open for genetics and evidence"}</span></div>
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
                  <Link className="morph-card__open" to={`/morph-library/${encodeURIComponent(morph.geneId)}`}>Open genetics record <span aria-hidden="true"><TinyTitansIcon name="forward" size={12} /></span></Link>
                  <Link className="morph-card__image-submit" to={`/morph-library/${encodeURIComponent(morph.geneId)}/gallery`}><TinyTitansIcon name="camera" size={13} /> Morph Gallery</Link>
                  <button type="button" className="morph-card__image-submit" onClick={() => openImageSubmission(morph.geneId)}>Add image</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {filteredCommunityCards.length > 0 && (
        <section className="tracker-card" aria-label="Community reviewed variation cards">
          <div className="morph-library__eyebrow"><TinyTitansIcon name="community" size={14} /> COMMUNITY-REVIEWED VARIATIONS</div>
          <h2>Keeper-contributed variation cards</h2>
          <p>These cards document reviewed names, phenotypes, locality forms or captive variations. They are <strong>not genetics-calculator loci</strong> unless Tiny Titans separately verifies and promotes the inheritance model.</p>
          <div className="morph-library-grid">
            {filteredCommunityCards.map((card) => {
              const image = cardImages["community-" + card.id];
              return (
                <article key={card.id} className="morph-card morph-card--library">
                  <div className="morph-card__media">
                    {image ? (
                      <div className="morph-card__image-wrap">
                        <img src={image.imageUrl} alt={card.name + " community reference example"} loading="lazy" />
                        {(image.creditName || image.creditSocial) && <span className="morph-card__credit">Credit: {image.creditName || image.creditSocial}</span>}
                      </div>
                    ) : (
                      <div className="morph-card__image-empty">
                        <span className="morph-card__image-icon"><TinyTitansIcon name="morph" size={20} /></span>
                        <strong>Community variation card</strong>
                        <span>Image awaiting approved user contribution</span>
                      </div>
                    )}
                  </div>
                  <div className="morph-card__body">
                    <div className="morph-card__topline"><span>{card.category.replaceAll("-", " ")}</span><span>Reviewed</span></div>
                    <h2>{card.name}</h2>
                    <div className="morph-card__classification"><span>Variation record</span><span>Genetics unresolved</span></div>
                    <p className="morph-card__description">{card.description}</p>
                    {card.knownGenetics && <p className="morph-card__contains"><strong>Submitted genetics context:</strong> {card.knownGenetics}</p>}
                    <p className="morph-card__canonical"><strong>Calculator:</strong> Not eligible until inheritance is separately verified.</p>
                    <div className="morph-card__footer">
                      <span className="morph-card__source">{card.sourceOrBreeder || "Tiny Titans community review"}</span>
                      {card.sourceUrl && <a href={card.sourceUrl} target="_blank" rel="noreferrer">Source reference</a>}
                    </div>
                    <div className="morph-card__actions">
                      <button type="button" className="morph-card__image-submit" onClick={() => setVariationImageCard(card)}>
                        <TinyTitansIcon name="camera" size={13} /> {image ? "Add another image" : "Contribute image"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {showImageSubmission && selectedSpeciesId && <SpeciesMorphImageSubmissionDialog initialMorphId={imageSubmissionMorphId} initialSpeciesId={selectedSpeciesId} onClose={closeImageSubmission} />}
      {showVariationProposal && selectedSpeciesId && <NewMorphSubmissionDialog initialSpeciesId={selectedSpeciesId} onClose={() => setShowVariationProposal(false)} />}
      {variationImageCard && selectedSpeciesId && <CommunityVariationImageSubmissionDialog card={variationImageCard} speciesId={selectedSpeciesId} speciesName={speciesName} onClose={() => setVariationImageCard(null)} />}
    </main>
  );
}
