import type { SnakeSpeciesRecord } from "./speciesTypes";
import { getSpeciesGeneticsStatus } from "./speciesGenetics";

export const SPECIES_INTEGRATION_SURFACES = [
  "reminders",
  "husbandry",
  "weights",
  "feeding",
  "shedding",
  "behaviour",
  "health",
  "enclosure-intelligence",
  "morph-library",
  "genetics-calculator",
  "breeding-planner",
  "breeding-academy",
  "keeper-handbook",
  "behaviour-observatory",
  "make-contribution",
  "knowledge-base",
  "titans-challenge",
  "community-hub",
  "mentorship",
  "wall-of-titans",
  "account",
  "family",
  "become-a-titan",
  "educator-centre",
  "creator-centre",
  "morph-library-editor",
  "community-manager",
  "mentor-review",
  "tester-centre",
] as const;

export type SpeciesIntegrationSurface = (typeof SPECIES_INTEGRATION_SURFACES)[number];
export type SpeciesIntegrationSurfaceStatus = "integrated" | "pending-review";

export interface SpeciesIntegrationContract {
  speciesId: string;
  reviewedOn: string;
  reviewer: "Tiny Titans" | "Founder review" | "External expert review";
  surfaces: Record<SpeciesIntegrationSurface, SpeciesIntegrationSurfaceStatus>;
  notes?: string;
}

const COMPLETE_SHARED_SURFACES: Record<SpeciesIntegrationSurface, SpeciesIntegrationSurfaceStatus> = Object.fromEntries(
  SPECIES_INTEGRATION_SURFACES.map((surface) => [surface, "integrated"]),
) as Record<SpeciesIntegrationSurface, SpeciesIntegrationSurfaceStatus>;

/**
 * The integration matrix is deliberately conservative.
 *
 * Shared tracker/community/account pages are common application infrastructure,
 * but genetics, husbandry and breeding remain explicitly species-reviewed gates.
 * A species is not release-ready until every surface is explicitly integrated.
 */
export function getSpeciesIntegrationContract(species: SnakeSpeciesRecord): SpeciesIntegrationContract {
  const surfaces = { ...COMPLETE_SHARED_SURFACES };
  const geneticsReady = getSpeciesGeneticsStatus(species.id) !== "baseline-only";
  const husbandryReady = Boolean(species.knowledge.husbandry);
  const breedingReady = Boolean(species.knowledge.breeding);

  if (!geneticsReady) {
    surfaces["morph-library"] = "pending-review";
    surfaces["genetics-calculator"] = "pending-review";
    surfaces["breeding-planner"] = "pending-review";
  }
  if (!husbandryReady) surfaces.husbandry = "pending-review";
  if (!breedingReady) {
    surfaces["breeding-planner"] = "pending-review";
    surfaces["breeding-academy"] = "pending-review";
  }

  return {
    speciesId: species.id,
    reviewedOn: species.knowledge.reviewedOn,
    reviewer: "Tiny Titans",
    surfaces,
  };
}

export function getPendingSpeciesIntegrationSurfaces(species: SnakeSpeciesRecord): SpeciesIntegrationSurface[] {
  const contract = getSpeciesIntegrationContract(species);
  return SPECIES_INTEGRATION_SURFACES.filter((surface) => contract.surfaces[surface] !== "integrated");
}

export function isSpeciesFullyIntegrated(species: SnakeSpeciesRecord): boolean {
  return getPendingSpeciesIntegrationSurfaces(species).length === 0;
}
