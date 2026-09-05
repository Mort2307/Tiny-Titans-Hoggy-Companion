import type { SnakeSpeciesRecord } from "./speciesTypes";
import integrationManifest from "./speciesIntegrationManifest.json";
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
export type SpeciesReleaseStatus = "fully-integrated" | "legacy-review";

export interface SpeciesIntegrationContract {
  speciesId: string;
  reviewedOn: string;
  reviewer: "Tiny Titans" | "Founder review" | "External expert review";
  releaseStatus: SpeciesReleaseStatus;
  surfaces: Record<SpeciesIntegrationSurface, SpeciesIntegrationSurfaceStatus>;
  notes?: string;
}

type ManifestEntry = {
  status: "fully-integrated";
  reviewedOn: string;
  reviewer: "Tiny Titans" | "Founder review" | "External expert review";
  surfaces: SpeciesIntegrationSurface[];
};

const RELEASE_MANIFEST = integrationManifest.fullyIntegratedSpecies as Record<string, ManifestEntry>;

const COMPLETE_SHARED_SURFACES: Record<SpeciesIntegrationSurface, SpeciesIntegrationSurfaceStatus> = Object.fromEntries(
  SPECIES_INTEGRATION_SURFACES.map((surface) => [surface, "integrated"]),
) as Record<SpeciesIntegrationSurface, SpeciesIntegrationSurfaceStatus>;

/**
 * A species is release-ready only when it has an explicit, reviewed record in
 * speciesIntegrationManifest.json. Everything else remains legacy-review and
 * is never silently presented as fully reviewed.
 */
export function getSpeciesIntegrationContract(species: SnakeSpeciesRecord): SpeciesIntegrationContract {
  const released = RELEASE_MANIFEST[species.id];
  if (released) {
    const surfaces = Object.fromEntries(
      SPECIES_INTEGRATION_SURFACES.map((surface) => [
        surface,
        released.surfaces.includes(surface) ? "integrated" : "pending-review",
      ]),
    ) as Record<SpeciesIntegrationSurface, SpeciesIntegrationSurfaceStatus>;

    return {
      speciesId: species.id,
      reviewedOn: released.reviewedOn,
      reviewer: released.reviewer,
      releaseStatus: released.status,
      surfaces,
    };
  }

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
    releaseStatus: "legacy-review",
    surfaces,
    notes: "Taxonomy/database presence is not equivalent to full species integration review.",
  };
}

export function getPendingSpeciesIntegrationSurfaces(species: SnakeSpeciesRecord): SpeciesIntegrationSurface[] {
  const contract = getSpeciesIntegrationContract(species);
  return SPECIES_INTEGRATION_SURFACES.filter((surface) => contract.surfaces[surface] !== "integrated");
}

export function isSpeciesFullyIntegrated(species: SnakeSpeciesRecord): boolean {
  return getSpeciesIntegrationContract(species).releaseStatus === "fully-integrated"
    && getPendingSpeciesIntegrationSurfaces(species).length === 0;
}
