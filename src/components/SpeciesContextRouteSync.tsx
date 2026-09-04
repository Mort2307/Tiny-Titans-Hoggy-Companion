import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getUserSnake } from "../services/snakeService";
import { findSnakeSpecies } from "../data/species/speciesRegistry";

const SNAKE_ID_ROUTES = [
  /^\/snakes\/([^/]+)(?:\/|$)/,
  /^\/weights\/([^/]+)(?:\/|$)/,
  /^\/feeding\/([^/]+)(?:\/|$)/,
  /^\/shedding\/([^/]+)(?:\/|$)/,
  /^\/behaviour\/([^/]+)(?:\/|$)/,
  /^\/health\/([^/]+)(?:\/|$)/,
  /^\/husbandry\/([^/]+)(?:\/|$)/,
  /^\/enclosure-intelligence\/([^/]+)(?:\/|$)/,
];

export default function SpeciesContextRouteSync() {
  const location = useLocation();
  const { user, loading, profileLoading } = useAuth();
  const { setSelectedSpeciesId } = useSpeciesContext();

  useEffect(() => {
    if (loading || profileLoading || !user) return;

    const match = SNAKE_ID_ROUTES.map((pattern) => location.pathname.match(pattern)).find(Boolean);
    const searchSnakeId = new URLSearchParams(location.search).get("snakeId");
    const snakeId = match?.[1] ?? searchSnakeId;
    if (!snakeId) return;

    let cancelled = false;
    void getUserSnake(user.uid, decodeURIComponent(snakeId))
      .then((snake) => {
        if (cancelled || !snake) return;
        const species = findSnakeSpecies(snake.species);
        if (species) setSelectedSpeciesId(species.id);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, user, loading, profileLoading, setSelectedSpeciesId]);

  return null;
}
