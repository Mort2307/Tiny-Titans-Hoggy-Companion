import { useNavigate } from "react-router-dom";
import WeightMiniChart from "./WeightMiniChart";

import type { WeightRecord } from "../types/Weight";

type SnakeTileProps = {
  id: string;
  name: string;
  photo: string;
  sex?: "Male" | "Female" | "Unknown";
  weight?: number | null;
  weightHistory?: WeightRecord[];

  // NEW
  clickDestination?: "profile" | "weight";
};

function SnakeTile({
  id,
  name,
  photo,
  sex,
  weight,
  weightHistory = [],
  clickDestination = "profile",
}: SnakeTileProps) {
  const navigate = useNavigate();

  function sexIcon() {
    if (sex === "Male") return "♂️";
    if (sex === "Female") return "♀️";
    return "⚪";
  }

  function latestWeightDate() {
    if (!weightHistory.length) return "-";

    const sorted = [...weightHistory].sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

    return sorted[0].date
      .split("-")
      .reverse()
      .join("/");
  }

  function openTile() {
    if (clickDestination === "weight") {
      navigate(`/weights/${id}`);
      return;
    }

    navigate(`/snakes/${id}`);
  }

  return (
    <div
      className="snake-tile"
      onClick={openTile}
    >
      {photo ? (
        <img
          src={photo}
          alt={name}
        />
      ) : (
        <div className="snake-placeholder">
          🐍
        </div>
      )}

      <h3>{name}</h3>

      {sex && (
        <p>
          {sexIcon()} {sex}
        </p>
      )}

      <div className="snake-weight-summary">
        <h4>⚖️ Weight</h4>

        <strong>
          {weight ?? "-"} g
        </strong>

        <div
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/weights/${id}`);
          }}
          style={{ cursor: "pointer" }}
        >
          <WeightMiniChart history={weightHistory} />

          <small>
            📈 Click graph for weight records
          </small>
        </div>

        <small>
          Last weighed: {latestWeightDate()}
        </small>
      </div>
    </div>
  );
}

export default SnakeTile;