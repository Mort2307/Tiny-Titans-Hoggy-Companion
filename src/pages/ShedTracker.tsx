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
  ShedAssistance,
  ShedQuality,
  ShedRecord,
  ShedStatus,
  RetainedShedArea,
} from "../types/Shed";

import {
  getUserSnakes,
} from "../services/snakeService";

import {
  deleteSnakeShed,
  getSnakeSheds,
  saveSnakeShed,
} from "../services/shedService";

import {
  useAuth,
} from "../context/AuthContext";

import {
  generateId,
} from "../utils/generateId";

import BackHomeButton from "../components/BackHomeButton";


// ============================================================
// OPTIONS
// ============================================================

const shedQualities: ShedQuality[] = [
  "Perfect",
  "Good",
  "Partial",
  "Difficult",
  "Unknown",
];

const shedStatuses: ShedStatus[] = [
  "Complete",
  "Partial",
];

const retainedShedAreas: RetainedShedArea[] = [
  "None",
  "Eye Cap",
  "Tail Tip",
  "Body",
  "Multiple Areas",
];

const shedAssistances: ShedAssistance[] = [
  "None",
  "Monitoring Only",
  "Humidity Adjustment",
  "Keeper Intervention",
  "Veterinary Assistance",
];


// ============================================================
// COMPONENT
// ============================================================

