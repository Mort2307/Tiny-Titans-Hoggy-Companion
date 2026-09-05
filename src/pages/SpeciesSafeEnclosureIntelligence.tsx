import { useSpeciesContext } from "../context/SpeciesContext";
import { SPECIES_SOURCES } from "../data/species/speciesSources";
import { getSpeciesEvidenceSummary } from "../data/species/speciesEvidence";
import { isSpeciesGeneticsMapped } from "../data/species/speciesGenetics";
import SpeciesSourceHealthPanel from "../components/SpeciesSourceHealthPanel";
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

  if (!selectedSpecies) {
    return <main className="page-container husbandry-page"><section className="husbandry-panel"><h1>🏠 Enclosure Intelligence</h1><p>No species is currently selected.</p></section></main>;
  }

  const evidenceSummary = getSpeciesEvidenceSummary(selectedSpecies);
  const thermal = husbandry?.temperature;
  const humidity = husbandry?.humidity;
  const referenceEnabled = evidenceSummary.numericRanges > 0 && evidenceSummary.verifiedRanges > 0;

  return (
    <main className="page-container husbandry-page">
      <section className="husbandry-hero">
        <div>
          <p className="husbandry-eyebrow">Tiny Titans Species Intelligence</p>
          <h1>🏠 Enclosure Intelligence · {speciesName}</h1>
          <p>{referenceEnabled ? `The species-safe reference engine is enabled for ${speciesName}. Environmental guidance shown here is drawn from the species' reviewed evidence scope rather than a generic snake baseline.` : `Tiny Titans has not yet enabled numeric enclosure reference checking for ${speciesName}. We will not borrow another species' temperature or humidity thresholds.`}</p>
        </div>
        <div className="husbandry-badge">{referenceEnabled ? "🟢 Species reference enabled" : "🟠 Species-safe mode"}</div>
      </section>

      <section className="husbandry-panel">
        <h2>Reference data boundary</h2>
        <p>{referenceEnabled ? "Tiny Titans can show species-scoped reference values, but every range remains attached to its evidence basis and caveat. Personal enclosure readings are never silently treated as healthy simply because they fall inside a generic range." : `Temperature, humidity, lighting, substrate and enclosure recommendations are species-dependent. Until ${speciesName} has a reviewed husbandry profile, Tiny Titans deliberately withholds numeric environmental comparisons rather than presenting Hognose or generic reptile values as though they apply here.`}</p>
        <div className="husbandry-callout check"><strong>Safety boundary:</strong> this page will not label readings “good”, “bad” or “within reference” without an evidence-backed {speciesName} reference profile.</div>
      </section>

      <section className="husbandry-panel">
        <p className="husbandry-eyebrow">SPECIES PROFILE</p>
        <h2>{speciesName}</h2>
        <p>{selectedSpecies.knowledge.summary}</p>
        <div className="husbandry-stats husbandry-stats--five">
          <div><span>Scientific name</span><strong><em>{selectedSpecies.acceptedScientificName}</em></strong></div>
          <div><span>Risk class</span><strong>{selectedSpecies.knowledge.riskClass}</strong></div>
          <div><span>Genetics</span><strong>{geneticsMapped ? "Mapped" : "Not mapped"}</strong></div>
          <div><span>Husbandry</span><strong>{referenceEnabled ? "Reviewed reference enabled" : husbandry ? "Profile exists; reference pending" : "Not mapped"}</strong></div>
          <div><span>Reviewed</span><strong>{selectedSpecies.knowledge.reviewedOn}</strong></div>
        </div>
      </section>

      {referenceEnabled && (
        <section className="husbandry-panel">
          <p className="husbandry-eyebrow">🌡️ VERIFIED SPECIES REFERENCE</p>
          <h2>Environmental reference values</h2>
          <div className="husbandry-grid husbandry-grid--four">
            {thermal?.basking && <article className="husbandry-metric"><span>☀️ Basking / warm surface</span><strong>{thermal.basking.min}–{thermal.basking.max} {thermal.basking.unit}</strong><small>{thermal.basking.context}</small></article>}
            {thermal?.warmSide && <article className="husbandry-metric"><span>🔥 Warm side</span><strong>{thermal.warmSide.min}–{thermal.warmSide.max} {thermal.warmSide.unit}</strong><small>{thermal.warmSide.context}</small></article>}
            {thermal?.coolSide && <article className="husbandry-metric"><span>❄️ Cool side</span><strong>{thermal.coolSide.min}–{thermal.coolSide.max} {thermal.coolSide.unit}</strong><small>{thermal.coolSide.context}</small></article>}
            {thermal?.night && <article className="husbandry-metric"><span>🌙 Night</span><strong>{thermal.night.min}–{thermal.night.max} {thermal.night.unit}</strong><small>{thermal.night.context}</small></article>}
            {humidity?.target && <article className="husbandry-metric"><span>💧 Humidity target</span><strong>{humidity.target.min}–{humidity.target.max} {humidity.target.unit}</strong><small>{humidity.target.context}</small></article>}
          </div>
          {husbandry?.enclosure && <div className="husbandry-links" style={{ marginTop: 12 }}>
            {husbandry.enclosure.water && <article className="husbandry-card"><strong>💦 Water system</strong><p>{husbandry.enclosure.water}</p></article>}
            {husbandry.enclosure.hides && <article className="husbandry-card"><strong>🪵 Retreats</strong><p>{husbandry.enclosure.hides}</p></article>}
            {husbandry.enclosure.ventilation && <article className="husbandry-card"><strong>🌬️ Ventilation</strong><p>{husbandry.enclosure.ventilation}</p></article>}
            {husbandry.enclosure.notes && <article className="husbandry-card"><strong>🏗️ Enclosure planning</strong><p>{husbandry.enclosure.notes}</p></article>}
          </div>}
        </section>
      )}

      <section className="husbandry-panel">
        <p className="husbandry-eyebrow">SOURCE TRAIL</p>
        <h2>Source-backed before recommendation-backed</h2>
        <p>The species record needs suitable husbandry source material before care thresholds are enabled. Taxonomy is not treated as husbandry evidence.</p>
        {sources.length > 0 ? <div className="husbandry-sources">{sources.map((source) => <a key={source.id} href={source.url === "#" ? undefined : source.url} target={source.url === "#" ? undefined : "_blank"} rel="noreferrer" aria-disabled={source.url === "#"}><strong>{source.title}</strong><span>{source.publisher} · {source.evidenceLevel} evidence · accessed {source.accessedOn}</span>{source.notes && <small>{source.notes}</small>}</a>)}</div> : <p className="husbandry-muted">No mapped source trail is currently attached to this species record.</p>}
      </section>

      <SpeciesSourceHealthPanel species={selectedSpecies} />
    </main>
  );
}
