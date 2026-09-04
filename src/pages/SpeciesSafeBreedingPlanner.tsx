import { useSpeciesContext } from "../context/SpeciesContext";
import { SPECIES_SOURCES } from "../data/species/speciesSources";
import { isSpeciesGeneticsMapped } from "../data/species/speciesGenetics";
import BreedingPlanner from "./BreedingPlanner";
import "./BreedingPlanner.css";

const LEGACY_HOGNOSE_ID = "heterodon-nasicus";

export default function SpeciesSafeBreedingPlanner() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const knowledge = selectedSpecies?.knowledge;
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "selected species";
  const breeding = knowledge?.breeding;
  const geneticsMapped = isSpeciesGeneticsMapped(selectedSpeciesId);
  const sources = (knowledge?.sourceIds ?? []).map((id) => SPECIES_SOURCES[id]).filter(Boolean);

  if (selectedSpeciesId === LEGACY_HOGNOSE_ID) return <BreedingPlanner />;

  return (
    <main className="page-container breeding-page">
      <header className="breeding-hero"><div><p className="breeding-eyebrow">Tiny Titans · Species-Specific Breeding</p><h1>🥚 {speciesName} Breeding Planner</h1><p>The breeding engine stays species-locked. Tiny Titans will not use the Western Hognose genetics engine or breeding assumptions for another species.</p></div><div className="breeding-callout"><strong>Species-safe mode</strong><div>{geneticsMapped ? "Genetics catalogue mapped" : "Genetics catalogue pending"}</div></div></header>

      {!breeding ? <section className="breeding-card"><h2>Breeding profile not mapped yet</h2><p>Tiny Titans has not yet attached reviewed species-specific breeding guidance to {speciesName}. The planner therefore withholds breeding recommendations and genetic forecasts rather than inventing or borrowing another species' rules.</p></section> : <section className="breeding-card"><p className="breeding-eyebrow">SPECIES BREEDING PROFILE · {breeding.evidenceLevel.toUpperCase()}</p><h2>{speciesName}</h2>{breeding.notes && <p>{breeding.notes}</p>}{breeding.seasonalCycling && <div className="breeding-card"><strong>Seasonal cycling</strong><p>{breeding.seasonalCycling}</p></div>}</section>}

      <section className="breeding-card"><h2>What remains disabled</h2><p>Cross-species parent pairing, inherited genetics forecasting and species-specific breeding recommendations remain disabled until the relevant catalogue and evidence are mapped.</p><div className="breeding-callout"><strong>Never use a missing record as a Wild Type / normal assumption.</strong><div>Unknown genetics stay unknown.</div></div></section>

      <section className="breeding-card"><p className="breeding-eyebrow">SOURCE TRAIL</p><h2>Supporting references</h2>{sources.length ? sources.map((source) => <a key={source.id} className="breeding-card" href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><span>{source.publisher} · {source.evidenceLevel} evidence · accessed {source.accessedOn}</span></a>) : <p>No mapped source trail is attached yet.</p>}</section>
    </main>
  );
}
