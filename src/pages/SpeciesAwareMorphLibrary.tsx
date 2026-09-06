import { useSpeciesContext } from "../context/SpeciesContext";
import GeneticsIntelligentSearch from "../components/GeneticsIntelligentSearch/GeneticsIntelligentSearch";
import MorphLibrary from "./MorphLibrary";
import SpeciesMorphLibrary from "./SpeciesMorphLibrary";
import SpeciesMorphCommunityContribution from "../components/SpeciesMorphCommunityContribution";
import "../styles/speciesMorphLibrary.css";

/**
 * Single entry point for the Morph Library.
 *
 * The legacy, fully featured Hognose library remains available only for
 * Heterodon nasicus. Every other species is rendered through the species
 * genetics catalogue so Hognose entries can never bleed into another taxon.
 * Every non-Hognose species also receives the community evidence submission
 * surface, including baseline-only species via Wild Type / Unclassified.
 */
export default function SpeciesAwareMorphLibrary() {
  const { selectedSpeciesId } = useSpeciesContext();
  return (
    <div className="species-morph-library-standard">
      <GeneticsIntelligentSearch />
      {selectedSpeciesId === "heterodon-nasicus" ? <MorphLibrary /> : <SpeciesMorphLibrary />}
      {selectedSpeciesId !== "heterodon-nasicus" && <SpeciesMorphCommunityContribution />}
    </div>
  );
}
