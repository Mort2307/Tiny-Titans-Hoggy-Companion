import UniversalSpeciesPicker from "./UniversalSpeciesPicker";
import TinyTitansIcon from "./TinyTitansIcon";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesEvidenceSummary } from "../data/species/speciesEvidence";
import { getSpeciesGeneticsStatus, getSpeciesVariationLibraryStatus } from "../data/species/speciesGenetics";
import "../styles/species-context.css";

type SpeciesContextBarProps = {
  compact?: boolean;
  label?: string;
  showGeneticsStatus?: boolean;
};

export default function SpeciesContextBar({ compact = false, label = "Species working context", showGeneticsStatus = true }: SpeciesContextBarProps) {
  const { selectedSpeciesId, selectedSpecies, selectedUniversalSpecies, setSelectedSpeciesId } = useSpeciesContext();
  const knowledge = selectedSpecies?.knowledge;
  const universalCare = selectedUniversalSpecies?.care;
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const variationStatus = getSpeciesVariationLibraryStatus(selectedSpeciesId);
  const speciesName = selectedUniversalSpecies?.commonNames[0] ?? selectedUniversalSpecies?.acceptedScientificName ?? "Selected species";
  const legacyEvidence = selectedSpecies ? getSpeciesEvidenceSummary(selectedSpecies) : null;
  const universalRanges = universalCare?.husbandry.numericGuidance.ranges ?? [];
  const universalScoped = Boolean(universalCare && ["species", "genus", "taxon"].includes(universalCare.husbandry.coverage));
  const numericRanges = legacyEvidence?.numericRanges ?? universalRanges.length;
  const verifiedRanges = legacyEvidence?.verifiedRanges ?? (universalScoped ? universalRanges.length : 0);
  const husbandryMapped = Boolean(knowledge?.husbandry) || universalScoped;
  const numericFullyScoped = numericRanges === 0 ? husbandryMapped : verifiedRanges === numericRanges;
  const speciesSelected = Boolean(selectedSpeciesId && selectedUniversalSpecies);
  const overallReady = speciesSelected && variationStatus === "catalogued" && husbandryMapped && numericFullyScoped;
  const geneticsLabel =
    variationStatus === "catalogued"
      ? "Full morph & variation catalogue"
      : variationStatus === "reviewed-no-established-variants"
        ? "Variation review complete"
        : geneticsStatus === "partial"
          ? "Morph & variation catalogue in review"
          : "Morph & variation research required";

  return (
    <section className={"tt-species-context " + (compact ? "tt-species-context--compact" : "")} aria-label="Species context">
      <div className="tt-species-context__copy">
        <p className="tt-species-context__eyebrow">SPECIES-AWARE CONTEXT</p>
        <strong>{label}</strong>
        {!compact && <p>Choose the species you are working with for this tool. Husbandry, safety, morphs and genetics stay attached to that exact species and are never borrowed from another animal.</p>}
      </div>
      <div className="tt-species-context__selector">
        <UniversalSpeciesPicker
          value={selectedSpeciesId}
          onChange={(species) => species && setSelectedSpeciesId(species.id)}
          label="Choose the species for this tool"
          allowUnknown={false}
        />
      </div>
      {showGeneticsStatus && (
        <div className={"tt-species-context__status " + (overallReady ? "is-mapped" : "is-pending")}>
          <span><TinyTitansIcon name="genetics" size={16} /> {geneticsLabel}</span>
          <small>
            {!speciesSelected
              ? "No species selected — choose one to scope this tool correctly."
              : speciesName + " · " + (selectedUniversalSpecies?.className ?? "animal") + " · " + verifiedRanges + "/" + numericRanges + " numeric husbandry ranges individually scoped"}
          </small>
          {variationStatus === "research-required" && <small className="tt-species-context__warning">This species has its own variation-library surface, but the exhaustive known morph, colour, pattern, locality and line-bred review is still required before Tiny Titans can call the catalogue complete.</small>}
          {husbandryMapped && !numericFullyScoped && <small className="tt-species-context__warning">Some recorded care values still need their individual evidence scope attached before Tiny Titans can present them as verified species targets.</small>}
          {!speciesSelected && <small className="tt-species-context__warning">Choose the species before interpreting species-specific care, safety or genetics. Tiny Titans will not substitute another species automatically.</small>}
          {speciesSelected && !husbandryMapped && <small className="tt-species-context__warning">Numeric care thresholds and husbandry recommendations must not be borrowed from another species.</small>}
        </div>
      )}
    </section>
  );
}
