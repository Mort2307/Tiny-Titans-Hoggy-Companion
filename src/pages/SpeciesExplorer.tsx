import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import {
  UNIVERSAL_SPECIES,
  UNIVERSAL_SPECIES_BROWSE_GROUPS,
  searchUniversalSpecies,
  searchUniversalSpeciesInBrowseGroup,
} from "../data/species/universalSpeciesRegistry";
import type { UniversalSpeciesBrowseGroup, UniversalSpeciesClass, UniversalSpeciesRisk } from "../data/species/universalSpeciesTypes";
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

const BROWSE_LABELS: Record<UniversalSpeciesBrowseGroup, string> = Object.fromEntries(
  UNIVERSAL_SPECIES_BROWSE_GROUPS.map((group) => [group.id, group.label]),
) as Record<UniversalSpeciesBrowseGroup, string>;

function isBrowseGroup(value: string | undefined): value is UniversalSpeciesBrowseGroup {
  return Boolean(value && Object.prototype.hasOwnProperty.call(BROWSE_LABELS, value));
}

export default function SpeciesExplorer() {
  const { group } = useParams<{ group?: string }>();
  const activeGroup = isBrowseGroup(group) ? group : null;
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<UniversalSpeciesClass | "all">("all");
  const [riskFilter, setRiskFilter] = useState<UniversalSpeciesRisk | "all">("all");
  const [showOnlyResearchQueue, setShowOnlyResearchQueue] = useState(false);

  const results = useMemo(() => {
    const source = activeGroup
      ? query.trim()
        ? searchUniversalSpeciesInBrowseGroup(activeGroup, query)
        : UNIVERSAL_SPECIES_BROWSE_GROUPS.find((item) => item.id === activeGroup)?.species ?? []
      : query.trim()
        ? searchUniversalSpecies(query)
        : [];
    return source.filter((species) => {
      if (classFilter !== "all" && species.className !== classFilter) return false;
      if (riskFilter !== "all" && species.riskClass !== riskFilter) return false;
      if (showOnlyResearchQueue && !["class", "ecology-only", "not-verified"].includes(species.care?.husbandry.coverage ?? "not-verified")) return false;
      return true;
    });
  }, [activeGroup, classFilter, query, riskFilter, showOnlyResearchQueue]);

  const groupView = activeGroup !== null;
  return (
    <main className="page-container species-explorer-page">
      <header className="species-explorer-hero">
        <div>
          <span className="eyebrow">TINY TITANS · SPECIES INTELLIGENCE</span>
          <h1><TinyTitansIcon name="animals" size={28} /> {groupView ? BROWSE_LABELS[activeGroup] : "Species Explorer"}</h1>
          <p>
            Browse the canonical species catalogue by the animal people actually look for — snakes, lizards, turtles and tortoises, frogs and toads, salamanders and newts, spiders, scorpions, insects, mammals, birds, fish and more.
            Each species is separate from the individual animals recorded in your collection.
          </p>
        </div>
        <div className="species-explorer-stat">
          <strong>{groupView ? results.length.toLocaleString() : UNIVERSAL_SPECIES.length.toLocaleString()}</strong>
          <span>{groupView ? "species in this group" : "catalogued species records"}</span>
        </div>
      </header>

      {!groupView && (
        <section className="species-browse-groups" aria-label="Browse animals by type">
          <div className="species-browse-groups__heading">
            <div><p className="eyebrow">BROWSE BY ANIMAL TYPE</p><h2>Choose what you keep</h2></div>
            <Link to="/animals">My Animals →</Link>
          </div>
          <div className="species-browse-groups__grid">
            {UNIVERSAL_SPECIES_BROWSE_GROUPS.map((item) => (
              <Link className="species-browse-group-card" to={"/species/group/" + item.id} key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.count.toLocaleString()} species</span>
                <b>Open →</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="species-explorer-toolbar" aria-label="Species filters">
        <label className="species-explorer-search">
          <span>{groupView ? "Search " + BROWSE_LABELS[activeGroup] : "Search the whole catalogue"}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Common name, scientific name, family, genus or alias…" autoComplete="off" spellCheck={false} />
        </label>
        {groupView && (
          <div className="species-explorer-filter-row">
            <label><span>Animal class</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value as UniversalSpeciesClass | "all")}>{CLASS_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}</select></label>
            <label><span>Risk class</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as UniversalSpeciesRisk | "all")}>{RISK_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}</select></label>
            <label className="species-explorer-toggle"><input type="checkbox" checked={showOnlyResearchQueue} onChange={(event) => setShowOnlyResearchQueue(event.target.checked)} /><span>Research queue only</span></label>
          </div>
        )}
      </section>

      {groupView ? (
        <>
          <section className="species-explorer-summary">
            <div><strong>{results.length.toLocaleString()}</strong><span>species</span></div>
            <div><strong>{new Set(results.map((species) => species.genus)).size}</strong><span>genera</span></div>
            <div><strong>{results.filter((species) => ["class", "ecology-only", "not-verified"].includes(species.care?.husbandry.coverage ?? "not-verified")).length}</strong><span>care research pending</span></div>
            <p>Open a species for its evidence status, care coverage, health information and acquisition checks.</p>
          </section>
          <section className="species-explorer-grid" aria-label={BROWSE_LABELS[activeGroup] + " species"}>
            {results.length > 0 ? results.map((species) => (
              <article key={species.id} className="species-explorer-card">
                <Link className="species-explorer-card-link" to={"/species/" + species.id}>
                  <div className="species-explorer-card__top"><span className={"species-risk species-risk--" + species.riskClass}>{species.riskClass.replace("-", " ")}</span><span className="species-evidence">{species.evidenceStatus.replace("-", " ")}</span></div>
                  <h2>{species.commonNames[0] ?? species.acceptedScientificName}</h2>
                  <p className="species-scientific">{species.acceptedScientificName}</p>
                  <dl><div><dt>Genus</dt><dd>{species.genus}</dd></div><div><dt>Family</dt><dd>{species.family}</dd></div><div><dt>Lifestyle</dt><dd>{species.lifestyle.join(" · ")}</dd></div><div><dt>Diet</dt><dd>{species.dietaryGuild.replace("-", " ")}</dd></div></dl>
                  <div className="species-explorer-card__footer"><span>{species.care?.husbandry.coverage === "species" ? "Species care verified" : species.care?.husbandry.coverage === "genus" ? "Genus care verified" : "Care research pending"}</span><span>Open profile →</span></div>
                </Link>
              </article>
            )) : <div className="species-explorer-empty"><TinyTitansIcon name="titan" size={30} /><h2>No species matched</h2><p>Try another name, genus, family or search term.</p></div>}
          </section>
        </>
      ) : (
        <section className="species-explorer-summary species-explorer-summary--search">
          <strong>Search across {UNIVERSAL_SPECIES.length.toLocaleString()} species</strong>
          <span>or choose an animal type above to open its complete species list.</span>
          {query.trim() && <span>{searchUniversalSpecies(query).length.toLocaleString()} matches for “{query.trim()}”</span>}
        </section>
      )}
    </main>
  );
}
