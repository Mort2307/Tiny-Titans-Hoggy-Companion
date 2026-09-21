import { Link, useParams } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { UNIVERSAL_SPECIES_BY_ID } from "../data/species/universalSpeciesRegistry";
import { UNIVERSAL_SPECIES_SOURCES } from "../data/species/universalSpeciesSources";
import type { HealthPriority, UniversalCareRequirement } from "../data/species/universalSpeciesCareTypes";
import "../styles/universal-species-profile.css";

const requirementLabel: Record<UniversalCareRequirement["priority"], string> = {
  essential: "Essential",
  important: "Important",
  conditional: "Conditional",
};

const healthLabel: Record<HealthPriority, string> = {
  monitor: "Monitor",
  "prompt-vet": "Prompt vet",
  "urgent-vet": "Urgent vet",
};

export default function UniversalSpeciesProfile() {
  const { id = "" } = useParams();
  const species = UNIVERSAL_SPECIES_BY_ID[id];

  if (!species) {
    return (
      <main className="page-container universal-species-profile">
        <section className="universal-species-panel">
          <p className="eyebrow">SPECIES INTELLIGENCE</p>
          <h1>Species not found</h1>
          <p>The requested universal species record does not exist in the current catalogue.</p>
          <Link className="button button-primary" to="/species">Back to Species Explorer</Link>
        </section>
      </main>
    );
  }

  const care = species.care;
  const sources = [...new Set([
    ...species.sourceIds,
    ...(care?.husbandry.sourceIds ?? []),
    ...(care?.health.sourceIds ?? []),
  ])].map((sourceId) => UNIVERSAL_SPECIES_SOURCES[sourceId]).filter(Boolean);

  return (
    <main className="page-container universal-species-profile">
      <Link className="universal-species-back" to="/species"><TinyTitansIcon name="back" size={18} /> Species Explorer</Link>

      <header className="universal-species-hero">
        <div>
          <div className="universal-species-badges">
            <span>{species.className}</span>
            <span>{species.riskClass.replace("-", " ")}</span>
            <span>{species.husbandryStatus.replace("-", " ")}</span>
          </div>
          <p className="eyebrow">{species.order} · {species.family}</p>
          <h1>{species.commonNames[0] ?? species.acceptedScientificName}</h1>
          <p className="universal-species-scientific">{species.acceptedScientificName}</p>
          <p>{species.summary}</p>
        </div>
        <dl className="universal-species-meta">
          <div><dt>Genus</dt><dd>{species.genus}</dd></div>
          <div><dt>Lifestyle</dt><dd>{species.lifestyle.join(" · ")}</dd></div>
          <div><dt>Diet</dt><dd>{species.dietaryGuild.replace("-", " ")}</dd></div>
          <div><dt>Evidence</dt><dd>{care?.status.replace("-", " ") ?? "care mapping pending"}</dd></div>
          <div><dt>Reviewed</dt><dd>{species.reviewedOn}</dd></div>
        </dl>
      </header>

      <section className="universal-species-callout">
        <TinyTitansIcon name="info" size={20} />
        <div>
          <strong>Evidence boundary</strong>
          <p>{care?.summary ?? "The taxonomy record is available, but the structured care layer has not completed."}</p>
          <p>Exact numeric husbandry targets are only displayed where a species-specific evidence scope has been mapped and reviewed.</p>
        </div>
      </section>

      {care && (
        <div className="universal-species-content">
          <section className="universal-species-panel universal-species-panel--wide">
            <div className="universal-species-panel-heading">
              <div><p className="eyebrow">BASELINE HUSBANDRY</p><h2>{care.husbandry.title}</h2></div>
              <span className="universal-species-status">{care.husbandry.status.replace("-", " ")}</span>
            </div>
            <p>{care.husbandry.overview}</p>

            <div className="universal-care-grid">
              {care.husbandry.requirements.map((item) => (
                <article className="universal-care-card" key={item.id}>
                  <div className="universal-care-card__top">
                    <span>{item.domain.replace("-", " ")}</span>
                    <strong>{requirementLabel[item.priority]}</strong>
                  </div>
                  <h3>{item.label}</h3>
                  <p>{item.guidance}</p>
                  {item.conditional && <p className="universal-care-card__conditional">{item.conditional}</p>}
                  <small>Evidence: {item.evidence.basis.replace("-", " ")}{item.evidence.sourceIds.length ? ` · ${item.evidence.sourceIds.length} mapped source(s)` : " · specialist mapping pending"}</small>
                </article>
              ))}
            </div>

            <div className="universal-unresolved">
              <h3>Species-specific work still pending</h3>
              <ul>{care.husbandry.unresolved.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="universal-species-panel">
            <div className="universal-species-panel-heading">
              <div><p className="eyebrow">HEALTH WATCH</p><h2>What to monitor</h2></div>
              <span className="universal-species-status">{care.health.status.replace("-", " ")}</span>
            </div>
            <div className="universal-health-baseline">
              {care.health.baseline.map((item) => <p key={item}>• {item}</p>)}
            </div>
            <div className="universal-health-list">
              {care.health.watches.map((watch) => (
                <article className="universal-health-card" key={watch.id}>
                  <div className="universal-care-card__top"><span>Health watch</span><strong>{healthLabel[watch.priority]}</strong></div>
                  <h3>{watch.concern}</h3>
                  <p><strong>Watch for:</strong> {watch.watchFor.join(" · ")}</p>
                  <p><strong>Risk factors:</strong> {watch.riskFactors.join(" · ")}</p>
                  <p><strong>Prevention:</strong> {watch.prevention}</p>
                  <small>Evidence: {watch.evidence.basis.replace("-", " ")}</small>
                </article>
              ))}
            </div>
            <div className="universal-vet-box">
              <strong>Veterinary / quarantine boundary</strong>
              <p>{care.health.veterinary.guidance}</p>
              <p>{care.health.quarantine.guidance}</p>
              <p>{care.health.veterinary.emergencyNote}</p>
            </div>
          </section>

          <section className="universal-species-panel universal-species-panel--wide">
            <div className="universal-species-panel-heading">
              <div><p className="eyebrow">PROVENANCE</p><h2>Source trail</h2></div>
              <span className="universal-species-status">{care.resolvedFrom.join(" → ")}</span>
            </div>
            {sources.length ? (
              <div className="universal-source-grid">
                {sources.map((source) => (
                  <a className="universal-source-card" key={source.id} href={source.url} target="_blank" rel="noreferrer">
                    <strong>{source.title}</strong>
                    <span>{source.publisher}</span>
                    <small>{source.purpose} · accessed {source.accessedOn}</small>
                  </a>
                ))}
              </div>
            ) : (
              <p>Specialist source mapping is still pending for this record.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
