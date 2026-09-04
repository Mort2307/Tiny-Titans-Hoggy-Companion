import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesGeneticsStatus } from "../data/species/speciesGenetics";
import MorphLibrary from "./MorphLibrary";
import SpeciesMorphLibrary from "./SpeciesMorphLibrary";

/**
 * Single entry point for the Morph Library.
 *
 * The legacy, fully featured Hognose library remains available only for
 * Heterodon nasicus. Every other species is rendered through the species
 * genetics catalogue so Hognose entries can never bleed into another taxon.
 */
export default function SpeciesAwareMorphLibrary() {
  const { selectedSpeciesId } = useSpeciesContext();
  const status = getSpeciesGeneticsStatus(selectedSpeciesId);

  if (selectedSpeciesId === "heterodon-nasicus") return <MorphLibrary />;
  return <SpeciesMorphLibrary />;
}
