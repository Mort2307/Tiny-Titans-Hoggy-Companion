import { useSpeciesContext } from "../context/SpeciesContext";
import GeneticsIntelligentSearch from "../components/GeneticsIntelligentSearch/GeneticsIntelligentSearch";
import MorphLibrary from "./MorphLibrary";
import SpeciesMorphLibrary from "./SpeciesMorphLibrary";
import "../styles/speciesMorphLibrary.css";

/**
 * Single entry point for the Morph Library.
 *
 * The legacy, fully featured Hognose library remains available only for
 * Heterodon nasicus. Every other species is rendered through the species
 * genetics catalogue so Hognose entries can never bleed into another taxon.
 * Community variation proposals and user-supplied imagery are handled inside
 * each species library so every tier sees one consistent contribution flow.
 */
export default function SpeciesAwareMorphLibrary() {
  const { selectedSpeciesId } = useSpeciesContext();
  return (
    <div className="species-morph-library-standard">
      <GeneticsIntelligentSearch />
      {selectedSpeciesId === "heterodon-nasicus" ? <MorphLibrary /> : <SpeciesMorphLibrary />}
    </div>
  );
}
