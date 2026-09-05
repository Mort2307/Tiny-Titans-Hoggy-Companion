import { useSpeciesContext } from "../context/SpeciesContext";
import { SPECIES_SOURCES } from "../data/species/speciesSources";
import { getProfileEvidenceCoverage, getRangeEvidenceCoverage, getSpeciesEvidenceSummary } from "../data/species/speciesEvidence";
import type { EvidenceScope, SourcedNumericRange } from "../data/species/speciesTypes";
import type { ReactNode } from "react";
import HusbandryCare from "./HusbandryCare";
import "../styles/husbandry-care.css";

const LEGACY_HOGNOSE_ID = "heterodon-nasicus";

function prettyEvidenceBasis(basis: EvidenceScope["basis"]): string {
  return basis.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function EvidenceNote({ evidence }: { evidence?: EvidenceScope }): ReactNode {
  if (!evidence) return null;
  const sourceNames = evidence.sourceIds.map((id) => SPECIES_SOURCES[id]?.title).filter(Boolean);
  return (
    <div className="husbandry-evidence-note">
      <strong>Evidence basis: {prettyEvidenceBasis(evidence.basis)}</strong>
      <span>{evidence.scope}</span>
      <span>{evidence.caveat}</span>
      {sourceNames.length > 0 && <span>Sources: {sourceNames.join(" · ")}</span>}
    </div>
  );
}

function CoverageBadge({ status, detail }: { status: ReturnType<typeof getProfileEvidenceCoverage>["status"]; detail?: string }): ReactNode {
  const labels = {
    verified: "Verified evidence scope",
    "recorded-needs-scoping": "Recorded · scope needs mapping",
    "external-evidence-located": "Evidence located · mapping pending",
    "evidence-limited": "Evidence limited",
    "context-only": "Context only",
    unmapped: "Not yet mapped",
  } as const;
  return (
    <div className={`husbandry-coverage husbandry-coverage--${status}`}>
      <strong>{labels[status]}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}

function RangeCard({ label, range, species }: { label: string; range: SourcedNumericRange; species: NonNullable<ReturnType<typeof useSpeciesContext>["selectedSpecies"]> }): ReactNode {
  const coverage = getRangeEvidenceCoverage(range, species);
  return (
    <article className="husbandry-metric">
      <span>{label}</span>
      <strong>{range.min}–{range.max} {range.unit}</strong>
      <small>{range.context ?? "Recorded range"}</small>
      <CoverageBadge status={coverage.status} detail={coverage.detail} />
      <EvidenceNote evidence={range.evidence} />
    </article>
  );
}

export default function SpeciesSafeHusbandryCare() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const knowledge = selectedSpecies?.knowledge;
  const husbandry = knowledge?.husbandry;
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "selected species";

  if (selectedSpeciesId === LEGACY_HOGNOSE_ID) return <HusbandryCare />;
  if (!selectedSpecies) {
    return <main className="page-container husbandry-page"><section className="husbandry-panel"><h1>Species husbandry</h1><p>No species is currently selected.</p></section></main>;
  }

  const evidenceSummary = getSpeciesEvidenceSummary(selectedSpecies);
  const profileCoverage = evidenceSummary.profile;
  const sources = (knowledge.sourceIds ?? []).map((id) => SPECIES_SOURCES[id]).filter(Boolean);
  const hasTemperature = Boolean(husbandry?.temperature && Object.values(husbandry.temperature).some((value) => typeof value === "object"));
  const hasHumidity = Boolean(husbandry?.humidity && Object.values(husbandry.humidity).some((value) => typeof value === "object"));

  return (
    <main className="page-container husbandry-page">
      <header className="husbandry-hero">
        <div>
          <p className="husbandry-eyebrow">Tiny Titans · Evidence-led species care</p>
          <h1>🌡️ {speciesName} Husbandry & Care</h1>
          <p>Care information is separated by evidence scope. Tiny Titans distinguishes verified species guidance from recorded values awaiting source mapping, broader taxon guidance, ecology context and genuine evidence gaps.</p>
        </div>
        <div className="husbandry-badge">🧠 {profileCoverage.label}</div>
      </header>

      <section className="husbandry-panel">
        <p className="husbandry-eyebrow">SPECIES PROFILE</p>
        <h2>{speciesName}</h2>
        <div className="husbandry-stats husbandry-stats--five">
          <div><span>Evidence level</span><strong>{husbandry?.evidenceLevel ?? "profile-level"}</strong></div>
          <div><span>Risk class</span><strong>{knowledge.riskClass}</strong></div>
          <div><span>Activity</span><strong>{knowledge.activityPattern ?? "unknown"}</strong></div>
          <div><span>Lifestyle</span><strong>{knowledge.lifestyle?.join(", ") || "unknown"}</strong></div>
          <div><span>Reviewed</span><strong>{knowledge.reviewedOn}</strong></div>
        </div>
        <CoverageBadge status={profileCoverage.status} detail={profileCoverage.detail} />
        <p>{knowledge.summary}</p>
        <div className="husbandry-links">
          <article className="husbandry-card"><strong>🌍 Distribution</strong><p>{knowledge.distribution ?? "Not mapped yet."}</p></article>
          <article className="husbandry-card"><strong>🌿 Habitat</strong><p>{knowledge.habitat ?? "Not mapped yet."}</p></article>
          <article className="husbandry-card"><strong>🍽️ Feeding context</strong><p>{knowledge.feeding?.notes ?? "Species-specific feeding context has not yet been mapped."}</p></article>
          <article className="husbandry-card"><strong>🛡️ Safety boundaries</strong><p>{knowledge.safety?.handlingNotes ?? "Species-specific safety guidance has not yet been mapped."}</p></article>
        </div>
      </section>

      <section className="husbandry-panel">
        <p className="husbandry-eyebrow">🧾 EVIDENCE LEDGER</p>
        <h2>What Tiny Titans knows — and how confidently it knows it</h2>
        <div className="husbandry-stats husbandry-stats--five">
          <div><span>Numeric ranges</span><strong>{evidenceSummary.numericRanges}</strong></div>
          <div><span>Verified ranges</span><strong>{evidenceSummary.verifiedRanges}</strong></div>
          <div><span>Need scoping</span><strong>{evidenceSummary.recordedRanges}</strong></div>
          <div><span>External evidence</span><strong>{evidenceSummary.hasExternalEvidence ? "Located" : "Not linked"}</strong></div>
          <div><span>Unresolved sources</span><strong>{evidenceSummary.unresolvedSourceIds.length}</strong></div>
        </div>
        <p>“Recorded · scope needs mapping” means Tiny Titans already has a value but has not yet attached the individual evidence scope. It does <strong>not</strong> mean that the information is unknown. “Evidence limited” is reserved for cases where the available keeper-facing evidence genuinely does not justify a defensible species-specific target.</p>
        <p>Community observations remain separate from canonical guidance. They can corroborate or flag a research area, but do not silently become official husbandry.</p>
      </section>

      {husbandry?.temperature && (
        <section className="husbandry-panel">
          <p className="husbandry-eyebrow">🌡️ TEMPERATURE</p>
          <h2>Thermal guidance</h2>
          {hasTemperature ? (
            <div className="husbandry-grid husbandry-grid--four">
              {husbandry.temperature.basking && <RangeCard label="☀️ Basking" range={husbandry.temperature.basking} species={selectedSpecies} />}
              {husbandry.temperature.warmSide && <RangeCard label="🔥 Warm side" range={husbandry.temperature.warmSide} species={selectedSpecies} />}
              {husbandry.temperature.coolSide && <RangeCard label="❄️ Cool side" range={husbandry.temperature.coolSide} species={selectedSpecies} />}
              {husbandry.temperature.night && <RangeCard label="🌙 Night" range={husbandry.temperature.night} species={selectedSpecies} />}
            </div>
          ) : (
            <CoverageBadge status={getRangeEvidenceCoverage(undefined, selectedSpecies).status} detail={getRangeEvidenceCoverage(undefined, selectedSpecies).detail} />
          )}
          {husbandry.temperature.notes && <p>{husbandry.temperature.notes}</p>}
          {husbandry.temperature.seasonal && <p><strong>Seasonal context:</strong> {husbandry.temperature.seasonal}</p>}
        </section>
      )}

      {husbandry?.humidity && (
        <section className="husbandry-panel">
          <p className="husbandry-eyebrow">💧 HUMIDITY</p>
          <h2>Humidity guidance</h2>
          {hasHumidity ? (
            <div className="husbandry-grid husbandry-grid--four">
              {husbandry.humidity.target && <RangeCard label="🎯 Target" range={husbandry.humidity.target} species={selectedSpecies} />}
              {husbandry.humidity.acceptable && <RangeCard label="✅ Acceptable" range={husbandry.humidity.acceptable} species={selectedSpecies} />}
            </div>
          ) : (
            <CoverageBadge status={getRangeEvidenceCoverage(undefined, selectedSpecies).status} detail={getRangeEvidenceCoverage(undefined, selectedSpecies).detail} />
          )}
          {husbandry.humidity.notes && <p>{husbandry.humidity.notes}</p>}
          {husbandry.humidity.seasonal && <p><strong>Seasonal context:</strong> {husbandry.humidity.seasonal}</p>}
        </section>
      )}

      {husbandry?.enclosure && (
        <section className="husbandry-panel">
          <p className="husbandry-eyebrow">🏠 ENCLOSURE</p>
          <h2>Species-appropriate enclosure context</h2>
          <div className="husbandry-links">
            {husbandry.enclosure.habitatType?.length ? <article className="husbandry-card"><strong>Habitat / lifestyle</strong><p>{husbandry.enclosure.habitatType.join(", ")}</p></article> : null}
            {husbandry.enclosure.substrate?.length ? <article className="husbandry-card"><strong>Substrate</strong><p>{husbandry.enclosure.substrate.join(" · ")}</p></article> : null}
            {husbandry.enclosure.hides && <article className="husbandry-card"><strong>Hides</strong><p>{husbandry.enclosure.hides}</p></article>}
            {husbandry.enclosure.water && <article className="husbandry-card"><strong>Water</strong><p>{husbandry.enclosure.water}</p></article>}
            {husbandry.enclosure.ventilation && <article className="husbandry-card"><strong>Ventilation</strong><p>{husbandry.enclosure.ventilation}</p></article>}
            {husbandry.enclosure.lighting && <article className="husbandry-card"><strong>Lighting</strong><p>{husbandry.enclosure.lighting}</p></article>}
            {husbandry.enclosure.climbing !== undefined && <article className="husbandry-card"><strong>Climbing</strong><p>{husbandry.enclosure.climbing ? "Climbing provision is indicated in the profile." : "No specific climbing provision is indicated in the profile."}</p></article>}
          </div>
          {husbandry.enclosure.notes && <p>{husbandry.enclosure.notes}</p>}
        </section>
      )}

      {knowledge.feeding && (
        <section className="husbandry-panel">
          <p className="husbandry-eyebrow">🍽️ FEEDING</p>
          <h2>Feeding evidence</h2>
          <p>{knowledge.feeding.notes}</p>
          {knowledge.feeding.evidenceSummary && <EvidenceNote evidence={knowledge.feeding.evidenceSummary} />}
        </section>
      )}

      {knowledge.breeding && (
        <section className="husbandry-panel">
          <p className="husbandry-eyebrow">🧬 BREEDING CONTEXT</p>
          <h2>Breeding evidence</h2>
          <CoverageBadge status={getProfileEvidenceCoverage(selectedSpecies, knowledge.breeding.evidenceLevel, knowledge.breeding.evidenceSummary).status} detail={getProfileEvidenceCoverage(selectedSpecies, knowledge.breeding.evidenceLevel, knowledge.breeding.evidenceSummary).detail} />
          {knowledge.breeding.evidenceSummary && <EvidenceNote evidence={knowledge.breeding.evidenceSummary} />}
          <p>{knowledge.breeding.notes ?? "No additional breeding notes have been mapped."}</p>
          {knowledge.breeding.seasonalCycling && <p><strong>Seasonal cycling:</strong> {knowledge.breeding.seasonalCycling}</p>}
        </section>
      )}

      {husbandry?.cohabitation && (
        <section className="husbandry-panel">
          <p className="husbandry-eyebrow">🐍 COHABITATION</p>
          <h2>{husbandry.cohabitation.recommendation}</h2>
          <p>{husbandry.cohabitation.rationale}</p>
        </section>
      )}

      <section className="husbandry-panel">
        <p className="husbandry-eyebrow">SOURCE TRAIL</p>
        <h2>Supporting references</h2>
        {sources.length > 0 ? (
          <div className="husbandry-sources">
            {sources.map((source) => <a key={source.id} href={source.url === "#" ? undefined : source.url} target={source.url === "#" ? undefined : "_blank"} rel="noreferrer" aria-disabled={source.url === "#"}><strong>{source.title}</strong><span>{source.publisher} · {source.evidenceLevel} evidence · accessed {source.accessedOn}</span>{source.notes && <small>{source.notes}</small>}</a>)}
          </div>
        ) : <p className="husbandry-muted">No non-taxonomic source trail is attached yet.</p>}
      </section>
    </main>
  );
}
