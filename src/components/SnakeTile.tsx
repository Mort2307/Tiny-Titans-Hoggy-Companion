import { useNavigate } from "react-router-dom";

import WeightMiniChart from "./WeightMiniChart";

import { getWeightReminder } from "../utils/weightReminder";

import type { WeightRecord } from "../types/Weight";
import type { Snake } from "../types/Snake";

type SnakeTileProps = {
  id: string;
  name: string;
  photo: string;

  sex?: "Male" | "Female" | "Unknown";

  weightHistory?: WeightRecord[];

  snake?: Snake;

  clickDestination?: "profile" | "weight";
};

function SnakeTile({
  id,
  name,
  photo,
  sex,
  weightHistory = [],
  snake,
  clickDestination = "profile",
}: SnakeTileProps) {
  const navigate = useNavigate();

  // =========================================
  // SEX ICON
  // =========================================

  function getSexIcon() {
    if (sex === "Male") {
      return "♂️";
    }

    if (sex === "Female") {
      return "♀️";
    }

    return "⚪";
  }

  // =========================================
  // BUILD CHART HISTORY
  //
  // Includes:
  // - Starting weight
  // - Firestore weight records
  // - Current weight
  // =========================================

  function buildChartHistory(): WeightRecord[] {
    if (!snake) {
      return [...weightHistory];
    }

    const chartHistory: WeightRecord[] = [];

    // Starting weight
    if (
      snake.startingWeight !== null &&
      snake.startingWeight !== undefined &&
      snake.startingWeight > 0
    ) {
      chartHistory.push({
        id: `starting-${snake.id}`,
        snakeId: snake.id,
        weight: snake.startingWeight,
        date:
          snake.startingWeightDate ||
          snake.hatchDate ||
          snake.arrivalDate ||
          new Date()
            .toISOString()
            .split("T")[0],
        unit: "g",
      });
    }

    // Firestore weight history
    chartHistory.push(
      ...(snake.weightHistory ?? [])
    );

    // Current weight
    if (
      snake.weight !== null &&
      snake.weight !== undefined &&
      snake.weight > 0
    ) {
      const latestRecord =
        chartHistory[
          chartHistory.length - 1
        ];

      const currentDate =
        snake.lastWeighedDate ||
        new Date()
          .toISOString()
          .split("T")[0];

      // Don't duplicate the latest
      // recorded weight
      if (
        !latestRecord ||
        latestRecord.weight !== snake.weight ||
        latestRecord.date !== currentDate
      ) {
        chartHistory.push({
          id: `current-${snake.id}`,
          snakeId: snake.id,
          weight: snake.weight,
          date: currentDate,
          unit: "g",
        });
      }
    }

    // Sort oldest → newest
    return chartHistory.sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );
  }

  const chartHistory =
    buildChartHistory();

  // =========================================
  // LATEST WEIGHT DATE
  // =========================================

  function getLatestWeightDate() {
    if (!chartHistory.length) {
      return "-";
    }

    const latest =
      [...chartHistory].sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )[0];

    return latest.date
      .split("-")
      .reverse()
      .join("/");
  }

  // =========================================
  // WEIGHT REMINDER
  // =========================================

  function renderReminder() {
    if (!snake) {
      return null;
    }

    const reminder =
      getWeightReminder(snake);

    if (
      reminder.status === "disabled"
    ) {
      return null;
    }

    if (
      reminder.status === "overdue"
    ) {
      return (
        <p className="weight-reminder overdue">
          🔴 Weigh overdue by{" "}
          {Math.abs(
            reminder.daysRemaining ?? 0
          )}{" "}
          days
        </p>
      );
    }

    if (
      reminder.status === "due"
    ) {
      return (
        <p className="weight-reminder due">
          🟡 Weigh due today
        </p>
      );
    }

    return (
      <p className="weight-reminder upcoming">
        🟢 Weigh due in{" "}
        {reminder.daysRemaining} days
      </p>
    );
  }

  // =========================================
  // TILE NAVIGATION
  // =========================================

  function openTile() {
    if (
      clickDestination === "weight"
    ) {
      navigate(`/weights/${id}`);
      return;
    }

    navigate(`/snakes/${id}`);
  }

  // =========================================
  // RENDER
  // =========================================

  return (
    <div
      className="snake-tile"
      onClick={openTile}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          openTile();
        }
      }}
    >

      {/* ============================= */}
      {/* PHOTO */}
      {/* ============================= */}

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

      {/* ============================= */}
      {/* NAME */}
      {/* ============================= */}

      <h3>
        {name}
      </h3>

      {/* ============================= */}
      {/* SEX */}
      {/* ============================= */}

      {sex && (
        <p>
          {getSexIcon()} {sex}
        </p>
      )}

      {/* ============================= */}
      {/* WEIGHT */}
      {/* ============================= */}

      <div className="snake-weight-summary">

        <h4>
          ⚖️ Growth Chart
        </h4>

        {chartHistory.length >= 2 ? (
          <WeightMiniChart
            history={chartHistory}
          />
        ) : (
          <div className="weight-chart-empty">
            📈 Add more weight records
            <br />
            to see growth progress
          </div>
        )}

        <div className="snake-weight-meta">

          <small>
            {chartHistory.length}{" "}
            {chartHistory.length === 1
              ? "record"
              : "records"}
          </small>

          <small>
            Last weighed:{" "}
            {getLatestWeightDate()}
          </small>

        </div>

        {renderReminder()}

      </div>

    </div>
  );
}

export default SnakeTile;