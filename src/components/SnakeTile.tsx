import { useNavigate } from "react-router-dom";

import type { Snake } from "../types/Snake";

type SnakeTileProps = {
  id: string;
  name: string;
  photo: string;
  sex?: "Male" | "Female" | "Unknown";
  snake?: Snake;
  clickDestination?: "profile" | "weight";
  onSelect?: (snake: Snake) => void;
};

function SnakeTile({ id, name, photo, sex, snake, clickDestination = "profile", onSelect }: SnakeTileProps) {
  const navigate = useNavigate();

  function getSexIcon() {
    if (sex === "Male") return "♂️";
    if (sex === "Female") return "♀️";
    return "⚪";
  }

  function openTile() {
    // Profile tiles are direct navigation targets. This avoids the old
    // select-then-scroll interaction on My Snakes, especially on mobile.
    if (clickDestination === "profile") {
      navigate(`/snakes/${id}`);
      return;
    }

    if (onSelect && snake) {
      onSelect({ ...snake, id: String(snake.id ?? id).trim() });
      return;
    }

    navigate(`/weights/${id}`);
  }

  const destinationLabel = clickDestination === "weight" ? "weight tracker" : "profile";

  return (
    <button type="button" className="snake-tile snake-tile-circle" onClick={openTile} aria-label={`Open ${name} ${destinationLabel}`}>
      <span className="snake-tile-avatar">{photo ? <img src={photo} alt="" aria-hidden="true" /> : <span>🐍</span>}</span>
      <span className="snake-tile-name">{name}</span>
      {sex && <span className="snake-tile-sex">{getSexIcon()}</span>}
    </button>
  );
}

export default SnakeTile;
