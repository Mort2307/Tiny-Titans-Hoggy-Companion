import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import type {
  Snake,
} from "../types/Snake";

import type {
  FoodType,
  FeedingMethod,
  FeedingRecord,
  FeedingResponse,
} from "../types/Feeding";

import {
  getUserSnakes,
} from "../services/snakeService";

import {
  deleteSnakeFeeding,
  getSnakeFeedings,
  saveSnakeFeeding,
} from "../services/feedingService";

import {
  useAuth,
} from "../context/AuthContext";

import {
  generateId,
} from "../utils/generateId";

import BackHomeButton from "../components/BackHomeButton";

// ============================================================
// FOOD OPTIONS
// ============================================================

const foodTypes: FoodType[] = [
  "Pinkie Mouse",
  "Fuzzy Mouse",
  "Hopper Mouse",
  "Adult Mouse",
  "Rat Pup",
  "Rat Fuzzy",
  "Quail",
  "Other",
];

// ============================================================
// PREY SIZE OPTIONS
// ============================================================

const preySizes = [
  "Extra Small",
  "Small",
  "Medium",
  "Large",
  "Extra Large",
] as const;

type PreySize = typeof preySizes[number];

// ============================================================
// FEEDING METHODS
// ============================================================

const feedingMethods: FeedingMethod[] = [
  "Tongs",
  "Drop Feed",
  "Hand Fed",
  "Scented",
  "Other",
];

// ============================================================
// RESPONSES
// ============================================================

const feedingResponses: FeedingResponse[] = [
  "Accepted",
  "Refused",
  "Partial",
  "Regurgitated",
];

// ============================================================
// RESPONSE CONFIG
// ============================================================

const responseConfig: Record<
  FeedingResponse,
  {
    emoji: string;
    label: string;
    cssClass: string;
  }
> = {
  Accepted: {
    emoji: "✅",
    label: "Accepted",
    cssClass: "accepted",
  },
  Refused: {
    emoji: "❌",
    label: "Refused",
    cssClass: "refused",
  },
  Partial: {
    emoji: "⚠️",
    label: "Partial",
    cssClass: "partial",
  },
  Regurgitated: {
    emoji: "🔴",
    label: "Regurgitated",
    cssClass: "regurgitated",
  },
};

// ============================================================
// COMPONENT
// ============================================================

