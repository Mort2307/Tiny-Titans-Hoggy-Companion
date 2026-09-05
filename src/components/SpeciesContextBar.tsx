import SpeciesSelector from "./SpeciesSelector";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesEvidenceSummary } from "../data/species/speciesEvidence";
import { getSpeciesGeneticsStatus } from "../data/species/speciesGenetics";
import "../styles/species-context.css";

type SpeciesContextBarProps = {
  compact?: boolean;
  label?: string;
  showGeneticsStatus?: boolean;
};

export default function SpeciesContextBar({ compact = false, label = "Species context", showGeneticsStatus = true }: SpeciesContextBarProps) {
  const { selectedSpeciesId, selectedSpecies, setSelectedSpeciesId } = useSpeciesContext();
  const knowledge = selectedSpecies?.knowledge;
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "Selected species";
  const evidence = selectedSpecies ? getSpeciesEvidenceSummary(selectedSpecies) : null;
  const husbandryMapped = Boolean(knowledge?.husbandry);
  const numericFullyScoped = Boolean(evidence && evidence.numericRanges > 0 && evidence.verifiedRanges === evidence.numericRanges);
  const overallReady = geneticsStatus === "mapped" && husbandryMapped && numericFullyScoped;
  const geneticsLabel = geneticsStatus === "mapped" ? "🧬 Full genetics catalogue" : geneticsStatus === "partial" ? "🧬 Genetics partially catalogued" : "🧬 Genetics catalogue pending";

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
        <div className={`tt-species-context__status ${overallReady ? "is-mapped" : "is-pending"}`}>
          <span>{geneticsLabel}</span>
          <small>
            {husbandryMapped
              ? `${speciesName} · ${knowledge?.husbandry?.evidenceLevel ?? "unknown"} profile evidence · ${evidence?.verifiedRanges ?? 0}/${evidence?.numericRanges ?? 0} numeric ranges individually scoped`
              : `${speciesName} · species-specific husbandry not mapped`}
          </small>
          {geneticsStatus === "partial" && <small className="tt-species-context__warning">The current genetics entries are species-specific but not yet exhaustive. Predictive breeding calculations remain locked until the species engine is fully verified.</small>}
          {husbandryMapped && !numericFullyScoped && <small className="tt-species-context__warning">Some recorded care values still need their individual evidence scope attached before Tiny Titans can present them as verified species targets.</small>}
          {!husbandryMapped && <small className="tt-species-context__warning">Numeric care thresholds and husbandry recommendations must not be borrowed from another species.</small>}
        </div>
      )}
    </section>
  );
}
