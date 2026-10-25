import { useSpeciesContext } from "../context/SpeciesContext";
import BasicBreedingPlanner from "./BasicBreedingPlanner";
import UniversalBreedingWorkspace from "./UniversalBreedingWorkspace";

/** Keep the established Western Hognose planner intact while every other
 * registered species receives the new non-assumptive breeding workspace. */
export default function SpeciesSafeBreedingPlanner() {
  const { selectedSpeciesId } = useSpeciesContext();
  return selectedSpeciesId === "heterodon-nasicus"
    ? <BasicBreedingPlanner />
    : <UniversalBreedingWorkspace />;
}
