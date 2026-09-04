import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { INITIAL_SNAKE_SPECIES } from "../data/species/speciesRegistry";
import type { NumericRange, SnakeSpeciesRecord } from "../data/species/speciesTypes";
import "../styles/CreatorTools.css";

function rangeText(range?: NumericRange): string {
  if (!range) return "Not yet published";
  return `${range.min}–${range.max} ${range.unit}${range.context ? ` · ${range.context}` : ""}`;
}

function listText(values?: string[]): string {
  return values && values.length ? values.join(", ") : "Not yet published";
}

function evidenceLabel(level?: string): string {
  return level ? level[0].toUpperCase() + level.slice(1) : "Not rated";
}

function riskLabel(level: SnakeSpeciesRecord["knowledge"]["riskClass"]): string {
  return level.replace("-", " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

function dataCompleteness(species: SnakeSpeciesRecord): number {
  const checks = [
    Boolean(species.acceptedScientificName),
    species.commonNames.length > 0,
    Boolean(species.family && species.genus && species.speciesEpithet),
    Boolean(species.knowledge.summary),
    Boolean(species.knowledge.distribution),
    Boolean(species.knowledge.lifestyle?.length),
    Boolean(species.knowledge.husbandry),
    Boolean(species.knowledge.feeding),
    Boolean(species.knowledge.breeding),
    Boolean(species.knowledge.safety),
    species.knowledge.sourceIds.length > 0,
    Boolean(species.knowledge.reviewedOn),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function SpeciesPreview({ species }: { species: SnakeSpeciesRecord }) {
  const husbandry = species.knowledge.husbandry;
  const feeding = species.knowledge.feeding;
  const breeding = species.knowledge.breeding;
  const safety = species.knowledge.safety;
  const completeness = dataCompleteness(species);

  return (
    <div className="creator-species-preview-shell">
      <div className="creator-species-preview-hero">
        <div>
          <span className="creator-admin-kicker">LIVE MOCK · SPECIES-CONTEXT ENGINE</span>
          <h2>{species.commonNames[0]}</h2>
          <p className="creator-species-scientific"><em>{species.acceptedScientificName}</em>{species.authorYear ? ` · ${species.authorYear}` : ""}</p>
          <p>{species.knowledge.summary}</p>
        </div>
        <div className="creator-species-badges">
          <span className={`creator-species-badge risk-${species.knowledge.riskClass}`}>{riskLabel(species.knowledge.riskClass)}</span>
          <span className="creator-species-badge">Taxon: {species.taxonStatus}</span>
          <span className="creator-species-badge">Evidence: {evidenceLabel(species.knowledge.husbandry?.evidenceLevel)}</span>
        </div>
      </div>

      <div className="creator-species-integrity-grid">
        <div><span>Registry ID</span><strong>{species.id}</strong></div>
        <div><span>Family</span><strong>{species.family}</strong></div>
        <div><span>Genus</span><strong><em>{species.genus}</em></strong></div>
        <div><span>Sources</span><strong>{species.knowledge.sourceIds.length}</strong></div>
        <div><span>Reviewed</span><strong>{species.knowledge.reviewedOn}</strong></div>
        <div><span>Data coverage</span><strong>{completeness}% seeded</strong></div>
      </div>

      <div className="creator-species-card-grid">
        <article className="creator-species-card">
          <span className="creator-admin-kicker">🌍 NATURAL HISTORY</span>
          <h3>Where & how it lives</h3>
          <dl>
            <div><dt>Distribution</dt><dd>{species.knowledge.distribution ?? "Not yet published"}</dd></div>
            <div><dt>Habitat</dt><dd>{species.knowledge.habitat ?? "Not yet published"}</dd></div>
            <div><dt>Activity</dt><dd>{species.knowledge.activityPattern ?? "Not yet published"}</dd></div>
            <div><dt>Lifestyle</dt><dd>{listText(species.knowledge.lifestyle)}</dd></div>
          </dl>
        </article>

        <article className="creator-species-card">
          <span className="creator-admin-kicker">🌡️ HUSBANDRY</span>
          <h3>Species-specific environment</h3>
          <dl>
            <div><dt>Evidence</dt><dd>{evidenceLabel(husbandry?.evidenceLevel)}</dd></div>
            <div><dt>Warm side</dt><dd>{rangeText(husbandry?.temperature?.warmSide)}</dd></div>
            <div><dt>Cool side</dt><dd>{rangeText(husbandry?.temperature?.coolSide)}</dd></div>
            <div><dt>Basking</dt><dd>{rangeText(husbandry?.temperature?.basking)}</dd></div>
            <div><dt>Humidity</dt><dd>{rangeText(husbandry?.humidity?.target ?? husbandry?.humidity?.acceptable)}</dd></div>
            <div><dt>Housing</dt><dd>{listText(husbandry?.enclosure?.habitatType)}</dd></div>
            <div><dt>Cohabitation</dt><dd>{husbandry?.cohabitation?.recommendation ?? "Not yet published"}</dd></div>
          </dl>
          {husbandry?.notes && <p className="creator-species-note">{husbandry.notes}</p>}
        </article>

        <article className="creator-species-card">
          <span className="creator-admin-kicker">🍽️ FEEDING</span>
          <h3>Species feeding context</h3>
          <dl>
            <div><dt>Evidence</dt><dd>{evidenceLabel(feeding?.evidenceLevel)}</dd></div>
            <div><dt>Dietary guild</dt><dd>{feeding?.dietaryGuild ?? "Not yet published"}</dd></div>
            <div><dt>Prey categories</dt><dd>{listText(feeding?.preyCategories)}</dd></div>
          </dl>
          {feeding?.notes && <p className="creator-species-note">{feeding.notes}</p>}
        </article>

        <article className="creator-species-card">
          <span className="creator-admin-kicker">🥚 BREEDING</span>
          <h3>Reproductive context</h3>
          <dl>
            <div><dt>Evidence</dt><dd>{evidenceLabel(breeding?.evidenceLevel)}</dd></div>
            <div><dt>Seasonal cycling</dt><dd>{breeding?.seasonalCycling ?? "Not yet published"}</dd></div>
            <div><dt>Notes</dt><dd>{breeding?.notes ?? "Not yet published"}</dd></div>
          </dl>
        </article>

        <article className="creator-species-card creator-species-safety-card">
          <span className="creator-admin-kicker">⚠️ SAFETY</span>
          <h3>Species safety layer</h3>
          <dl>
            <div><dt>Medically significant venom</dt><dd>{safety?.medicallySignificantVenom ? "Yes" : "No / not flagged"}</dd></div>
            <div><dt>Rear-fanged / venom delivery</dt><dd>{safety?.rearFangedOrVenomDelivery ? "Yes" : "No / not flagged"}</dd></div>
            <div><dt>Handling notes</dt><dd>{safety?.handlingNotes ?? "No specialist handling note published"}</dd></div>
          </dl>
        </article>
      </div>

      <div className="creator-species-source-strip">
        <div><strong>Source linkage</strong><span>{species.knowledge.sourceIds.join(" · ")}</span></div>
        <div><strong>Search aliases</strong><span>{species.searchAliases.join(" · ")}</span></div>
      </div>
    </div>
  );
}

export default function CreatorSpeciesPreview() {
  const [selectedId, setSelectedId] = useState(INITIAL_SNAKE_SPECIES[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const matchingSpecies = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return INITIAL_SNAKE_SPECIES;
    return INITIAL_SNAKE_SPECIES.filter((species) =>
      [species.id, species.acceptedScientificName, ...species.commonNames, ...species.searchAliases].some((value) => value.toLowerCase().includes(term))
    );
  }, [query]);

  const selected = INITIAL_SNAKE_SPECIES.find((species) => species.id === selectedId) ?? matchingSpecies[0] ?? INITIAL_SNAKE_SPECIES[0];
  const currentIndex = selected ? INITIAL_SNAKE_SPECIES.findIndex((species) => species.id === selected.id) : -1;

  function selectRelative(offset: number) {
    if (!INITIAL_SNAKE_SPECIES.length) return;
    const nextIndex = (currentIndex + offset + INITIAL_SNAKE_SPECIES.length) % INITIAL_SNAKE_SPECIES.length;
    setSelectedId(INITIAL_SNAKE_SPECIES[nextIndex].id);
  }

  return (
    <section className="creator-admin-section">
      <div className="creator-section-heading">
        <div>
          <Link className="creator-back-link" to="/creator">← Creator Centre</Link>
          <span className="creator-admin-kicker">SPECIES DATA QA</span>
          <h1>🐍 Species Preview Lab</h1>
          <p>Preview the same profile shell against every species currently in the registry. This is a mock-data inspector: it does not create or alter a real keeper snake.</p>
        </div>
      </div>

      <div className="creator-species-toolbar">
        <label>
          <span>Search registry</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Western, python, MBK, Crotalus…" />
        </label>
        <label>
          <span>Select species</span>
          <select value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
            {matchingSpecies.map((species) => <option key={species.id} value={species.id}>{species.commonNames[0]} — {species.acceptedScientificName}</option>)}
          </select>
        </label>
        <div className="creator-species-toolbar-actions">
          <button type="button" onClick={() => selectRelative(-1)} disabled={!selected}>← Previous</button>
          <button type="button" onClick={() => selectRelative(1)} disabled={!selected}>Next →</button>
        </div>
      </div>

      <div className="creator-species-test-hint">
        <strong>Pointer test:</strong> switch species and verify that the scientific name, taxonomy, risk class, lifestyle, husbandry fields, feeding context, breeding evidence and safety layer all change together. The preview reads directly from <code>INITIAL_SNAKE_SPECIES</code>; no duplicated mock values are used.
      </div>

      {selected ? <SpeciesPreview species={selected} /> : <div className="creator-loading">No species match the current search.</div>}
    </section>
  );
}
