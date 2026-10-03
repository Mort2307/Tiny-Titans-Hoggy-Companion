import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useSpeciesContext } from "../context/SpeciesContext";
import { UNIVERSAL_SPECIES, UNIVERSAL_SPECIES_BY_ID } from "../data/species/universalSpeciesRegistry";
import { HUSBANDRY_SAFETY_SOURCES } from "../data/husbandrySafetySources";
import { resolveHusbandrySafetyAssessment, searchHusbandrySafetyItems } from "../lib/husbandrySafety";
import { getHusbandrySafetyLibrary } from "../services/husbandrySafetyService";
import type {
  HusbandrySafetyCategory,
  HusbandrySafetyItem,
  HusbandrySafetyRegion,
  HusbandrySafetyStatus,
} from "../types/husbandrySafety";
import "../styles/husbandry-safety.css";

const STATUS_META: Record<HusbandrySafetyStatus, { label: string; icon: string; description: string }> = {
  safe: { label: "Safe to use", icon: "✓", description: "Suitable when correctly identified, sourced and prepared." },
  caution: { label: "Use with caution", icon: "!", description: "Conditions, evidence gaps or preparation requirements need attention." },
  avoid: { label: "Avoid", icon: "×", description: "A recognised hazard or unnecessary uncertainty makes a safer alternative preferable." },
  unknown: { label: "Unknown", icon: "?", description: "Tiny Titans does not yet have enough evidence for this species." },
};

const REGION_LABELS: Record<HusbandrySafetyRegion | "all", string> = {
  all: "All regions",
  uk: "United Kingdom",
  us: "United States",
  europe: "Europe",
  "north-america": "North America",
  global: "Global",
};

const CATEGORY_LABELS: Partial<Record<HusbandrySafetyCategory, string>> = {
  "leaf-litter": "Leaves & leaf litter",
  "wood-branches": "Wood & branches",
  bark: "Bark",
  "live-plants": "Live plants",
  "dried-plants": "Dried plants",
  moss: "Moss",
  substrate: "Substrate",
  soil: "Soil",
  sand: "Sand",
  "rock-stone": "Rocks & stones",
  decor: "Décor",
  "artificial-plants": "Artificial plants",
  adhesive: "Adhesives",
  sealant: "Sealants",
  "paint-coating": "Paints & coatings",
  "cleaner-disinfectant": "Cleaners & disinfectants",
  "water-treatment": "Water treatments",
  "heating-material": "Heating materials",
  "lighting-material": "Lighting materials",
  "feeding-accessory": "Feeding accessories",
  "feeder-product": "Feeder products",
  "household-material": "Household materials",
  other: "Other",
};

function statusFor(item: HusbandrySafetyItem, speciesId: string): HusbandrySafetyStatus {
  const species = UNIVERSAL_SPECIES_BY_ID[speciesId];
  return resolveHusbandrySafetyAssessment(item, species)?.status ?? "unknown";
}

function prettyCategory(category: HusbandrySafetyCategory): string {
  return CATEGORY_LABELS[category] ?? category.replace(/-/g, " ");
}

