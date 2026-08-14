import { useMemo, useState } from "react";
import BackHomeButton from "../components/BackHomeButton";
import { masterMorphs, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import { reptifitMorphCatalog } from "../data/reptifitMorphCatalog";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import "../styles/morphLibrary.css";

function MorphDetail({ morph, onClose }: { morph: MorphReferenceEntry; onClose: () => void }) {
  const contains = morph.contains ?? morph.components?.map((component) => component.morphId) ?? [];

  return (
    <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="morph-detail" role="dialog" aria-modal="true" aria-labelledby="morph-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="morph-detail__close" type="button" onClick={onClose} aria-label="Close morph details">×</button>
        <div className="morph-detail__eyebrow">TINY TITANS · MORPH DATABASE</div>
        <h2 id="morph-detail-title">{morph.name}</h2>
        <div className="morph-detail__badges">
          <span>{morph.kind}</span>
          <span>{morph.inheritance}</span>
          <span>{morph.verification}</span>
        </div>
        <p className="morph-detail__description">{morph.description ?? "No description has been added yet."}</p>

        {contains.length > 0 && (
          <section className="morph-detail__section">
            <h3>Contains</h3>
            <div className="morph-detail__contains">
              {contains.map((item) => <span key={item}>{item}</span>)}
            </div>
          </section>
        )}

        {morph.components && morph.components.length > 0 && (
          <section className="morph-detail__section">
            <h3>Genetic components</h3>
            <ul>
              {morph.components.map((component) => (
                <li key={`${component.morphId}-${component.copies ?? 1}`}>
                  <strong>{component.morphId}</strong>{component.copies ? ` ×${component.copies}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="morph-detail__section">
          <h3>Genetics notes</h3>
          <p>{morph.educationalNotes ?? "No additional genetics notes have been published for this entry yet."}</p>
        </section>

        <section className="morph-detail__section morph-detail__source">
          <strong>Reference</strong>
          <span>{morph.sourceLabel ?? "Tiny Titans"}</span>
          <a href={morph.sourceUrl ?? "https://hognose-morphs.com/"} target="_blank" rel="noreferrer">Open source reference ↗</a>
        </section>
      </article>
    </div>
  );
}

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function asReferenceEntry(entry: MasterMorphDefinition): MorphReferenceEntry {
  return entry as MorphReferenceEntry;
}

export default function MorphLibrary() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "gene" | "combination" | "polygenic" | "line-bred">("all");
  const [selected, setSelected] = useState<MorphReferenceEntry | null>(null);

  const entries = useMemo<MorphReferenceEntry[]>(() => {
    const byName = new Map<string, MorphReferenceEntry>();

    [...masterMorphs, ...reptifitMorphCatalog].forEach((entry) => {
      const key = normalise(entry.name);
      if (!byName.has(key)) byName.set(key, asReferenceEntry(entry));
    });

    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filtered = useMemo(() => {
    const needle = normalise(query);

    // Exact-first search: if the user types "conda", show Conda/its exact
    // alias match rather than making them scroll through every Anaconda combo.
    const exactMatches = needle
      ? entries.filter((entry) =>
          normalise(entry.name) === needle ||
          (entry.aliases ?? []).some((alias) => normalise(alias) === needle),
        )
      : [];

    const searchPool = exactMatches.length > 0
      ? exactMatches
      : entries.filter((entry) => {
          if (!needle) return true;
          const searchable = [
            entry.name,
            ...(entry.aliases ?? []),
            ...(entry.contains ?? []),
          ].map(normalise);
          return searchable.some((value) => value.includes(needle));
        });

    return searchPool.filter((entry) => {
      return filter === "all"
        || (filter === "gene" && (entry.kind === "Gene" || entry.kind === "Super"))
        || (filter === "combination" && entry.kind === "Combination")
        || (filter === "polygenic" && entry.inheritance === "Polygenic")
        || (filter === "line-bred" && entry.inheritance === "Line-bred");
    });
  }, [entries, filter, query]);

  return (
    <main className="page-container morph-library-page">
      <BackHomeButton />
      <header className="morph-library__header">
        <div className="morph-library__eyebrow">🐍 TINY TITANS · WESTERN HOGNOSE</div>
        <h1>Morph Library</h1>
        <p>Explore genes, super forms and recognised combinations. Tap any entry to open its full genetics record.</p>
      </header>

      <div className="morph-library__controls">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search morphs, aliases or components…" aria-label="Search morph library" />
        <div className="morph-library__filters" role="group" aria-label="Morph type filters">
          {(["all", "gene", "combination", "polygenic", "line-bred"] as const).map((value) => (
            <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All" : value.replace("-", " ")}</button>
          ))}
        </div>
      </div>

      <div className="morph-library__count">Showing <strong>{filtered.length}</strong> of <strong>{entries.length}</strong> records</div>

      <div className="morph-grid morph-library__grid">
        {filtered.map((morph) => (
          <button className="morph-card morph-card--interactive" key={morph.geneId} type="button" onClick={() => setSelected(morph)}>
            <div className="morph-card__topline"><span>{morph.kind}</span><span>{morph.verification}</span></div>
            <h2>{morph.name}</h2>
            <p className="morph-card__inheritance">{morph.inheritance}</p>
            {morph.contains && morph.contains.length > 0 ? <p className="morph-card__contains">Contains: {morph.contains.join(" + ")}</p> : <p>{morph.description ?? "Reference entry"}</p>}
            <span className="morph-card__open">Open details →</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="welcome-card"><h2>No matching morphs</h2><p>Try a different name, alias or category.</p></div>}
      {selected && <MorphDetail morph={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
