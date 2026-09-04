import { useMemo, useState } from "react";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesGeneticsStatus, getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import type { MasterMorphDefinition } from "../data/masterMorphDatabase";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/morphLibrary.css";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

type Filter = "all" | "gene" | "combination" | "polygenic" | "line-bred";

function matchesFilter(morph: MasterMorphDefinition, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "gene") return morph.kind === "Gene" || morph.kind === "Super";
  if (filter === "combination") return morph.kind === "Combination";
  if (filter === "polygenic") return morph.kind === "Polygenic" || morph.inheritance === "Polygenic";
  if (filter === "line-bred") return morph.kind === "Line-bred" || morph.inheritance === "Line-bred";
  return true;
}

export default function SpeciesMorphLibrary() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<MasterMorphDefinition | null>(null);
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "Selected species";
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const entries = useMemo(() => getSpeciesVisualMorphs(selectedSpeciesId), [selectedSpeciesId]);

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

  return (
    <main className="page-container morph-library-page">
      <BackHomeButton />
      <header className="morph-library__header">
        <div className="morph-library__eyebrow">🧬 TINY TITANS · SPECIES GENETICS</div>
        <h1>{speciesName} Morph Library</h1>
        <p>This library is driven by the selected species context. Tiny Titans will never display another species' genetics as a substitute.</p>
        <div className="morph-library__filters" role="group" aria-label="Morph type">
          {(["all", "gene", "combination", "polygenic", "line-bred"] as Filter[]).map((value) => (
            <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>
              {value === "all" ? "All" : value === "gene" ? "Genes & Supers" : value === "combination" ? "Combinations" : value === "polygenic" ? "Polygenic" : "Line-bred"}
            </button>
          ))}
        </div>
        <label className="morph-library__search">
          <span>Search {speciesName} morphs</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${speciesName} genetics…`} />
        </label>
        <div className={`morph-library__source-strip ${geneticsStatus === "mapped" ? "is-ready" : "is-pending"}`}>
          <strong>{statusLabel}</strong>
          <span>{filtered.length} species-scoped entries currently published</span>
        </div>
      </header>

      {geneticsStatus === "baseline-only" ? (
        <section className="morph-library__empty tracker-card">
          <h2>🧬 No reviewed morph catalogue yet for {speciesName}</h2>
          <p>Tiny Titans knows this species, but its recognised genetics catalogue has not yet been independently sourced and reviewed. The library therefore shows no Hognose, Ball Python, or other unrelated species genetics here.</p>
          <p><strong>This is intentional intelligence.</strong> An incomplete species catalogue is safer than false cross-species information.</p>
        </section>
      ) : (
        <>
          {geneticsStatus === "partial" && (
            <section className="tracker-card" aria-label="Catalogue coverage notice">
              <h2>🧠 Curated species catalogue</h2>
              <p>These are verified species-specific entries currently published by Tiny Titans. This list is <strong>not yet an exhaustive trait index</strong>; missing names must not be inferred from another species.</p>
              <p>Predictive breeding calculations remain locked until the species-specific inheritance engine has been independently verified.</p>
            </section>
          )}
          <section className="morph-library-grid" aria-live="polite">
            {filtered.map((morph) => (
              <button key={morph.geneId} type="button" className="morph-card" onClick={() => setSelected(morph)}>
                <span className="morph-card__name">{morph.name}</span>
                <span className="morph-card__meta">{morph.kind} · {morph.inheritance}</span>
                {morph.aliases && morph.aliases.length > 0 && <span className="morph-card__aliases">Also: {morph.aliases.join(", ")}</span>}
              </button>
            ))}
          </section>
        </>
      )}

      {geneticsStatus !== "baseline-only" && filtered.length === 0 && (
        <section className="tracker-card"><h2>No matching morphs</h2><p>Try another search or clear the type filter.</p></section>
      )}

      {selected && (
        <div className="morph-detail-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <article className="morph-detail" role="dialog" aria-modal="true" aria-labelledby="species-morph-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="morph-detail__close" type="button" onClick={() => setSelected(null)} aria-label="Close morph details">×</button>
            <div className="morph-detail__eyebrow">TINY TITANS · {speciesName.toUpperCase()}</div>
            <h2 id="species-morph-title">{selected.name}</h2>
            <div className="morph-detail__badges"><span>{selected.kind}</span><span>{selected.inheritance}</span><span>{selected.verification}</span></div>
            <p className="morph-detail__description">{selected.description ?? "No description has been added yet."}</p>
            {selected.aliases?.length ? <section className="morph-detail__section"><h3>Recognised aliases</h3><p>{selected.aliases.join(" · ")}</p></section> : null}
            {selected.components?.length ? <section className="morph-detail__section"><h3>Genetic components</h3><ul>{selected.components.map((component) => <li key={`${component.morphId}-${component.copies ?? 1}`}><strong>{component.morphId}</strong>{component.copies ? ` ×${component.copies}` : ""}</li>)}</ul></section> : null}
            <section className="morph-detail__section"><h3>Genetics notes</h3><p>{selected.educationalNotes ?? "No additional genetics notes have been published for this entry."}</p></section>
            <section className="morph-detail__section morph-detail__source">
              <strong>Species reference</strong>
              <span>{selected.sourceLabel ?? "Tiny Titans species genetics record"}</span>
              {selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Open source reference →</a> : <span className="morph-detail__source-note">Canonical species-scoped record maintained by Tiny Titans.</span>}
            </section>
          </article>
        </div>
      )}
    </main>
  );
}
