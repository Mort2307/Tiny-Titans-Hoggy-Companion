import type { BreedingPairing } from "../types/Breeding";
import type { TimelineEvent } from "../types/Timeline";
import { getBreedingPairings, getBreedingProjects } from "./breedingService";

export async function getCanonicalBreedingTimeline(uid: string, snakeId: string): Promise<TimelineEvent[]> {
  try {
    const projects = await getBreedingProjects(uid);
    const relevant = projects.filter((project) => project.maleId === snakeId || project.femaleId === snakeId);
    if (!relevant.length) return [];
    const results = await Promise.all(relevant.map((project) => getBreedingPairings(uid, project.id).catch(() => [] as BreedingPairing[])));
    const seen = new Set<string>();
    return results.flat().filter((pairing) => {
      if (seen.has(pairing.id)) return false;
      seen.add(pairing.id);
      return pairing.maleId === snakeId || pairing.femaleId === snakeId;
    }).map((pairing) => ({
      id: `breeding-${pairing.id}`,
      snakeId,
      date: pairing.pairingDate,
      type: "Breeding",
      title: `Breeding — ${pairing.status}`,
      description: pairing.notes,
      relatedRecordId: pairing.id,
    }));
  } catch {
    return [];
  }
}
