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
        <div className={`tt-species-context__status ${geneticsMapped ? "is-mapped" : "is-pending"}`}>
          <span>{geneticsMapped ? "🧬 Genetics mapped" : "🧬 Genetics catalogue pending"}</span>
          <small>{knowledge?.husbandry ? `${speciesName} · ${knowledge.husbandry.evidenceLevel} husbandry evidence` : `${speciesName} · husbandry evidence not yet mapped`}</small>
        </div>
      )}
    </section>
  );
}