function FeedingTracker() {
  const {
    user,
    loading,
    profileLoading,
  } = useAuth();

  // ==========================================================
  // DATA STATE
  // ==========================================================

  const [
    snakes,
    setSnakes,
  ] = useState<Snake[]>([]);

  const [
    selectedSnakeId,
    setSelectedSnakeId,
  ] = useState("");

  const [
    feedings,
    setFeedings,
  ] = useState<FeedingRecord[]>([]);

  // ==========================================================
  // LOADING / UI STATE
  // ==========================================================

  const [
    loadingSnakes,
    setLoadingSnakes,
  ] = useState(true);

  const [
    loadingFeedings,
    setLoadingFeedings,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(null);

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [
    date,
    setDate,
  ] = useState(
    new Date()
      .toISOString()
      .split("T")[0]
  );

  const [
    foodType,
    setFoodType,
  ] = useState<FoodType>(
    "Pinkie Mouse"
  );

  const [
    customFood,
    setCustomFood,
  ] = useState("");

  const [
    size,
    setSize,
  ] = useState("");

  const [
    weight,
    setWeight,
  ] = useState("");

  const [
    feedingMethod,
    setFeedingMethod,
  ] = useState<FeedingMethod>(
    "Tongs"
  );

  const [
    response,
    setResponse,
  ] = useState<FeedingResponse>(
    "Accepted"
  );

  const [
    notes,
    setNotes,
  ] = useState("");

  // ==========================================================
  // LOAD USER SNAKES
  // ==========================================================

  useEffect(() => {
    if (
      loading ||
      profileLoading
    ) {
      return;
    }

    if (!user) {
      setSnakes([]);
      setSelectedSnakeId("");
      setLoadingSnakes(false);

      return;
    }

    const uid = user.uid;

    let cancelled = false;

    async function loadSnakes() {
      setLoadingSnakes(true);
      setError("");

      try {
        const loadedSnakes =
          await getUserSnakes(uid);

        if (cancelled) {
          return;
        }

        const validSnakes =
          loadedSnakes.filter(
            (snake) =>
              Boolean(snake?.id)
          );

        setSnakes(validSnakes);

        setSelectedSnakeId(
          (currentId) => {
            const currentStillExists =
              validSnakes.some(
                (snake) =>
                  snake.id === currentId
              );

            if (
              currentStillExists
            ) {
              return currentId;
            }

            return (
              validSnakes[0]?.id ??
              ""
            );
          }
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Tiny Titans: unable to load snakes for Feeding Tracker",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your snakes."
        );
      } finally {
        if (!cancelled) {
          setLoadingSnakes(false);
        }
      }
    }

    void loadSnakes();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loading,
    profileLoading,
  ]);

  // ==========================================================
  // LOAD FEEDINGS WHEN SNAKE CHANGES
  // ==========================================================

  useEffect(() => {
    if (
      !user ||
      !selectedSnakeId
    ) {
      setFeedings([]);
      setLoadingFeedings(false);

      return;
    }

    const uid = user.uid;
    const snakeId = selectedSnakeId;

    let cancelled = false;

    async function loadFeedings() {
      setLoadingFeedings(true);
      setError("");

      try {
        const history =
          await getSnakeFeedings(
            uid,
            snakeId
          );

        if (cancelled) {
          return;
        }

        setFeedings(history);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Tiny Titans: unable to load feeding history",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load feeding history."
        );
      } finally {
        if (!cancelled) {
          setLoadingFeedings(false);
        }
      }
    }

    void loadFeedings();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    selectedSnakeId,
  ]);

  // ==========================================================
  // SELECTED SNAKE
  // ==========================================================

  const selectedSnake =
    useMemo(
      () =>
        snakes.find(
          (snake) =>
            snake.id ===
            selectedSnakeId
        ),
      [
        snakes,
        selectedSnakeId,
      ]
    );

  // ==========================================================
  // RESPONSE COUNTS
  // ==========================================================

  const responseCounts =
    useMemo(() => {
      return {
        Accepted:
          feedings.filter(
            (feeding) =>
              feeding.response ===
              "Accepted"
          ).length,

        Refused:
          feedings.filter(
            (feeding) =>
              feeding.response ===
              "Refused"
          ).length,

        Partial:
          feedings.filter(
            (feeding) =>
              feeding.response ===
              "Partial"
          ).length,

        Regurgitated:
          feedings.filter(
            (feeding) =>
              feeding.response ===
              "Regurgitated"
          ).length,
      };
    }, [feedings]);

  // ==========================================================
  // ACCEPTANCE RATE
  // ==========================================================

  const acceptanceRate =
    feedings.length > 0
      ? Math.round(
          (
            responseCounts.Accepted /
            feedings.length
          ) * 100
        )
      : 0;

  // ==========================================================
  // DONUT CHART
  // ==========================================================

  const donutSegments =
    useMemo(() => {
      const total =
        feedings.length;

      if (total === 0) {
        return {
          background:
            "conic-gradient(#3a3a3a 0deg 360deg)",
        };
      }

      const acceptedDegrees =
        (
          responseCounts.Accepted /
          total
        ) * 360;

      const refusedDegrees =
        (
          responseCounts.Refused /
          total
        ) * 360;

      const partialDegrees =
        (
          responseCounts.Partial /
          total
        ) * 360;

      const acceptedEnd =
        acceptedDegrees;

      const refusedEnd =
        acceptedEnd +
        refusedDegrees;

      const partialEnd =
        refusedEnd +
        partialDegrees;

      return {
        background:
          `conic-gradient(
            #4ade80 0deg ${acceptedEnd}deg,
            #f87171 ${acceptedEnd}deg ${refusedEnd}deg,
            #facc15 ${refusedEnd}deg ${partialEnd}deg,
            #ef4444 ${partialEnd}deg 360deg
          )`,
      };
    }, [
      feedings.length,
      responseCounts,
    ]);

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetForm() {
    setEditingId(null);

    setDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setFoodType(
      "Pinkie Mouse"
    );

    setCustomFood("");

    setSize("");

    setWeight("");

    setFeedingMethod(
      "Tongs"
    );

    setResponse(
      "Accepted"
    );

    setNotes("");
  }

  // ==========================================================
  // EDIT FEEDING
  // ==========================================================

  function editFeeding(
    feeding: FeedingRecord
  ) {
    setEditingId(
      feeding.id
    );

    setDate(
      feeding.date
    );

    setFoodType(
      feeding.foodType
    );

    setCustomFood(
      feeding.customFood ?? ""
    );

    setSize(
      feeding.size ?? ""
    );

    setWeight(
      feeding.weight !== undefined
        ? String(
            feeding.weight
          )
        : ""
    );

    setFeedingMethod(
      feeding.feedingMethod ??
        "Tongs"
    );

    setResponse(
      feeding.response
    );

    setNotes(
      feeding.notes ?? ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ==========================================================
  // SAVE FEEDING
  // ==========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!user) {
      setError(
        "Please log in before recording a feeding."
      );

      return;
    }

    const uid = user.uid;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!selectedSnakeId) {
      setError(
        "Please select a snake."
      );

      return;
    }

    if (!date) {
      setError(
        "Please select a feeding date."
      );

      return;
    }

    if (
      foodType === "Other" &&
      !customFood.trim()
    ) {
      setError(
        "Please enter the food type."
      );

      return;
    }

    if (
      weight !== "" &&
      (
        Number.isNaN(
          Number(weight)
        ) ||
        Number(weight) < 0
      )
    ) {
      setError(
        "Please enter a valid prey weight."
      );

      return;
    }

    setSaving(true);

    try {
      const feedingId =
        editingId ??
        generateId();

      // ======================================================
      // BUILD FEEDING RECORD
      // ======================================================

      const feeding: FeedingRecord = {
        id: feedingId,

        snakeId:
          selectedSnakeId,

        date,

        foodType,

        ...(foodType === "Other"
          ? {
              customFood:
                customFood.trim(),
            }
          : {}),

        ...(size.trim()
          ? {
              size:
                size.trim(),
            }
          : {}),

        ...(weight !== ""
          ? {
              weight:
                Number(weight),
            }
          : {}),

        ...(feedingMethod
          ? {
              feedingMethod,
            }
          : {}),

        response,

        ...(notes.trim()
          ? {
              notes:
                notes.trim(),
            }
          : {}),
      };

      // ======================================================
      // SAVE TO FIRESTORE
      // ======================================================

      const savedFeeding =
        await saveSnakeFeeding(
          uid,
          feeding
        );

      // ======================================================
      // UPDATE LOCAL STATE
      // ======================================================

      setFeedings(
        (current) => {
          const withoutExisting =
            current.filter(
              (item) =>
                item.id !==
                savedFeeding.id
            );

          return [
            savedFeeding,
            ...withoutExisting,
          ].sort(
            (a, b) =>
              b.date.localeCompare(
                a.date
              )
          );
        }
      );

      setSuccess(
        editingId
          ? "Feeding record updated successfully."
          : "Feeding recorded successfully."
      );

      resetForm();
    } catch (err) {
      console.error(
        "Tiny Titans: unable to save feeding",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this feeding."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // DELETE FEEDING
  // ==========================================================

  async function handleDelete(
    feeding: FeedingRecord
  ) {
    if (!user) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete the feeding recorded on ${feeding.date}?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await deleteSnakeFeeding(
        user.uid,
        feeding.snakeId,
        feeding.id
      );

      setFeedings(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              feeding.id
          )
      );

      if (
        editingId ===
        feeding.id
      ) {
        resetForm();
      }

      setSuccess(
        "Feeding record deleted."
      );
    } catch (err) {
      console.error(
        "Tiny Titans: unable to delete feeding",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete this feeding."
      );
    }
  }

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const lastFeeding =
    feedings.length > 0
      ? feedings[0]
      : null;

  function getDaysSince(
    dateString: string
  ): number | null {
    if (!dateString) {
      return null;
    }

    const feedingDate =
      new Date(
        `${dateString}T00:00:00`
      );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const difference =
      today.getTime() -
      feedingDate.getTime();

    return Math.max(
      0,
      Math.floor(
        difference /
          86400000
      )
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading ||
    profileLoading
  ) {
    return (
      <div className="page-container">
        <BackHomeButton />

        <h1>
          🍽 Feeding Tracker
        </h1>

        <div className="tracker-card">
          <h3>
            Loading Tiny Titans...
          </h3>

          <p>
            Connecting to your account.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="page-container">
      <BackHomeButton />

      <h1>
        🍽 Feeding Tracker
      </h1>

      <p>
        Record meals, monitor feeding
        responses and keep a complete
        feeding history for every snake.
      </p>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          className="tracker-card"
          role="alert"
        >
          <strong>
            ⚠️ {error}
          </strong>
        </div>
      )}

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {success && (
        <div
          className="tracker-card"
          role="status"
        >
          <strong>
            ✅ {success}
          </strong>
        </div>
      )}

      {/* ======================================================
          NO SNAKES
      ====================================================== */}

      {!loadingSnakes &&
        snakes.length === 0 && (
          <div className="tracker-card">
            <h3>
              No snakes found 🐍
            </h3>

            <p>
              Add a snake to your Tiny Titans
              collection before recording a
              feeding.
            </p>
          </div>
        )}

      {snakes.length > 0 && (
        <>
          {/* ==================================================
              SNAKE SELECTOR
          ================================================== */}

          <div className="tracker-card">
            <h3>
              🐍 Snake
            </h3>

            <label htmlFor="feeding-snake">
              Record feeding for
            </label>

            <select
              id="feeding-snake"
              value={
                selectedSnakeId
              }
              onChange={(event) => {
                setSelectedSnakeId(
                  event.target.value
                );

                resetForm();

                setError("");
                setSuccess("");
              }}
              disabled={saving}
            >
              {snakes.map(
                (snake) => (
                  <option
                    key={
                      snake.id
                    }
                    value={
                      snake.id
                    }
                  >
                    {snake.name}
                  </option>
                )
              )}
            </select>

            {selectedSnake && (
              <p>
                🧬{" "}
                {selectedSnake.morphs.length > 0
                  ? selectedSnake.morphs.join(
                      ", "
                    )
                  : "Morph not recorded"}
              </p>
            )}
          </div>

          {/* ==================================================
              FEEDING FORM
          ================================================== */}

          <div className="tracker-card">
            <h3>
              {editingId
                ? "✏️ Edit Feeding"
                : "🍽️ Record Feeding"}
            </h3>

            <form
              onSubmit={
                handleSubmit
              }
            >
              {/* DATE */}

              <label htmlFor="feeding-date">
                Feeding Date
              </label>

              <input
                id="feeding-date"
                type="date"
                value={
                  date
                }
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
                disabled={
                  saving
                }
                required
              />

              {/* FOOD */}

              <label htmlFor="feeding-food">
                Food Type
              </label>

              <select
                id="feeding-food"
                value={
                  foodType
                }
                onChange={(event) =>
                  setFoodType(
                    event.target.value as FoodType
                  )
                }
                disabled={
                  saving
                }
              >
                {foodTypes.map(
                  (food) => (
                    <option
                      key={
                        food
                      }
                      value={
                        food
                      }
                    >
                      {food}
                    </option>
                  )
                )}
              </select>

              {/* CUSTOM FOOD */}

              {foodType ===
                "Other" && (
                <>
                  <label htmlFor="custom-food">
                    Food Description
                  </label>

                  <input
                    id="custom-food"
                    type="text"
                    value={
                      customFood
                    }
                    onChange={(event) =>
                      setCustomFood(
                        event.target.value
                      )
                    }
                    placeholder="e.g. quail chick"
                    disabled={
                      saving
                    }
                    required
                  />
                </>
              )}

              {/* PREY SIZE */}

              <label htmlFor="feeding-size">
                Prey Size
              </label>

              <select
                id="feeding-size"
                value={
                  preySizes.includes(
                    size as PreySize
                  )
                    ? size
                    : ""
                }
                onChange={(event) =>
                  setSize(
                    event.target.value
                  )
                }
                disabled={
                  saving
                }
              >
                <option value="">
                  Select prey size...
                </option>

                {preySizes.map(
                  (preySize) => (
                    <option
                      key={
                        preySize
                      }
                      value={
                        preySize
                      }
                    >
                      {preySize}
                    </option>
                  )
                )}
              </select>

              {/* WEIGHT */}

              <label htmlFor="feeding-weight">
                Prey Weight (g)
              </label>

              <input
                id="feeding-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={
                  weight
                }
                onChange={(event) =>
                  setWeight(
                    event.target.value
                  )
                }
                placeholder="e.g. 5.2"
                disabled={
                  saving
                }
              />

              {/* METHOD */}

              <label htmlFor="feeding-method">
                Feeding Method
              </label>

              <select
                id="feeding-method"
                value={
                  feedingMethod
                }
                onChange={(event) =>
                  setFeedingMethod(
                    event.target.value as FeedingMethod
                  )
                }
                disabled={
                  saving
                }
              >
                {feedingMethods.map(
                  (method) => (
                    <option
                      key={
                        method
                      }
                      value={
                        method
                      }
                    >
                      {method}
                    </option>
                  )
                )}
              </select>

              {/* RESPONSE */}

              <label htmlFor="feeding-response">
                Feeding Response
              </label>

              <select
                id="feeding-response"
                value={
                  response
                }
                onChange={(event) =>
                  setResponse(
                    event.target.value as FeedingResponse
                  )
                }
                disabled={
                  saving
                }
              >
                {feedingResponses.map(
                  (feedingResponse) => (
                    <option
                      key={
                        feedingResponse
                      }
                      value={
                        feedingResponse
                      }
                    >
                      {feedingResponse}
                    </option>
                  )
                )}
              </select>

              {/* NOTES */}

              <label htmlFor="feeding-notes">
                Notes
              </label>

              <textarea
                id="feeding-notes"
                value={
                  notes
                }
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Anything worth recording about this meal..."
                rows={4}
                disabled={
                  saving
                }
              />

              {/* BUTTONS */}

              <button
                type="submit"
                disabled={
                  saving
                }
              >
                {saving
                  ? "💾 Saving..."
                  : editingId
                    ? "💾 Update Feeding"
                    : "🍽️ Record Feeding"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="tracker-card">
            <h3>
              📊 Feeding Summary
            </h3>

            <p>
              <strong>
                Last meal:
              </strong>{" "}
              {lastFeeding
                ? lastFeeding.date
                : "No meals recorded"}
            </p>

            {lastFeeding && (
              <p>
                <strong>
                  Days since last meal:
                </strong>{" "}
                {getDaysSince(
                  lastFeeding.date
                )}
              </p>
            )}

            <p>
              <strong>
                Total recorded feeds:
              </strong>{" "}
              {feedings.length}
            </p>

            <p>
              <strong>
                Acceptance rate:
              </strong>{" "}
              {acceptanceRate}%
            </p>
          </div>

          {/* ==================================================
              FEEDING RESPONSE DONUT
          ================================================== */}

          <div className="tracker-card">
            <h3>
              🍽️ Feeding Response
            </h3>

            {feedings.length === 0 ? (
              <p>
                Record some meals to see
                feeding response statistics.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "20px",
                    padding:
                      "10px 0 20px",
                  }}
                >
                  {/* DONUT */}

                  <div
                    style={{
                      position:
                        "relative",
                      width:
                        "190px",
                      height:
                        "190px",
                      borderRadius:
                        "50%",
                      background:
                        donutSegments.background,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                    aria-label={`Feeding response breakdown. ${responseCounts.Accepted} accepted, ${responseCounts.Refused} refused, ${responseCounts.Partial} partial, ${responseCounts.Regurgitated} regurgitated.`}
                  >
                    <div
                      style={{
                        width:
                          "120px",
                        height:
                          "120px",
                        borderRadius:
                          "50%",
                        background:
                          "var(--background, #111)",
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        textAlign:
                          "center",
                      }}
                    >
                      <strong
                        style={{
                          fontSize:
                            "28px",
                        }}
                      >
                        {
                          feedings.length
                        }
                      </strong>

                      <span
                        style={{
                          fontSize:
                            "13px",
                          opacity:
                            0.75,
                        }}
                      >
                        Total feeds
                      </span>
                    </div>
                  </div>

                  {/* LEGEND */}

                  <div
                    style={{
                      width:
                        "100%",
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap:
                        "10px",
                    }}
                  >
                    {feedingResponses.map(
                      (
                        feedingResponse
                      ) => {
                        const count =
                          responseCounts[
                            feedingResponse
                          ];

                        const percentage =
                          feedings.length >
                          0
                            ? Math.round(
                                (
                                  count /
                                  feedings.length
                                ) *
                                  100
                              )
                            : 0;

                        const config =
                          responseConfig[
                            feedingResponse
                          ];

                        return (
                          <div
                            key={
                              feedingResponse
                            }
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                              gap:
                                "8px",
                              padding:
                                "10px",
                              borderRadius:
                                "10px",
                              background:
                                "rgba(255,255,255,0.04)",
                            }}
                          >
                            <span>
                              {
                                config.emoji
                              }{" "}
                              {
                                config.label
                              }
                            </span>

                            <strong>
                              {
                                count
                              }{" "}
                              <span
                                style={{
                                  opacity:
                                    0.65,
                                  fontSize:
                                    "12px",
                                }}
                              >
                                (
                                {
                                  percentage
                                }%)
                              </span>
                            </strong>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ==================================================
              HISTORY
          ================================================== */}

          <div className="tracker-card">
            <h3>
              📋 Feeding History
            </h3>

            {loadingFeedings && (
              <p>
                Loading feeding history...
              </p>
            )}

            {!loadingFeedings &&
              feedings.length === 0 && (
                <p>
                  No feeding records yet.
                  Record the first meal above.
                </p>
              )}

            {!loadingFeedings &&
              feedings.length > 0 && (
                <div>
                  {feedings.map(
                    (feeding) => {
                      const food =
                        feeding.foodType ===
                        "Other"
                          ? feeding.customFood ||
                            "Other"
                          : feeding.foodType;

                      const responseInfo =
                        responseConfig[
                          feeding.response
                        ];

                      return (
                        <div
                          key={
                            feeding.id
                          }
                          className="tracker-card"
                        >
                          <h3>
                            {
                              responseInfo.emoji
                            }{" "}
                            {
                              feeding.date
                            }
                          </h3>

                          <p>
                            🐁{" "}
                            <strong>
                              {
                                food
                              }
                            </strong>
                          </p>

                          {feeding.size && (
                            <p>
                              📏 Prey size:{" "}
                              {
                                feeding.size
                              }
                            </p>
                          )}

                          {feeding.weight !==
                            undefined && (
                            <p>
                              ⚖️ Prey weight:{" "}
                              {
                                feeding.weight
                              }g
                            </p>
                          )}

                          {feeding.feedingMethod && (
                            <p>
                              🍴 Method:{" "}
                              {
                                feeding.feedingMethod
                              }
                            </p>
                          )}

                          <p>
                            📊 Response:{" "}
                            <strong>
                              {
                                feeding.response
                              }
                            </strong>
                          </p>

                          {feeding.notes && (
                            <p>
                              📝{" "}
                              {
                                feeding.notes
                              }
                            </p>
                          )}

                          {/* ====================================
                              CENTRED ACTION BUTTONS
                          ==================================== */}

                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "center",
                              alignItems:
                                "center",
                              gap:
                                "12px",
                              width:
                                "100%",
                              marginTop:
                                "18px",
                              paddingTop:
                                "14px",
                              borderTop:
                                "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                editFeeding(
                                  feeding
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              ✏️ Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(
                                  feeding
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
          </div>
        </>
      )}
    </div>
  );
}

export default FeedingTracker;