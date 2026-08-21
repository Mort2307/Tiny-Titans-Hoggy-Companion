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
  selected?: boolean;
};

function SnakeTile({ id, name, photo, sex, snake, clickDestination = "profile", onSelect, selected = false }: SnakeTileProps) {
  const navigate = useNavigate();

  function getSexIcon() {
    if (sex === "Male") return "♂️";
    if (sex === "Female") return "♀️";
    return "⚪";
  }

  function openTile() {
    if (onSelect && snake) {
      onSelect({ ...snake, id: String(snake.id ?? id).trim() });
      return;
    }
    navigate(clickDestination === "weight" ? `/weights/${id}` : `/snakes/${id}`);
  }

  const destinationLabel = clickDestination === "weight" ? "weight tracker" : "profile";

  return (
    <button
      type="button"
      className={`snake-tile snake-tile-circle${selected ? " is-selected" : ""}`}
      onClick={openTile}
      aria-label={onSelect ? `${selected ? "Deselect" : "Select"} ${name}` : `Open ${name} ${destinationLabel}`}
      aria-pressed={onSelect ? selected : undefined}
    >
      <span className="snake-tile-avatar">{photo ? <img src={photo} alt="" aria-hidden="true" /> : <span>🐍</span>}</span>
      <span className="snake-tile-name">{name}</span>
      {sex && <span className="snake-tile-sex">{getSexIcon()}</span>}
    </button>
  );
}

export default SnakeTile;
