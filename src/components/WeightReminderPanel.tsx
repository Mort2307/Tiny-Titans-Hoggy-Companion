import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Snake } from "../types/Snake";

import { migrateSnake } from "../utils/snakeMigration";
import { getUserSnakes } from "../services/snakeService";

import { useAuth } from "../context/useAuth";

import WeightMiniChart from "./WeightMiniChart";

function WeightReminderPanel() {
  const navigate = useNavigate();

  const { user, loading, profileLoading } = useAuth();

  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);

  useEffect(() => {
    async function loadSnakes() {
      if (loading || profileLoading) {
        return;
      }

      if (!user) {
        setSnakes([]);
        setLoadingSnakes(false);
        return;
      }

      try {
        const loadedSnakes = await getUserSnakes(
          user.uid
        );

        const migratedSnakes = loadedSnakes.map(
          (snake) => migrateSnake(snake)
        );

        setSnakes(migratedSnakes);
      } catch (error) {
        console.error(
          "Tiny Titans: unable to load weight records",
          error
        );

        setSnakes([]);
      } finally {
        setLoadingSnakes(false);
      }
    }

    void loadSnakes();
  }, [
    user,
    loading,
    profileLoading,
  ]);

  if (
    loading ||
    profileLoading ||
    loadingSnakes
  ) {
    return (
      <section className="weight-records-panel">

        <h2>
          ⚖️ Weight Records
        </h2>

        <p>
          Loading weight records...
        </p>

      </section>
    );
  }

  /*
   * Show every snake that has weight records.
   *
   * We deliberately do NOT filter by weight
   * reminder status here.
   *
   * A snake can have weight records even when
   * weight reminders are disabled.
   */
  const snakesWithWeights = snakes.filter(
    (snake) =>
      (snake.weightHistory?.length ?? 0) > 0
  );

  if (snakesWithWeights.length === 0) {
    return (
      <section className="weight-records-panel">

        <h2>
          ⚖️ Weight Records
        </h2>

        <div className="weight-records-empty">

          <p>
            No weight records yet.
          </p>

          <p>
            Add a weight record to one of
            your Tiny Titans and it will
            appear here.
          </p>

        </div>

      </section>
    );
  }

  return (
    <section className="weight-records-panel">

      <h2>
        ⚖️ Weight Records
      </h2>

      <div className="weight-reminder-grid">

        {snakesWithWeights.map(
          (snake) => (

            <div
              key={snake.id}
              className="weight-reminder-card"
            >

              {/* ========================= */}
              {/* SNAKE HEADER               */}
              {/* ========================= */}

              <div
                className="weight-reminder-click-area"
                onClick={() =>
                  navigate(
                    `/weights/${snake.id}`
                  )
                }
              >

                <div className="weight-reminder-header">

                  {snake.photo ? (
                    <img
                      src={snake.photo}
                      alt={snake.name}
                      className="weight-reminder-photo"
                    />
                  ) : (
                    <div className="weight-reminder-placeholder">
                      🐍
                    </div>
                  )}

                  <div>

                    <h3>
                      {snake.name}
                    </h3>

                    <p>
                      ⚖️ Current:{" "}
                      {snake.weight ?? "-"}g
                    </p>

                    <p>
                      📊{" "}
                      {snake.weightHistory?.length ?? 0}{" "}
                      records
                    </p>

                  </div>

                </div>

                {/* ========================= */}
                {/* GROWTH CHART              */}
                {/* ========================= */}

                <div className="weight-reminder-chart">

                  <h4>
                    📈 Growth Chart
                  </h4>

                  <WeightMiniChart
                    history={
                      snake.weightHistory ?? []
                    }
                  />

                </div>

              </div>

              {/* ========================= */}
              {/* OPEN RECORDS               */}
              {/* ========================= */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/weights/${snake.id}`
                  )
                }
              >
                📈 Open Weight Records
              </button>

            </div>

          )
        )}

      </div>

    </section>
  );
}

export default WeightReminderPanel;