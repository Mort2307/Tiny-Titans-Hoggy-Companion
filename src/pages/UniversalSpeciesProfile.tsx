import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { UNIVERSAL_SPECIES_BY_ID } from "../data/species/universalSpeciesRegistry";
import { getUserAnimals } from "../services/universalAnimalService";
import { getUserSnakeDirectory } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import type { UniversalAnimalRecord } from "../types/UniversalAnimal";
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


function regulatoryLabel(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UniversalSpeciesProfile() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [myIndividuals, setMyIndividuals] = useState<UniversalAnimalRecord[]>([]);
  const [myIndividualsLoading, setMyIndividualsLoading] = useState(false);
  const species = UNIVERSAL_SPECIES_BY_ID[id];

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setMyIndividualsLoading(true);
    void Promise.all([getUserAnimals(user.uid), getUserSnakeDirectory(user.uid)])
      .then(([animals, snakes]) => {
        if (!active) return;
        const legacy = snakes
          .filter((snake) => snake.universalSpeciesId === id)
          .map((snake) => ({
            id: snake.id,
            ownerUid: user.uid,
            name: snake.name,
            speciesId: id,
            speciesCommonName: snake.species,
            animalGroup: "reptile",
            sex: snake.sex.toLowerCase() as UniversalAnimalRecord["sex"],
            status: snake.status === "Sold" ? "sold" : snake.status === "Deceased" ? "deceased" : "active",
            morphOrColour: snake.morphs?.join(", ") || snake.customMorph || undefined,
            notes: snake.notes,
            tags: [],
            createdAt: "",
            updatedAt: "",
          } satisfies UniversalAnimalRecord));
        setMyIndividuals([...animals.filter((animal) => animal.speciesId === id), ...legacy]);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setMyIndividualsLoading(false); });
    return () => { active = false; };
  }, [user, id]);

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
      <div className="universal-species-links"><Link className="universal-species-back" to="/species"><TinyTitansIcon name="back" size={18} /> Species Explorer</Link><Link className="universal-species-marketplace-link" to={`/marketplace?species=${encodeURIComponent(species.id)}`}>Marketplace listings for this species →</Link></div>

      <header className="universal-species-hero">
        <div>
          <div className="universal-species-badges">
            <span>{species.className}</span>
            <span>{species.riskClass.replace("-", " ")}</span>
            <span>Taxonomy: {species.evidenceStatus.replace("-", " ")}</span><span>Care: {care?.husbandry.coverage.replace("-", " ") ?? "not verified"}</span>
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

      {user && <section className="universal-species-panel">
        <div className="universal-species-panel-heading">
          <div><p className="eyebrow">YOUR ANIMALS</p><h2>Individuals of this species</h2></div>
          <Link className="universal-species-marketplace-link" to={"/animals?species=" + encodeURIComponent(species.id)}>Open My Animals →</Link>
        </div>
        {myIndividualsLoading ? <p>Loading your individual animals…</p> : myIndividuals.length === 0 ? <p>You do not have an individual record linked to this species yet.</p> : <div className="universal-animal-species-list">{myIndividuals.map((animal) => <Link className="universal-animal-species-row" key={animal.id} to={animal.id && animal.speciesId === species.id ? "/animals/" + animal.id : "#"}><strong>{animal.name}</strong><span>{animal.speciesCommonName || species.commonNames[0]} · {animal.status}</span></Link>)}</div>}
      </section>

      <section className="universal-species-callout">
        <TinyTitansIcon name="info" size={20} />
        <div>
          <strong>Evidence boundary</strong>
          <p>{care?.summary ?? "The taxonomy record is available, but the structured care layer has not completed."}</p>
          <p>Exact numeric husbandry targets are only displayed where a species- or genus-scoped evidence record has been mapped and reviewed. A taxonomy record is never treated as proof of a care sheet.</p>
        </div>
      </section>

      {care && (
        <div className="universal-species-content">
          <section className="universal-species-panel">
            <div className="universal-species-panel-heading">
              <div><p className="eyebrow">CARE EVIDENCE</p><h2>{care.husbandry.coverage === "species" ? "Species-level care profile" : care.husbandry.coverage === "genus" ? "Genus-level care profile" : care.husbandry.coverage === "taxon" ? "Taxon-level care profile" : "Care profile not yet verified"}</h2></div>
              <span className="universal-species-status">{care.husbandry.coverage.replace("-", " ")}</span>
            </div>
            {care.husbandry.coverage === "species" || care.husbandry.coverage === "genus" || care.husbandry.coverage === "taxon" ? (
              <>
                <p>{care.husbandry.overview}</p>
                {care.husbandry.numericGuidance.available && care.husbandry.numericGuidance.ranges && <div className="universal-numeric-grid">{care.husbandry.numericGuidance.ranges.map((range) => <div key={range.label}><span>{range.label}</span><strong>{range.min}–{range.max} {range.unit}</strong>{range.context && <small>{range.context}</small>}<small>Scoped evidence: {range.evidence.basis.replace("-", " ")}</small></div>)}</div>}
                <div className="universal-care-grid">{care.husbandry.requirements.map((item) => <article className="universal-care-card" key={item.id}><div className="universal-care-card__top"><span>{item.domain.replace("-", " ")}</span><strong>{requirementLabel[item.priority]}</strong></div><h3>{item.label}</h3><p>{item.guidance}</p><small>Evidence: {item.evidence.basis.replace("-", " ")}</small></article>)}</div>
              </>
            ) : (
              <>
                <p><strong>Tiny Titans does not currently have enough species- or genus-scoped husbandry evidence to present the following as a verified care sheet.</strong></p>
                <p>The catalogue identity is available, along with ecology and legal/research context. This record stays in the research queue until appropriate species/genus husbandry evidence is reviewed.</p>
                <div className="universal-unresolved"><h3>Research required before care is promoted</h3><ul>{care.husbandry.unresolved.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </>
            )}
          </section>

          <section className="universal-species-panel">
            <div className="universal-species-panel-heading">
              <div><p className="eyebrow">HEALTH WATCH</p><h2>What to monitor</h2></div>
              <span className="universal-species-status">{care.health.status.replace("-", " ")}</span>
            </div>
            <div className="universal-health-boundary"><strong>{care.health.coverage === "species" || care.health.coverage === "genus" || care.health.coverage === "taxon" ? "Scoped health evidence" : "Not a species-specific disease list"}</strong><p>{care.health.coverage === "species" || care.health.coverage === "genus" || care.health.coverage === "taxon" ? "These watch points are tied to the mapped evidence scope shown below." : "These are general veterinary/group-level warning patterns only. Species- and genus-specific disease/diagnostic mapping remains in the research queue."}</p></div><div className="universal-health-baseline">
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


          <section className="universal-species-panel">
            <div className="universal-species-panel-heading">
              <div><p className="eyebrow">ACQUISITION & COMPLIANCE</p><h2>Checks before keeping, moving or listing</h2></div>
              <span className="universal-species-status">Location-dependent</span>
            </div>
            <div className="universal-compliance-grid">
              {[
                ["UK DWA", species.regulatory.ukDwa],
                ["CITES", species.regulatory.cites],
                ["Invasive species", species.regulatory.invasiveSpecies],
              ].map(([label, value]) => (
                <div className="universal-compliance-item" key={label}>
                  <span>{label}</span>
                  <strong>{regulatoryLabel(value)}</strong>
                </div>
              ))}
            </div>
            <p>{species.regulatory.note}</p>
            <small>These fields are verification prompts, not a legal opinion or a guarantee that a particular specimen may be kept or traded.</small>
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
