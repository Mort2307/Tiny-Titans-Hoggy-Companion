import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { SNAKE_SPECIES, type SnakeSpeciesRecord } from "../data/species/speciesRegistry";
import type { HusbandryProfile } from "../data/species/speciesTypes";
import "../styles/creatorSpeciesPreview.css";

function evidenceLabel(value?: string) {
  switch (value) {
    case "high": return "High";
    case "moderate": return "Moderate";
    case "limited": return "Limited";
    case "unknown": return "Not yet mapped";
    default: return "Not published";
  }
}

function rangeText(range?: { min: number; max: number; unit: string; context?: string }) {
  if (!range) return "Not published";
  return `${range.min}–${range.max}${range.unit}${range.context ? ` · ${range.context}` : ""}`;
}

function listText(values?: string[]) {
  return values?.length ? values.join(", ") : "Not published";
}

export default function CreatorSpeciesPreview() {
  const navigate = useNavigate();
  const species = useMemo(() => SNAKE_SPECIES, []);

  return (
    <main className="creator-species-preview page-shell">
      <BackHomeButton />
      <header className="creator-species-preview__header">
        <span className="creator-admin-kicker">🧬 CREATOR CENTRE · SPECIES</span>
        <h1>Species Preview Lab</h1>
        <p>Audit every snake species record before it reaches keeper-facing tools. Taxonomy, evidence and husbandry stay species-specific.</p>
      </header>

      <section className="creator-species-grid">
        {species.map((record: SnakeSpeciesRecord) => {
          const husbandry: HusbandryProfile | undefined = record.knowledge.husbandry;
          const husbandryNote = husbandry?.enclosure?.notes ?? husbandry?.humidity?.notes ?? husbandry?.temperature?.notes;
          return (
            <article className="creator-species-card" key={record.id}>
              <span className="creator-admin-kicker">{record.knowledge.riskClass.toUpperCase()}</span>
              <h2>{record.commonNames[0]}</h2>
              <p className="creator-species-scientific">{record.acceptedScientificName}</p>
              <dl>
                <div><dt>Evidence</dt><dd>{evidenceLabel(husbandry?.evidenceLevel)}</dd></div>
                <div><dt>Warm side</dt><dd>{rangeText(husbandry?.temperature?.warmSide)}</dd></div>
                <div><dt>Cool side</dt><dd>{rangeText(husbandry?.temperature?.coolSide)}</dd></div>
                <div><dt>Basking</dt><dd>{rangeText(husbandry?.temperature?.basking)}</dd></div>
                <div><dt>Humidity</dt><dd>{rangeText(husbandry?.humidity?.target ?? husbandry?.humidity?.acceptable)}</dd></div>
                <div><dt>Housing</dt><dd>{listText(husbandry?.enclosure?.habitatType)}</dd></div>
                <div><dt>Cohabitation</dt><dd>{husbandry?.cohabitation?.recommendation ?? "Not yet published"}</dd></div>
              </dl>
              {husbandryNote && <p className="creator-species-note">{husbandryNote}</p>}
              <button type="button" onClick={() => navigate(`/creator/species/${record.id}`)}>Open species →</button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
