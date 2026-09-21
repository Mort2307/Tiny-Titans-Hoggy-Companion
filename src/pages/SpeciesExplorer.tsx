import { useMemo, useState } from "react";
import TinyTitansIcon from "../components/TinyTitansIcon";
import {
  UNIVERSAL_SPECIES,
  UNIVERSAL_SPECIES_GROUPS,
  searchUniversalSpecies,
} from "../data/species/universalSpeciesRegistry";
import type { UniversalSpeciesClass, UniversalSpeciesRisk } from "../data/species/universalSpeciesTypes";
import "../styles/species-explorer.css";

const CLASS_FILTERS: Array<{ id: UniversalSpeciesClass | "all"; label: string }> = [
  { id: "all", label: "Everything" },
  { id: "reptile", label: "Reptiles" },
  { id: "amphibian", label: "Amphibians" },
  { id: "arachnid", label: "Arachnids" },
  { id: "insect", label: "Insects" },
  { id: "myriapod", label: "Myriapods" },
  { id: "mollusc", label: "Molluscs" },
  { id: "crustacean", label: "Crustaceans" },
  { id: "mammal", label: "Mammals" },
  { id: "bird", label: "Birds" },
  { id: "fish", label: "Fish" },
  { id: "cephalopod", label: "Cephalopods" },
];

const RISK_FILTERS: Array<{ id: UniversalSpeciesRisk | "all"; label: string }> = [
  { id: "all", label: "All risk classes" },
  { id: "companion", label: "Companion" },
  { id: "specialist", label: "Specialist" },
  { id: "toxic", label: "Toxic / defensive" },
  { id: "venomous", label: "Venomous" },
  { id: "high-risk", label: "High-risk" },
];

export default function SpeciesExplorer() {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<UniversalSpeciesClass | "all">("all");
  const [riskFilter, setRiskFilter] = useState<UniversalSpeciesRisk | "all">("all");
  const [showOnlyResearchQueue, setShowOnlyResearchQueue] = useState(false);

  const results = useMemo(() => {
    const source = query.trim() ? searchUniversalSpecies(query) : UNIVERSAL_SPECIES;
    return source.filter((species) => {
      if (classFilter !== "all" && species.className !== classFilter) return false;
      if (riskFilter !== "all" && species.riskClass !== riskFilter) return false;
      if (showOnlyResearchQueue && species.husbandryStatus !== "taxonomy-only") return false;
      return true;
    });
  }, [classFilter, query, riskFilter, showOnlyResearchQueue]);

  return (
    <main className="page-container species-explorer-page">
      <header className="species-explorer-hero">
        <div>
          <span className="eyebrow">TINY TITANS · SPECIES INTELLIGENCE</span>
          <h1><TinyTitansIcon name="reptile" size={28} /> Species Explorer</h1>
          <p>
            A universal animal catalogue for snakes, lizards, turtles, amphibians, arachnids, insects and wider exotic animals.
            Taxonomy can land before keeper-facing husbandry so Tiny Titans never invents a care number just to fill a field.
          </p>
        </div>
        <div className="species-explorer-stat">
          <strong>{UNIVERSAL_SPECIES.length.toLocaleString()}</strong>
          <span>catalogued species records</span>
        </div>
      </header>

      <section className="species-explorer-toolbar" aria-label="Species filters">
        <label className="species-explorer-search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Common name, scientific name, family or alias…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="species-explorer-filter-row">
          <label>
            <span>Animal group</span>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value as UniversalSpeciesClass | "all")}>
              {CLASS_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            <span>Risk class</span>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as UniversalSpeciesRisk | "all")}>
              {RISK_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
            </select>
          </label>
          <label className="species-explorer-toggle">
            <input type="checkbox" checked={showOnlyResearchQueue} onChange={(event) => setShowOnlyResearchQueue(event.target.checked)} />
            <span>Research queue only</span>
          </label>
        </div>
      </section>

      <section className="species-explorer-summary">
        <div>
          <strong>{results.length.toLocaleString()}</strong>
          <span>results</span>
        </div>
        <div>
          <strong>{UNIVERSAL_SPECIES_GROUPS.length}</strong>
          <span>animal groups</span>
        </div>
        <div>
          <strong>{results.filter((species) => species.husbandryStatus === "taxonomy-only").length}</strong>
          <span>taxonomy-first records</span>
        </div>
        <p>New expansion records are deliberately marked research-needed until species-specific husbandry evidence is attached.</p>
      </section>

      <section className="species-explorer-grid" aria-label="Species results">
        {results.length > 0 ? results.map((species) => (
          <article key={species.id} className="species-explorer-card">
            <div className="species-explorer-card__top">
              <span className={`species-risk species-risk--${species.riskClass}`}>{species.riskClass.replace("-", " ")}</span>
              <span className="species-evidence">{species.evidenceStatus.replace("-", " ")}</span>
            </div>
            <h2>{species.commonNames[0] ?? species.acceptedScientificName}</h2>
            <p className="species-scientific">{species.acceptedScientificName}</p>
            <dl>
              <div><dt>Group</dt><dd>{CLASS_FILTERS.find((item) => item.id === species.className)?.label ?? species.className}</dd></div>
              <div><dt>Family</dt><dd>{species.family}</dd></div>
              <div><dt>Order</dt><dd>{species.order}</dd></div>
              <div><dt>Lifestyle</dt><dd>{species.lifestyle.join(" · ")}</dd></div>
              <div><dt>Diet</dt><dd>{species.dietaryGuild.replace("-", " ")}</dd></div>
            </dl>
            <div className="species-explorer-card__footer">
              <span>{species.husbandryStatus.replace("-", " ")}</span>
              <span>Reviewed {species.reviewedOn}</span>
            </div>
          </article>
        )) : (
          <div className="species-explorer-empty">
            <TinyTitansIcon name="titan" size={30} />
            <h2>No species matched</h2>
            <p>Try a different common name, scientific name, family or taxonomic group.</p>
          </div>
        )}
      </section>
    </main>
  );
}
