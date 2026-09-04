import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserSnake } from "../services/snakeService";
import { findSnakeSpecies } from "../data/species/speciesRegistry";
import { useSpeciesContext } from "../context/SpeciesContext";

/**
 * Keeps species context anchored to the persisted animal whenever a route
 * identifies a specific snake. This prevents a manually selected species from
 * overriding the actual animal behind /snakes/:id, /weights/:id, etc.
 */
function resolveSnakeId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return null;

  if (parts[0] === "snakes" && parts[1] && !["new"].includes(parts[1])) return parts[1];

  const trackerRoots = new Set(["weights", "feeding", "shedding", "health", "behaviour", "husbandry", "enclosure-intelligence"]);
  if (trackerRoots.has(parts[0]) && parts[1]) return parts[1];

  return null;
}

export default function SpeciesRouteSynchronizer() {
  const location = useLocation();
  const { user } = useAuth();
  const { setSelectedSpeciesId } = useSpeciesContext();

  useEffect(() => {
    const snakeId = resolveSnakeId(location.pathname);
    if (!snakeId || !user) return;

    let cancelled = false;
    void getUserSnake(user.uid, snakeId)
      .then((snake) => {
        if (cancelled || !snake) return;
        const species = findSnakeSpecies(snake.species);
        if (species) setSelectedSpeciesId(species.id);
      })
      .catch(() => {
        // The page itself owns the user-facing load/error state. Context sync is best-effort.
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, user, setSelectedSpeciesId]);

  return null;
}