function ShedTracker() {
  const {
    user,
    loading,
    profileLoading,
  } = useAuth();


  // ==========================================================
  // DATA
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
    sheds,
    setSheds,
  ] = useState<ShedRecord[]>([]);


  // ==========================================================
  // UI STATE
  // ==========================================================

  const [
    loadingSnakes,
    setLoadingSnakes,
  ] = useState(true);

  const [
    loadingSheds,
    setLoadingSheds,
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
    bluePhaseStarted,
    setBluePhaseStarted,
  ] = useState(false);

  const [
    eyesSkinCleared,
    setEyesSkinCleared,
  ] = useState(false);

  const [
    shedStatus,
    setShedStatus,
  ] = useState<ShedStatus>(
    "Complete"
  );

  const [
    retainedShedArea,
    setRetainedShedArea,
  ] = useState<RetainedShedArea>(
    "None"
  );

  const [
    retainedEyeCaps,
    setRetainedEyeCaps,
  ] = useState(false);

  const [
    retainedTailTip,
    setRetainedTailTip,
  ] = useState(false);

  const [
    quality,
    setQuality,
  ] = useState<ShedQuality>(
    "Unknown"
  );

  const [
    assistance,
    setAssistance,
  ] = useState<ShedAssistance>(
    "None"
  );

  const [
    shedLength,
    setShedLength,
  ] = useState("");

  const [
    snakeWeight,
    setSnakeWeight,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");


  // ==========================================================
  // SELECTED SNAKE
  // ==========================================================

  const selectedSnake = useMemo(
    () =>
      snakes.find(
        (snake) =>
          snake.id === selectedSnakeId
      ),
    [
      snakes,
      selectedSnakeId,
    ]
  );


  // ==========================================================
  // SHED LENGTH STATISTICS
  // ==========================================================

  const measuredSheds = useMemo(
    () =>
      sheds
        .filter(
          (shed) =>
            typeof shed.shedLength === "number" &&
            Number.isFinite(shed.shedLength) &&
            shed.shedLength > 0
        )
        .sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
    [sheds]
  );

  const totalShedLength = useMemo(
    () =>
      measuredSheds.reduce(
        (total, shed) =>
          total + (shed.shedLength ?? 0),
        0
      ),
    [measuredSheds]
  );

  const averageShedLength =
    measuredSheds.length > 0
      ? totalShedLength /
        measuredSheds.length
      : 0;

  const shortestShedLength =
    measuredSheds.length > 0
      ? Math.min(
          ...measuredSheds.map(
            (shed) =>
              shed.shedLength ?? 0
          )
        )
      : 0;

  const longestShedLength =
    measuredSheds.length > 0
      ? Math.max(
          ...measuredSheds.map(
            (shed) =>
              shed.shedLength ?? 0
          )
        )
      : 0;


  // ==========================================================
  // LOAD SNAKES
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
            const stillExists =
              validSnakes.some(
                (snake) =>
                  snake.id === currentId
              );

            if (stillExists) {
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
          "Tiny Titans: unable to load snakes for Shed Tracker",
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
  // LOAD SHEDS
  // ==========================================================

  useEffect(() => {
    if (
      !user ||
      !selectedSnakeId
    ) {
      setSheds([]);
      setLoadingSheds(false);
      return;
    }

    const uid = user.uid;
    const snakeId = selectedSnakeId;

    let cancelled = false;

    async function loadSheds() {
      setLoadingSheds(true);
      setError("");

      try {
        const history =
          await getSnakeSheds(
            uid,
            snakeId
          );

        if (cancelled) {
          return;
        }

        setSheds(history);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Tiny Titans: unable to load shed history",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load shed history."
        );
      } finally {
        if (!cancelled) {
          setLoadingSheds(false);
        }
      }
    }

    void loadSheds();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    selectedSnakeId,
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

    setBluePhaseStarted(false);
    setEyesSkinCleared(false);

    setShedStatus(
      "Complete"
    );

    setRetainedShedArea(
      "None"
    );

    setRetainedEyeCaps(false);
    setRetainedTailTip(false);

    setQuality(
      "Unknown"
    );

    setAssistance(
      "None"
    );

    setShedLength("");
    setSnakeWeight("");

    setNotes("");
  }


  // ==========================================================
  // EDIT
  // ==========================================================

  function editShed(
    shed: ShedRecord
  ) {
    setEditingId(shed.id);

    setDate(shed.date);

    setBluePhaseStarted(
      shed.bluePhaseStarted
    );

    setEyesSkinCleared(
      shed.eyesSkinCleared
    );

    setShedStatus(
      shed.shedCompleted
        ? "Complete"
        : "Partial"
    );

    setRetainedShedArea(
      shed.retainedShedArea ??
      "None"
    );

    setRetainedEyeCaps(
      shed.retainedEyeCaps
    );

    setRetainedTailTip(
      shed.retainedTailTip
    );

    setQuality(
      shed.quality
    );

    setAssistance(
      shed.assistance ??
      "None"
    );

    setShedLength(
      shed.shedLength !== undefined
        ? String(shed.shedLength)
        : ""
    );

    setSnakeWeight(
      shed.snakeWeight !== undefined
        ? String(shed.snakeWeight)
        : ""
    );

    setNotes(
      shed.notes ?? ""
    );

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  // ==========================================================
  // SAVE
  // ==========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!user) {
      setError(
        "Please log in before recording a shed."
      );
      return;
    }

    const uid = user.uid;

    if (!selectedSnakeId) {
      setError(
        "Please select a snake."
      );
      return;
    }

    if (!date) {
      setError(
        "Please select a shed date."
      );
      return;
    }

    if (
      shedLength !== "" &&
      (
        Number.isNaN(
          Number(shedLength)
        ) ||
        Number(shedLength) < 0
      )
    ) {
      setError(
        "Please enter a valid shed length."
      );
      return;
    }

    if (
      snakeWeight !== "" &&
      (
        Number.isNaN(
          Number(snakeWeight)
        ) ||
        Number(snakeWeight) < 0
      )
    ) {
      setError(
        "Please enter a valid snake weight."
      );
      return;
    }

    setSaving(true);

    try {
      const shedId =
        editingId ??
        generateId();

      const shed: ShedRecord = {
        id: shedId,

        snakeId:
          selectedSnakeId,

        date,

        bluePhaseStarted,

        eyesSkinCleared,

        shedCompleted:
          shedStatus === "Complete",

        retainedShedArea,

        retainedEyeCaps,

        retainedTailTip,

        quality,

        assistance,

        ...(shedLength !== ""
          ? {
              shedLength:
                Number(shedLength),
            }
          : {}),

        ...(snakeWeight !== ""
          ? {
              snakeWeight:
                Number(snakeWeight),
            }
          : {}),

        notes:
          notes.trim(),
      };

      const savedShed =
        await saveSnakeShed(
          uid,
          shed
        );

      setSheds(
        (current) => {
          const withoutExisting =
            current.filter(
              (item) =>
                item.id !==
                savedShed.id
            );

          return [
            savedShed,
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
          ? "Shed record updated successfully."
          : "Shed recorded successfully."
      );

      resetForm();
    } catch (err) {
      console.error(
        "Tiny Titans: unable to save shed",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this shed."
      );
    } finally {
      setSaving(false);
    }
  }


  // ==========================================================
  // DELETE
  // ==========================================================

  async function handleDelete(
    shed: ShedRecord
  ) {
    if (!user) {
      return;
    }

    const uid = user.uid;

    const confirmed =
      window.confirm(
        `Delete the shed recorded on ${shed.date}?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await deleteSnakeShed(
        uid,
        shed.snakeId,
        shed.id
      );

      setSheds(
        (current) =>
          current.filter(
            (item) =>
              item.id !== shed.id
          )
      );

      if (
        editingId === shed.id
      ) {
        resetForm();
      }

      setSuccess(
        "Shed record deleted."
      );
    } catch (err) {
      console.error(
        "Tiny Titans: unable to delete shed",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete this shed."
      );
    }
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
          🐍 Shed Tracker
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
        🐍 Shed Tracker
      </h1>

      <p>
        Track the complete shed cycle,
        inspect the finished shed and
        record anything that needs attention.
      </p>


      {/* ======================================================
          MESSAGES
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
              collection before recording a shed.
            </p>

          </div>
        )}


      {snakes.length > 0 && (
        <>


          {/* ==================================================
              FORM
          ================================================== */}

          <form
            id="shed-form"
            onSubmit={handleSubmit}
          >


            {/* ==================================================
                SNAKE
            ================================================== */}

            <div className="tracker-card">

              <h3>
                🐍 Snake
              </h3>

              <label htmlFor="shed-snake">
                Record shed for
              </label>

              <select
                id="shed-snake"
                value={selectedSnakeId}
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
                      key={snake.id}
                      value={snake.id}
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
                SHED CYCLE
            ================================================== */}

            <div className="tracker-card">

              <h3>
                🔄 Shed Cycle
              </h3>

              <label htmlFor="shed-date">
                Shed Date
              </label>

              <input
                id="shed-date"
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
                disabled={saving}
                required
              />


              <label>
                <input
                  type="checkbox"
                  checked={
                    bluePhaseStarted
                  }
                  onChange={(event) =>
                    setBluePhaseStarted(
                      event.target.checked
                    )
                  }
                  disabled={saving}
                />

                {" "}🔵 Blue Phase Started
              </label>


              <label>
                <input
                  type="checkbox"
                  checked={
                    eyesSkinCleared
                  }
                  onChange={(event) =>
                    setEyesSkinCleared(
                      event.target.checked
                    )
                  }
                  disabled={saving}
                />

                {" "}👁️ Eyes / Skin Cleared
              </label>


              <label htmlFor="shed-status">
                Shed Status
              </label>

              <select
                id="shed-status"
                value={shedStatus}
                onChange={(event) =>
                  setShedStatus(
                    event.target.value as ShedStatus
                  )
                }
                disabled={saving}
              >

                {shedStatuses.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}

              </select>

            </div>


            {/* ==================================================
                INSPECTION
            ================================================== */}

            <div className="tracker-card">

              <h3>
                🔍 Shed Inspection
              </h3>

              <p>
                Check the snake and the shed
                before assessing its overall condition.
              </p>

              <label htmlFor="retained-shed">
                Retained Shed
              </label>

              <select
                id="retained-shed"
                value={retainedShedArea}
                onChange={(event) =>
                  setRetainedShedArea(
                    event.target.value as RetainedShedArea
                  )
                }
                disabled={saving}
              >

                {retainedShedAreas.map(
                  (area) => (
                    <option
                      key={area}
                      value={area}
                    >
                      {area}
                    </option>
                  )
                )}

              </select>


              <label>
                <input
                  type="checkbox"
                  checked={
                    retainedEyeCaps
                  }
                  onChange={(event) =>
                    setRetainedEyeCaps(
                      event.target.checked
                    )
                  }
                  disabled={saving}
                />

                {" "}👁️ Retained Eye Caps
              </label>


              <label>
                <input
                  type="checkbox"
                  checked={
                    retainedTailTip
                  }
                  onChange={(event) =>
                    setRetainedTailTip(
                      event.target.checked
                    )
                  }
                  disabled={saving}
                />

                {" "}🐍 Retained Tail Tip
              </label>

            </div>


            {/* ==================================================
                CONDITION
            ================================================== */}

            <div className="tracker-card">

              <h3>
                🩺 Shed Condition
              </h3>


              <label htmlFor="shed-quality">
                Shed Quality
              </label>

              <select
                id="shed-quality"
                value={quality}
                onChange={(event) =>
                  setQuality(
                    event.target.value as ShedQuality
                  )
                }
                disabled={saving}
              >

                {shedQualities.map(
                  (shedQuality) => (
                    <option
                      key={shedQuality}
                      value={shedQuality}
                    >
                      {shedQuality}
                    </option>
                  )
                )}

              </select>


              <label htmlFor="shed-assistance">
                Assistance
              </label>

              <select
                id="shed-assistance"
                value={assistance}
                onChange={(event) =>
                  setAssistance(
                    event.target.value as ShedAssistance
                  )
                }
                disabled={saving}
              >

                {shedAssistances.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </div>


            {/* ==================================================
                MEASUREMENTS
            ================================================== */}

            <div className="tracker-card">

              <h3>
                📏 Measurements
              </h3>


              <label htmlFor="shed-length">
                Shed Length (cm)
              </label>

              <input
                id="shed-length"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={shedLength}
                onChange={(event) =>
                  setShedLength(
                    event.target.value
                  )
                }
                placeholder="e.g. 42.5"
                disabled={saving}
              />


              <label htmlFor="snake-weight">
                Snake Weight (g)
              </label>

              <input
                id="snake-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={snakeWeight}
                onChange={(event) =>
                  setSnakeWeight(
                    event.target.value
                  )
                }
                placeholder="e.g. 90"
                disabled={saving}
              />

            </div>


            {/* ==================================================
                SHED GROWTH
            ================================================== */}

            <div className="tracker-card">

              <h3>
                🐍 Shed Growth
              </h3>

              <p>
                Watch the total length of all measured
                sheds grow over time.
              </p>


              <div
                style={{
                  textAlign: "center",
                  padding: "20px 10px",
                }}
              >

                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  {totalShedLength.toFixed(1)} cm
                </div>

                <div
                  style={{
                    opacity: 0.75,
                    marginBottom: "20px",
                  }}
                >
                  Total recorded shed length
                </div>

              </div>


              {/* ==================================================
                  SHED STATS
              ================================================== */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >

                <div
                  className="tracker-card"
                  style={{
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  <strong>
                    {measuredSheds.length}
                  </strong>

                  <div>
                    Measured sheds
                  </div>
                </div>


                <div
                  className="tracker-card"
                  style={{
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  <strong>
                    {averageShedLength.toFixed(1)} cm
                  </strong>

                  <div>
                    Average
                  </div>
                </div>


                <div
                  className="tracker-card"
                  style={{
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  <strong>
                    {longestShedLength.toFixed(1)} cm
                  </strong>

                  <div>
                    Longest
                  </div>
                </div>


                <div
                  className="tracker-card"
                  style={{
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  <strong>
                    {shortestShedLength.toFixed(1)} cm
                  </strong>

                  <div>
                    Shortest
                  </div>
                </div>

              </div>

            </div>


            {/* ==================================================
                NOTES
            ================================================== */}

            <div className="tracker-card">

              <h3>
                📝 Notes
              </h3>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Anything worth recording about this shed..."
                rows={4}
                disabled={saving}
              />

            </div>


            {/* ==================================================
                BUTTONS
            ================================================== */}

            <div className="tracker-card">

              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "💾 Saving..."
                  : editingId
                    ? "💾 Update Shed"
                    : "🐍 Record Shed"}
              </button>


              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel Edit
                </button>
              )}

            </div>

          </form>


          {/* ==================================================
              HISTORY
          ================================================== */}

          <div className="tracker-card">

            <h3>
              📋 Shed History
            </h3>


            {loadingSheds && (
              <p>
                Loading shed history...
              </p>
            )}


            {!loadingSheds &&
              sheds.length === 0 && (
                <p>
                  No shed records yet.
                  Record the first shed above.
                </p>
              )}


            {!loadingSheds &&
              sheds.length > 0 && (
                <div>

                  {sheds.map(
                    (shed) => (
                      <div
                        key={shed.id}
                        className="tracker-card"
                      >

                        <h3>
                          {shed.quality === "Perfect"
                            ? "🟢"
                            : shed.quality === "Good"
                              ? "🔵"
                              : shed.quality === "Partial"
                                ? "🟡"
                                : shed.quality === "Difficult"
                                  ? "🔴"
                                  : "⚪"}

                          {" "}

                          {shed.date}
                        </h3>


                        <p>
                          🔵 Blue:{" "}
                          <strong>
                            {shed.bluePhaseStarted
                              ? "Started"
                              : "Not recorded"}
                          </strong>
                        </p>


                        <p>
                          👁️ Clear:{" "}
                          <strong>
                            {shed.eyesSkinCleared
                              ? "Yes"
                              : "Not recorded"}
                          </strong>
                        </p>


                        <p>
                          🐍 Shed:{" "}
                          <strong>
                            {shed.shedCompleted
                              ? "Complete"
                              : "Partial"}
                          </strong>
                        </p>


                        <p>
                          🔍 Retained shed:{" "}
                          <strong>
                            {shed.retainedShedArea}
                          </strong>
                        </p>


                        {shed.retainedEyeCaps && (
                          <p>
                            ⚠️ Retained eye caps
                          </p>
                        )}


                        {shed.retainedTailTip && (
                          <p>
                            ⚠️ Retained tail tip
                          </p>
                        )}


                        <p>
                          🩺 Quality:{" "}
                          <strong>
                            {shed.quality}
                          </strong>
                        </p>


                        <p>
                          🛠️ Assistance:{" "}
                          <strong>
                            {shed.assistance}
                          </strong>
                        </p>


                        {shed.shedLength !==
                          undefined && (
                          <p>
                            📏 Shed length:{" "}
                            {shed.shedLength}cm
                          </p>
                        )}


                        {shed.snakeWeight !==
                          undefined && (
                          <p>
                            ⚖️ Snake weight:{" "}
                            {shed.snakeWeight}g
                          </p>
                        )}


                        {shed.notes && (
                          <p>
                            📝{" "}
                            {shed.notes}
                          </p>
                        )}


                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "wrap",
                            width: "100%",
                            marginTop: "16px",
                          }}
                        >

                          <button
                            type="button"
                            onClick={() =>
                              editShed(shed)
                            }
                            disabled={saving}
                          >
                            ✏️ Edit
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              void handleDelete(
                                shed
                              )
                            }
                            disabled={saving}
                          >
                            🗑️ Delete
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

          </div>

        </>
      )}

    </div>
  );
}


export default ShedTracker;