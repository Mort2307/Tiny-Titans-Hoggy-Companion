import SpeciesSelector from "./SpeciesSelector";
import { useSpeciesContext } from "../context/SpeciesContext";
import { isSpeciesGeneticsMapped } from "../data/species/speciesGenetics";
import "../styles/species-context.css";

type SpeciesContextBarProps = {
  compact?: boolean;
  label?: string;
  showGeneticsStatus?: boolean;
};

export default function SpeciesContextBar({ compact = false, label = "Species context", showGeneticsStatus = true }: SpeciesContextBarProps) {
  const { selectedSpeciesId, selectedSpecies, setSelectedSpeciesId } = useSpeciesContext();
  const knowledge = selectedSpecies?.knowledge;
  const geneticsMapped = isSpeciesGeneticsMapped(selectedSpeciesId);
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "Selected species";
  const husbandryMapped = Boolean(knowledge?.husbandry);

  return (
    <section className={`tt-species-context ${compact ? "tt-species-context--compact" : ""}`} aria-label="Species context">
      <div className="tt-species-context__copy">
        <p className="tt-species-context__eyebrow">🦎 SPECIES-SAFE CONTEXT</p>
        <strong>{label}</strong>
        {!compact && <p>Choose the species you are working with. Husbandry, safety and genetics content must stay attached to that species.</p>}
      </div>
      <div className="tt-species-context__selector">
        <SpeciesSelector id="global-species-context" value={selectedSpeciesId} onChange={setSelectedSpeciesId} label="Select your species" />
      </div>
      {showGeneticsStatus && (
        <div className={`tt-species-context__status ${geneticsMapped && husbandryMapped ? "is-mapped" : "is-pending"}`}>
          <span>{geneticsMapped ? "🧬 Genetics mapped" : "🧬 Genetics catalogue pending"}</span>
          <small>
            {husbandryMapped ? `${speciesName} · ${knowledge?.husbandry?.evidenceLevel ?? "unknown"} husbandry evidence` : `${speciesName} · species-specific husbandry not mapped`}
          </small>
          {!husbandryMapped && <small className="tt-species-context__warning">Numeric care thresholds and husbandry recommendations must not be borrowed from another species.</small>}
        </div>
      )}
    </section>
  );
}
