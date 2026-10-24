import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSpeciesContext } from "../context/SpeciesContext";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import UniversalSpeciesPicker from "../components/UniversalSpeciesPicker";
import GeneticsIntelligentSearch from "../components/GeneticsIntelligentSearch/GeneticsIntelligentSearch";
import MorphLibrary from "./MorphLibrary";
import SpeciesMorphLibrary from "./SpeciesMorphLibrary";
import "../styles/speciesMorphLibrary.css";

/** A Wild Type and contribution route exists for every canonical animal species.
 * Genetics, review and community media remain isolated by species ID.
 */
export default function SpeciesAwareMorphLibrary() {
  const { selectedSpeciesId, setSelectedSpeciesId } = useSpeciesContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeSpeciesId = searchParams.get("species") ?? "";

  useEffect(() => {
    const resolved = findUniversalSpecies(routeSpeciesId);
    if (resolved && resolved.id !== selectedSpeciesId) setSelectedSpeciesId(resolved.id);
  }, [routeSpeciesId, selectedSpeciesId, setSelectedSpeciesId]);

  function selectSpecies(id: string) {
    setSelectedSpeciesId(id);
    const next = new URLSearchParams(searchParams);
    if (id) next.set("species", id);
    else next.delete("species");
    next.delete("submitMorphImage");
    next.delete("morphId");
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="species-morph-library-standard">
      <section className="tracker-card" aria-label="Choose the animal for this morph library">
        <p className="eyebrow">SPECIES-SPECIFIC MORPH &amp; MUTATION LIBRARY</p>
        <h2>Select the animal you keep</h2>
        <p>Every listed species starts with Wild Type / Unclassified. Reviewed morphs and colour mutations are added only with species-specific evidence. All photographs come from approved user submissions, never internet stock libraries.</p>
        <UniversalSpeciesPicker value={selectedSpeciesId} onChange={(species) => selectSpecies(species?.id ?? "")} label="Choose species for this library" allowUnknown={false} />
        <p><Link to="/species">Or explore every animal species first</Link></p>
      </section>
      {selectedSpeciesId ? (
        <>
          <GeneticsIntelligentSearch />
          {selectedSpeciesId === "heterodon-nasicus" ? <MorphLibrary /> : <SpeciesMorphLibrary />}
        </>
      ) : (
        <section className="tracker-card"><h2>Choose a species to browse its Wild Type and variation records</h2><p>The library won't borrow genetics from a different animal when information is missing.</p></section>
      )}
    </div>
  );
}
