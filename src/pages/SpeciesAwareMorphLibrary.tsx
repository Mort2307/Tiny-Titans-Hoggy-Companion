import { useSpeciesContext } from "../context/SpeciesContext";
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

  if (selectedSpeciesId === "heterodon-nasicus") return <MorphLibrary />;
  return <SpeciesMorphLibrary />;
}
