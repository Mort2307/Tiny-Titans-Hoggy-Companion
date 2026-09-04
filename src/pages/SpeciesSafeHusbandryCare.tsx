import { useSpeciesContext } from "../context/SpeciesContext";
import { SPECIES_SOURCES } from "../data/species/speciesSources";
import HusbandryCare from "./HusbandryCare";
import "../styles/husbandry-care.css";

const LEGACY_HOGNOSE_ID = "heterodon-nasicus";

export default function SpeciesSafeHusbandryCare() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const knowledge = selectedSpecies?.knowledge;
  const husbandry = knowledge?.husbandry;
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "selected species";
  const sources = (knowledge?.sourceIds ?? []).map((id) => SPECIES_SOURCES[id]).filter(Boolean);

  if (selectedSpeciesId === LEGACY_HOGNOSE_ID) return <HusbandryCare />;

  return (
    <main className="page-container husbandry-page">
      <header className="husbandry-hero">
        <div><p className="husbandry-eyebrow">Tiny Titans · Species-Specific Care</p><h1>🌡️ {speciesName} Husbandry & Care</h1><p>Tiny Titans shows only husbandry evidence attached to the selected species. Missing fields stay missing rather than being filled with another species' values.</p></div>
        <div className="husbandry-badge">🧬 Species locked</div>
      </header>

      {!husbandry ? (
        <section className="husbandry-panel"><h2>Species-specific husbandry not mapped yet</h2><p>Tiny Titans has a species record for {speciesName}, but it does not currently have a sufficiently mapped husbandry profile. No temperature, humidity, enclosure, feeding or handling range from another species will be presented as a substitute.</p><div className="husbandry-callout check"><strong>What you will see here once reviewed:</strong> evidence-backed environmental ranges, enclosure guidance, substrate and ventilation notes, cohabitation guidance, feeding context and relevant safety boundaries.</div></section>
      ) : (
        <>
          <section className="husbandry-panel"><p className="husbandry-eyebrow">EVIDENCE LEVEL</p><h2>Reviewed {speciesName} husbandry</h2><div className="husbandry-stats husbandry-stats--five"><div><span>Evidence</span><strong>{husbandry.evidenceLevel}</strong></div><div><span>Risk class</span><strong>{knowledge?.riskClass ?? "unknown"}</strong></div><div><span>Activity</span><strong>{knowledge?.activityPattern ?? "unknown"}</strong></div><div><span>Lifestyle</span><strong>{knowledge?.lifestyle?.join(", ") || "unknown"}</strong></div><div><span>Reviewed</span><strong>{knowledge?.reviewedOn ?? "unknown"}</strong></div></div></section>

          {husbandry.temperature && <section className="husbandry-panel"><p className="husbandry-eyebrow">🌡️ TEMPERATURE</p><h2>Species-specific thermal guidance</h2><div className="husbandry-grid husbandry-grid--four">{husbandry.temperature.basking && <article className="husbandry-metric"><span>☀️ Basking</span><strong>{husbandry.temperature.basking.min}–{husbandry.temperature.basking.max} {husbandry.temperature.basking.unit}</strong><small>{husbandry.temperature.basking.context ?? "Recorded reference range"}</small></article>}{husbandry.temperature.warmSide && <article className="husbandry-metric"><span>🔥 Warm side</span><strong>{husbandry.temperature.warmSide.min}–{husbandry.temperature.warmSide.max} {husbandry.temperature.warmSide.unit}</strong><small>{husbandry.temperature.warmSide.context ?? "Recorded reference range"}</small></article>}{husbandry.temperature.coolSide && <article className="husbandry-metric"><span>❄️ Cool side</span><strong>{husbandry.temperature.coolSide.min}–{husbandry.temperature.coolSide.max} {husbandry.temperature.coolSide.unit}</strong><small>{husbandry.temperature.coolSide.context ?? "Recorded reference range"}</small></article>}{husbandry.temperature.night && <article className="husbandry-metric"><span>🌙 Night</span><strong>{husbandry.temperature.night.min}–{husbandry.temperature.night.max} {husbandry.temperature.night.unit}</strong><small>{husbandry.temperature.night.context ?? "Recorded reference range"}</small></article>}</div>{husbandry.temperature.seasonal && <p className="husbandry-muted"><strong>Seasonal context:</strong> {husbandry.temperature.seasonal}</p>}{husbandry.temperature.notes && <p>{husbandry.temperature.notes}</p>}</section>}

          {husbandry.humidity && <section className="husbandry-panel"><p className="husbandry-eyebrow">💧 HUMIDITY</p><h2>Species-specific humidity guidance</h2><div className="husbandry-grid husbandry-grid--four">{husbandry.humidity.target && <article className="husbandry-metric"><span>🎯 Target</span><strong>{husbandry.humidity.target.min}–{husbandry.humidity.target.max} {husbandry.humidity.target.unit}</strong><small>{husbandry.humidity.target.context ?? "Recorded target range"}</small></article>}{husbandry.humidity.acceptable && <article className="husbandry-metric"><span>✅ Acceptable</span><strong>{husbandry.humidity.acceptable.min}–{husbandry.humidity.acceptable.max} {husbandry.humidity.acceptable.unit}</strong><small>{husbandry.humidity.acceptable.context ?? "Recorded acceptable range"}</small></article>}</div>{husbandry.humidity.seasonal && <p className="husbandry-muted"><strong>Seasonal context:</strong> {husbandry.humidity.seasonal}</p>}{husbandry.humidity.notes && <p>{husbandry.humidity.notes}</p>}</section>}

          {husbandry.enclosure && <section className="husbandry-panel"><p className="husbandry-eyebrow">🏠 ENCLOSURE</p><h2>Species-appropriate enclosure context</h2><div className="husbandry-links">{husbandry.enclosure.habitatType?.length && <article className="husbandry-card"><strong>Habitat / lifestyle</strong><p>{husbandry.enclosure.habitatType.join(", ")}</p></article>}{husbandry.enclosure.substrate?.length && <article className="husbandry-card"><strong>Substrate</strong><p>{husbandry.enclosure.substrate.join(" · ")}</p></article>}{husbandry.enclosure.hides && <article className="husbandry-card"><strong>Hides</strong><p>{husbandry.enclosure.hides}</p></article>}{husbandry.enclosure.water && <article className="husbandry-card"><strong>Water</strong><p>{husbandry.enclosure.water}</p></article>}{husbandry.enclosure.ventilation && <article className="husbandry-card"><strong>Ventilation</strong><p>{husbandry.enclosure.ventilation}</p></article>}{husbandry.enclosure.lighting && <article className="husbandry-card"><strong>Lighting</strong><p>{husbandry.enclosure.lighting}</p></article>}{husbandry.enclosure.climbing !== undefined && <article className="husbandry-card"><strong>Climbing</strong><p>{husbandry.enclosure.climbing ? "Species profile indicates climbing provision." : "Species profile does not indicate a climbing requirement."}</p></article>}</div>{husbandry.enclosure.notes && <p>{husbandry.enclosure.notes}</p>}</section>}

          {husbandry.cohabitation && <section className="husbandry-panel"><p className="husbandry-eyebrow">🐍 COHABITATION</p><h2>{husbandry.cohabitation.recommendation}</h2><p>{husbandry.cohabitation.rationale}</p></section>}
        </>
      )}

      <section className="husbandry-panel"><p className="husbandry-eyebrow">SOURCE TRAIL</p><h2>Supporting references</h2>{sources.length > 0 ? <div className="husbandry-sources">{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><span>{source.publisher} · {source.evidenceLevel} evidence · accessed {source.accessedOn}</span></a>)}</div> : <p className="husbandry-muted">No mapped source trail is attached yet.</p>}</section>
    </main>
  );
}
