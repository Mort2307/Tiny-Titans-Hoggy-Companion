import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import { findSnakeSpecies } from "../data/species/speciesRegistry";
import { useSpeciesContext } from "../context/SpeciesContext";
import { useAuth } from "../context/useAuth";
import { deleteUserSnake } from "../services/snakeService";
import ConfirmActionDialog from "./ConfirmActionDialog";

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
  const { user } = useAuth();
  const { setSelectedSpeciesId } = useSpeciesContext();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function getSexIcon() {
    if (sex === "Male") return "♂️";
    if (sex === "Female") return "♀️";
    return "⚪";
  }

  function openTile() {
    const normalisedSnake = snake ? { ...snake, id: String(snake.id ?? id).trim() } : undefined;
    const species = normalisedSnake ? findSnakeSpecies(normalisedSnake.species) : undefined;
    if (species) setSelectedSpeciesId(species.id);

    if (onSelect && normalisedSnake) {
      onSelect(normalisedSnake);
      return;
    }
    navigate(clickDestination === "weight" ? `/weights/${id}` : `/snakes/${id}`);
  }

  async function confirmDelete() {
    if (!user || !id || deleting) return;
    setDeleting(true);
    try {
      await deleteUserSnake(user.uid, id);
      setDeleteOpen(false);
      navigate("/snakes", { replace: true });
    } catch (error) {
      console.error("Tiny Titans: unable to delete snake from tile", error);
      setDeleting(false);
      setDeleteOpen(false);
      window.alert(error instanceof Error ? error.message : "Unable to delete this snake. Please try again.");
    }
  }

  const destinationLabel = clickDestination === "weight" ? "weight tracker" : "profile";

  return (
    <span className="snake-tile-container" style={{ position: "relative", display: "inline-flex" }}>
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

      <button
        type="button"
        className="snake-tile-delete"
        onClick={(event) => {
          event.stopPropagation();
          setDeleteOpen(true);
        }}
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        disabled={deleting}
      >
        🗑️
      </button>

      <ConfirmActionDialog
        open={deleteOpen}
        title={`Delete ${name}?`}
        description={<p>This permanently removes the snake and its weight, feeding, shed, health and behaviour history from your Tiny Titans account.</p>}
        confirmLabel="Delete Snake"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => { if (!deleting) setDeleteOpen(false); }}
      />
    </span>
  );
}

export default SnakeTile;
