import { useSpeciesContext } from "../context/SpeciesContext";
import { SPECIES_SOURCES } from "../data/species/speciesSources";
import { isSpeciesGeneticsMapped } from "../data/species/speciesGenetics";
import EnclosureIntelligence from "./EnclosureIntelligence";
import "../styles/husbandry-care.css";

const LEGACY_HUSBANDRY_SPECIES_ID = "heterodon-nasicus";

export default function SpeciesSafeEnclosureIntelligence() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "selected species";
  const husbandry = selectedSpecies?.knowledge.husbandry;
  const sources = (selectedSpecies?.knowledge.sourceIds ?? []).map((id) => SPECIES_SOURCES[id]).filter(Boolean);
  const geneticsMapped = isSpeciesGeneticsMapped(selectedSpeciesId);

  if (selectedSpeciesId === LEGACY_HUSBANDRY_SPECIES_ID && husbandry) return <EnclosureIntelligence />;

  return (
    <main className="page-container husbandry-page">
      <section className="husbandry-hero">
        <div>
          <p className="husbandry-eyebrow">Tiny Titans Species Intelligence</p>
          <h1>🏠 Enclosure Intelligence · {speciesName}</h1>
          <p>Tiny Titans has not yet enabled the full enclosure reference engine for this species. We will not borrow another species' temperature or humidity thresholds.</p>
        </div>
        <div className="husbandry-badge">🟠 Species-safe mode</div>
      </section>

      <section className="husbandry-panel">
        <h2>Reference data boundary</h2>
        <p>Temperature, humidity, lighting, substrate and enclosure recommendations are species-dependent. Until {speciesName} has a reviewed husbandry profile, Tiny Titans deliberately withholds numeric environmental comparisons rather than presenting Hognose or generic reptile values as though they apply here.</p>
        <div className="husbandry-callout check"><strong>Safety boundary:</strong> this page will not label readings “good”, “bad” or “within reference” without an evidence-backed {speciesName} reference profile.</div>
      </section>

      {selectedSpecies?.knowledge.summary && <section className="husbandry-panel"><p className="husbandry-eyebrow">SPECIES PROFILE</p><h2>{speciesName}</h2><p>{selectedSpecies.knowledge.summary}</p><div className="husbandry-stats husbandry-stats--five"><div><span>Scientific name</span><strong><em>{selectedSpecies.acceptedScientificName}</em></strong></div><div><span>Risk class</span><strong>{selectedSpecies.knowledge.riskClass}</strong></div><div><span>Genetics</span><strong>{geneticsMapped ? "Mapped" : "Not mapped"}</strong></div><div><span>Husbandry</span><strong>{husbandry ? "Profile exists; engine pending" : "Not mapped"}</strong></div><div><span>Reviewed</span><strong>{selectedSpecies.knowledge.reviewedOn}</strong></div></div></section>}

      <section className="husbandry-panel">
        <p className="husbandry-eyebrow">SOURCE TRAIL</p>
        <h2>Source-backed before recommendation-backed</h2>
        <p>The species record needs suitable husbandry source material before care thresholds are enabled. Taxonomy is not treated as husbandry evidence.</p>
        {sources.length > 0 ? <div className="husbandry-sources">{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><span>{source.publisher} · {source.evidenceLevel} evidence · accessed {source.accessedOn}</span></a>)}</div> : <p className="husbandry-muted">No mapped source trail is currently attached to this species record.</p>}
      </section>
    </main>
  );
}
