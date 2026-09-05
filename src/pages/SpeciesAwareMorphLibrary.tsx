import { useSpeciesContext } from "../context/SpeciesContext";
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

  if (selectedSpeciesId === "heterodon-nasicus") return <MorphLibrary />;
  return (
    <div className="species-morph-library-standard">
      <SpeciesMorphLibrary />
      <SpeciesMorphCommunityContribution />
    </div>
  );
}