export default function HusbandrySafetyLibrary() {
  const { selectedSpeciesId } = useSpeciesContext();
  const [params, setParams] = useSearchParams();
  const requestedSpecies = params.get("species") ?? "";
  const initialSpecies = UNIVERSAL_SPECIES_BY_ID[requestedSpecies]
    ? requestedSpecies
    : UNIVERSAL_SPECIES_BY_ID[selectedSpeciesId]
      ? selectedSpeciesId
      : "heterodon-nasicus";

  const [speciesId, setSpeciesId] = useState(initialSpecies);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [region, setRegion] = useState<HusbandrySafetyRegion | "all">("all");
  const [status, setStatus] = useState<HusbandrySafetyStatus | "all">("all");
  const [category, setCategory] = useState<HusbandrySafetyCategory | "all">("all");
  const [items, setItems] = useState<HusbandrySafetyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getHusbandrySafetyLibrary()
      .then((next) => { if (active) setItems(next); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (speciesId) next.set("species", speciesId);
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [params, query, setParams, speciesId]);

  const species = UNIVERSAL_SPECIES_BY_ID[speciesId];
  const results = useMemo(() => {
    return searchHusbandrySafetyItems(items, query).filter((item) => {
      if (region !== "all" && !item.regions.includes(region) && !item.regions.includes("global")) return false;
      if (category !== "all" && item.category !== category) return false;
      if (status !== "all" && statusFor(item, speciesId) !== status) return false;
      return true;
    });
  }, [category, items, query, region, speciesId, status]);

  const counts = useMemo(() => {
    const base = { safe: 0, caution: 0, avoid: 0, unknown: 0 };
    for (const item of items) base[statusFor(item, speciesId)] += 1;
    return base;
  }, [items, speciesId]);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))].sort(),
    [items],
  );

  return (
    <main className="page-container husbandry-safety-page">
      <nav className="husbandry-safety-journey" aria-label="Husbandry safety navigation">
        <Link to="/husbandry"><TinyTitansIcon name="back" size={16} /> Husbandry &amp; Care</Link>
        <span>Husbandry Safety Library</span>
      </nav>

      <header className="husbandry-safety-hero">
        <div>
          <p className="husbandry-safety-eyebrow">TINY TITANS · HUSBANDRY SAFETY</p>
          <h1><TinyTitansIcon name="check" size={29} /> Can I use this?</h1>
          <p>Search enclosure materials against the selected species. Tiny Titans keeps evidence strength visible and never turns “unknown” into “safe” by assumption.</p>
        </div>
        <div className="husbandry-safety-hero-badge">Evidence-led · species-aware</div>
      </header>

      <section className="husbandry-safety-search-panel">
        <label className="husbandry-safety-search">
          <span>Search a material</span>
          <div><TinyTitansIcon name="search" size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Oak leaves, yew, silicone, substrate…" autoComplete="off" /></div>
        </label>
        <label>
          <span>Animal</span>
          <select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>
            {UNIVERSAL_SPECIES.map((entry) => <option key={entry.id} value={entry.id}>{entry.commonNames[0] ?? entry.acceptedScientificName} · {entry.acceptedScientificName}</option>)}
          </select>
        </label>
        <label>
          <span>Region</span>
          <select value={region} onChange={(event) => setRegion(event.target.value as HusbandrySafetyRegion | "all")}>
            {Object.entries(REGION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as HusbandrySafetyCategory | "all")}>
            <option value="all">All categories</option>
            {categories.map((value) => <option key={value} value={value}>{prettyCategory(value)}</option>)}
          </select>
        </label>
      </section>

      <section className="husbandry-safety-status-grid" aria-label="Safety filters">
        {(Object.keys(STATUS_META) as HusbandrySafetyStatus[]).map((value) => (
          <button key={value} type="button" className={`husbandry-safety-status-card husbandry-safety-status-card--${value} ${status === value ? "is-active" : ""}`} onClick={() => setStatus(status === value ? "all" : value)}>
            <span className="husbandry-safety-status-icon">{STATUS_META[value].icon}</span>
            <strong>{STATUS_META[value].label}</strong>
            <b>{counts[value]}</b>
            <small>{STATUS_META[value].description}</small>
          </button>
        ))}
      </section>

      <section className="husbandry-safety-context">
        <div><span>Current species</span><strong>{species?.commonNames[0] ?? "Unknown species"}</strong><small>{species?.acceptedScientificName ?? speciesId}</small></div>
        <div><span>Results</span><strong>{results.length}</strong><small>{status === "all" ? "all safety states" : STATUS_META[status].label.toLowerCase()}</small></div>
        <p><TinyTitansIcon name="info" size={17} /> “Safe” means suitable within the cited husbandry evidence and stated preparation conditions. It does not mean the material has been experimentally proven harmless under every possible exposure.</p>
      </section>

      {loading ? (
        <section className="husbandry-safety-empty">Loading the safety library…</section>
      ) : results.length === 0 ? (
        <section className="husbandry-safety-empty"><TinyTitansIcon name="search" size={28} /><h2>No matching material</h2><p>Try another name, alias, region or safety filter.</p></section>
      ) : (
        <section className="husbandry-safety-results" aria-label="Husbandry safety results">
          {results.map((item) => {
            const assessment = resolveHusbandrySafetyAssessment(item, species);
            const resolvedStatus = assessment?.status ?? "unknown";
            const sourceRecords = (assessment?.sourceIds ?? []).map((id) => HUSBANDRY_SAFETY_SOURCES[id]).filter(Boolean);
            return (
              <article key={item.id} className={`husbandry-safety-result husbandry-safety-result--${resolvedStatus}`}>
                <div className="husbandry-safety-result-head">
                  <div className={`husbandry-safety-pill husbandry-safety-pill--${resolvedStatus}`}><span>{STATUS_META[resolvedStatus].icon}</span>{STATUS_META[resolvedStatus].label}</div>
                  <span className="husbandry-safety-category">{prettyCategory(item.category)}</span>
                </div>
                <h2>{item.commonName}</h2>
                {item.scientificName && <p className="husbandry-safety-scientific"><em>{item.scientificName}</em></p>}
                <p>{assessment?.reason ?? `No species-specific safety assessment has been reviewed for ${species?.commonNames[0] ?? "this species"} yet.`}</p>

                {item.identificationWarning && <div className="husbandry-safety-identification"><TinyTitansIcon name="warning" size={18} /><div><strong>Identification matters</strong><p>{item.identificationWarning}</p></div></div>}

                <div className="husbandry-safety-meta">
                  <span>Evidence <strong>{assessment?.evidenceLevel ?? "unknown"}</strong></span>
                  <span>Reviewed <strong>{assessment?.reviewedOn ?? "not yet"}</strong></span>
                  <span>Regions <strong>{item.regions.map((value) => REGION_LABELS[value]).join(" · ")}</strong></span>
                </div>

                <details>
                  <summary>Why, risks, preparation &amp; evidence <TinyTitansIcon name="forward" size={14} /></summary>
                  <div className="husbandry-safety-detail-grid">
                    <section><h3>Risks</h3>{assessment?.risks.length ? <ul>{assessment.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul> : <p>No specific risks are encoded beyond the evidence boundary.</p>}</section>
                    <section><h3>Preparation</h3>{assessment?.preparation.length ? <ol>{assessment.preparation.map((step) => <li key={step}>{step}</li>)}</ol> : <p>No preparation workflow is encoded for this assessment.</p>}</section>
                    <section><h3>Safer alternatives</h3>{assessment?.alternatives.length ? <ul>{assessment.alternatives.map((alternative) => <li key={alternative}>{alternative}</li>)}</ul> : <p>No alternative is required or currently encoded.</p>}</section>
                    <section><h3>Evidence boundary</h3><p>{assessment?.evidenceNote ?? "This item has not yet completed a species-specific evidence review."}</p></section>
                  </div>
                  {sourceRecords.length > 0 && <div className="husbandry-safety-sources">{sourceRecords.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><span>{source.publisher} · {source.kind.replace(/-/g, " ")}</span><small>{source.note}</small></a>)}</div>}
                </details>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
