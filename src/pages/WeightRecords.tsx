import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import BackHomeButton from "../components/BackHomeButton";
import WeightChart from "../components/WeightChart";

import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";

import { migrateSnake } from "../utils/snakeMigration";
import { getWeightReminder } from "../utils/weightReminder";

import {
  getUserSnake,
  saveUserSnake,
} from "../services/snakeService";

import { useAuth } from "../context/AuthContext";

// =========================================
// SORT WEIGHT HISTORY
// =========================================

function sortWeightHistory(
  history: WeightRecord[]
): WeightRecord[] {
  return [...history].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );
}

// =========================================
// DATE HELPERS
// =========================================

function formatDateForDisplay(
  isoDate: string
): string {
  if (!isoDate) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = isoDate.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  return `${day}/${month}/${year}`;
}

// =========================================
// DATE INPUT MASK
// =========================================
//
// Displays:
//
// DD/MM/YYYY
//
// The user can type:
//
// 10
// 10/
// 10/08
// 10/08/
// 10/08/2026
//
// Numbers and "/" are accepted.
// The slashes are automatically maintained.
//
// =========================================

function formatTypedDate(
  value: string
): string {
  const digits =
    value
      .replace(/\D/g, "")
      .slice(0, 8);

  if (!digits) {
    return "";
  }

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  if (
    digits.length <= 4
  ) {
    return (
      `${digits.slice(0, 2)}/` +
      `${digits.slice(2)}`
    );
  }

  return (
    `${digits.slice(0, 2)}/` +
    `${digits.slice(2, 4)}/` +
    `${digits.slice(4, 8)}`
  );
}

// =========================================
// PARSE TYPED DATE
// =========================================
//
// Converts:
//
// DD/MM/YYYY
//
// into:
//
// YYYY-MM-DD
//
// =========================================

function parseTypedDate(
  value: string
): string | null {
  const cleaned =
    value.trim();

  if (!cleaned) {
    return null;
  }

  /*
   * IMPORTANT:
   *
   * The "/" characters MUST be escaped
   * because "/" is also the JavaScript
   * regular-expression delimiter.
   */

  const match =
    cleaned.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

  if (!match) {
    return null;
  }

  const day =
    Number(match[1]);

  const month =
    Number(match[2]);

  const year =
    Number(match[3]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1900 ||
    year > 2100
  ) {
    return null;
  }

  /*
   * JavaScript will automatically roll
   * invalid dates forward.
   *
   * Example:
   *
   * 31/02/2026
   *
   * could become a March date.
   *
   * These checks prevent that.
   */

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return (
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  );
}

// =========================================
// SAFE RECORD ID
// =========================================
//
// crypto.randomUUID() is not available
// in every Android/WebView environment.
//
// Use it when available, otherwise
// generate a safe fallback ID.
//
// =========================================

function createRecordId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `weight-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 11)}`;
}

// =========================================
// WEIGHT RECORDS
// =========================================

function WeightRecords() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const {
    user,
    loading,
    profileLoading,
  } = useAuth();

  const [snake, setSnake] =
    useState<Snake | null>(
      null
    );

  const [loadingSnake, setLoadingSnake] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const [weight, setWeight] =
    useState("");

  const [date, setDate] =
    useState(today);

  const [typedDate, setTypedDate] =
    useState(
      formatDateForDisplay(
        today
      )
    );

  const [dateError, setDateError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // =========================================
  // LOAD SNAKE FROM FIRESTORE
  // =========================================

  useEffect(() => {
    async function loadSnake() {
      if (
        loading ||
        profileLoading
      ) {
        return;
      }

      if (!user) {
        setError(
          "You must be logged in to view this snake."
        );

        setLoadingSnake(false);

        return;
      }

      if (!id) {
        setError(
          "No snake ID was supplied."
        );

        setLoadingSnake(false);

        return;
      }

      try {
        console.log(
          "Tiny Titans: loading weight records from Firestore",
          id
        );

        const loadedSnake =
          await getUserSnake(
            user.uid,
            id
          );

        if (!loadedSnake) {
          console.error(
            "Tiny Titans: snake not found",
            id
          );

          setSnake(null);

          setError(
            "This snake could not be found."
          );

          setLoadingSnake(false);

          return;
        }

        const migratedSnake =
          migrateSnake(
            loadedSnake
          );

        migratedSnake.weightHistory =
          sortWeightHistory(
            migratedSnake.weightHistory ??
              []
          );

        console.log(
          "Tiny Titans: weight records loaded successfully",
          migratedSnake
        );

        setSnake(
          migratedSnake
        );

        setError(null);
      } catch (err) {
        console.error(
          "Tiny Titans: unable to load weight records",
          err
        );

        setSnake(null);

        setError(
          "Unable to load this snake. Please try again."
        );
      } finally {
        setLoadingSnake(false);
      }
    }

    void loadSnake();
  }, [
    id,
    user,
    loading,
    profileLoading,
  ]);

  // =========================================
  // TYPED DATE CHANGE
  // =========================================

  function handleTypedDateChange(
    value: string
  ) {
    /*
     * Rebuild the date mask every time
     * the user types.
     *
     * This allows the user to type:
     *
     * 10/08/2026
     *
     * while the displayed format remains:
     *
     * DD/MM/YYYY
     */

    const formatted =
      formatTypedDate(
        value
      );

    setTypedDate(
      formatted
    );

    setDateError("");

    /*
     * Empty input means no date.
     */

    if (!formatted) {
      setDate("");

      return;
    }

    /*
     * Only update the internal ISO date
     * when the typed date is complete
     * and valid.
     */

    const parsed =
      parseTypedDate(
        formatted
      );

    if (parsed) {
      setDate(parsed);
    }
  }

  // =========================================
  // CALENDAR DATE CHANGE
  // =========================================

  function handleCalendarDateChange(
    value: string
  ) {
    if (!value) {
      setDate("");
      setTypedDate("");
      setDateError("");

      return;
    }

    setDate(value);

    setTypedDate(
      formatDateForDisplay(
        value
      )
    );

    setDateError("");
  }

  // =========================================
  // ADD WEIGHT RECORD
  // =========================================

  async function addWeight() {
    if (
      !snake ||
      !user
    ) {
      console.error(
        "Tiny Titans: cannot save weight - missing snake or user",
        {
          snake,
          user,
        }
      );

      return;
    }

    const value =
      Number(weight);

    // =========================================
    // VALIDATE WEIGHT
    // =========================================

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      alert(
        "Please enter a valid weight."
      );

      return;
    }

    // =========================================
    // VALIDATE DATE
    // =========================================

    const finalDate =
      parseTypedDate(
        typedDate
      );

    if (!finalDate) {
      setDateError(
        "Please enter a valid date, e.g. 10/08/2026."
      );

      return;
    }

    setDate(finalDate);

    setSaving(true);

    try {
      // =========================================
      // CREATE RECORD
      // =========================================

      const newRecord: WeightRecord =
        {
          id:
            createRecordId(),

          snakeId:
            snake.id,

          weight:
            value,

          date:
            finalDate,

          unit:
            "g",
        };

      console.log(
        "Tiny Titans: new weight record",
        newRecord
      );

      // =========================================
      // UPDATE HISTORY
      // =========================================

      const updatedHistory =
        sortWeightHistory([
          ...(snake.weightHistory ??
            []),
          newRecord,
        ]);

      // =========================================
      // FIND NEWEST RECORD
      // =========================================

      const newest =
        updatedHistory[
          updatedHistory.length - 1
        ];

      if (!newest) {
        throw new Error(
          "Unable to determine newest weight record."
        );
      }

      // =========================================
      // BUILD UPDATED SNAKE
      // =========================================

      const updatedSnake: Snake =
        migrateSnake({
          ...snake,

          weight:
            newest.weight,

          lastWeighedDate:
            newest.date,

          weightHistory:
            updatedHistory,
        });

      console.log(
        "Tiny Titans: saving weight record to Firestore",
        {
          userId:
            user.uid,

          snakeId:
            updatedSnake.id,

          weightHistoryLength:
            updatedSnake.weightHistory
              ?.length,

          currentWeight:
            updatedSnake.weight,

          lastWeighedDate:
            updatedSnake.lastWeighedDate,
        }
      );

      // =========================================
      // SAVE TO FIRESTORE
      // =========================================

      await saveUserSnake(
        user.uid,
        updatedSnake
      );

      console.log(
        "Tiny Titans: weight record saved successfully"
      );

      // =========================================
      // UPDATE UI
      // =========================================

      setSnake(
        updatedSnake
      );

      setWeight("");

      setDate(today);

      setTypedDate(
        formatDateForDisplay(
          today
        )
      );

      setDateError("");
    } catch (err) {
      console.error(
        "Tiny Titans: unable to save weight record",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unknown error";

      console.error(
        "Tiny Titans: save error detail:",
        message
      );

      alert(
        `Unable to save this weight record.\n\n${message}`
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // LOADING
  // =========================================

  if (
    loading ||
    profileLoading ||
    loadingSnake
  ) {
    return (
      <div>
        <BackHomeButton />

        <h1>
          ⚖️ Loading Weight Records...
        </h1>

        <div className="tracker-card">
          <h3>
            Loading your Tiny Titan...
          </h3>

          <p>
            Fetching weight records
            from Firebase.
          </p>
        </div>
      </div>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (
    error ||
    !snake
  ) {
    return (
      <div>
        <BackHomeButton />

        <h1>
          🐍 Snake Not Found
        </h1>

        <div className="tracker-card">
          <h3>
            {error ??
              "This snake could not be found."}
          </h3>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/snakes"
              )
            }
          >
            ← Back to My Hoggies
          </button>
        </div>
      </div>
    );
  }

  // =========================================
  // REAL WEIGHT HISTORY
  // =========================================

  const history =
    sortWeightHistory(
      snake.weightHistory ??
        []
    );

  // =========================================
  // BUILD CHART HISTORY
  // =========================================

  const chartHistory:
    WeightRecord[] = [];

  // Starting weight

  if (
    snake.startingWeight !==
      null &&
    snake.startingWeight !==
      undefined &&
    snake.startingWeight > 0
  ) {
    chartHistory.push({
      id:
        `starting-${snake.id}`,

      snakeId:
        snake.id,

      weight:
        snake.startingWeight,

      date:
        snake.startingWeightDate ||
        snake.hatchDate ||
        snake.arrivalDate ||
        today,

      unit:
        "g",
    });
  }

  // Recorded weights

  chartHistory.push(
    ...history
  );

  // Current weight

  if (
    snake.weight !== null &&
    snake.weight !==
      undefined &&
    snake.weight > 0
  ) {
    const currentDate =
      snake.lastWeighedDate ||
      today;

    const latest =
      chartHistory[
        chartHistory.length - 1
      ];

    if (
      !latest ||
      latest.weight !==
        snake.weight ||
      latest.date !==
        currentDate
    ) {
      chartHistory.push({
        id:
          `current-${snake.id}`,

        snakeId:
          snake.id,

        weight:
          snake.weight,

        date:
          currentDate,

        unit:
          "g",
      });
    }
  }

  const sortedChartHistory =
    sortWeightHistory(
      chartHistory
    );

  // =========================================
  // GROWTH SUMMARY
  // =========================================

  const firstWeight =
    snake.startingWeight ??
    history[0]?.weight ??
    0;

  const currentWeight =
    snake.weight ??
    0;

  const totalGain =
    currentWeight -
    firstWeight;

  const percentageGain =
    firstWeight > 0
      ? Math.round(
          (totalGain /
            firstWeight) *
            100
        )
      : 0;

  // =========================================
  // REMINDER
  // =========================================

  const reminder =
    getWeightReminder(
      snake
    );

  // =========================================
  // DAYS SINCE WEIGH
  // =========================================

  const daysSinceWeigh =
    snake.lastWeighedDate
      ? Math.floor(
          (
            Date.now() -
            new Date(
              snake.lastWeighedDate
            ).getTime()
          ) /
            (
              1000 *
              60 *
              60 *
              24
            )
        )
      : null;

  // =========================================
  // PAGE
  // =========================================

  return (
    <div>
      <BackHomeButton />

      <h1>
        ⚖️ {snake.name} Weight Records
      </h1>

      {/* ============================= */}
      {/* SNAKE INFORMATION */}
      {/* ============================= */}

      <div className="tracker-card">
        {snake.photo ? (
          <img
            src={snake.photo}
            alt={snake.name}
            style={{
              width:
                "100%",
              borderRadius:
                "15px",
            }}
          />
        ) : (
          <div
            style={{
              fontSize:
                "80px",
              textAlign:
                "center",
            }}
          >
            🐍
          </div>
        )}

        <h2>
          🐍 {snake.name}
        </h2>

        <p>
          Species:
          <br />

          <strong>
            {snake.species}
          </strong>
        </p>

        <p>
          Morphs:
          <br />

          <strong>
            {snake.morphs?.join(
              ", "
            ) || "-"}
          </strong>
        </p>

        <p>
          Sex:
          <br />

          <strong>
            {snake.sex}
          </strong>
        </p>
      </div>

      {/* ============================= */}
      {/* GROWTH SUMMARY */}
      {/* ============================= */}

      <div className="tracker-card">
        <h2>
          📊 Growth Summary
        </h2>

        <p>
          Current Weight:
          <br />

          <strong>
            {currentWeight}g
          </strong>
        </p>

        <p>
          Starting Weight:
          <br />

          <strong>
            {firstWeight}g
          </strong>
        </p>

        <p>
          Total Growth:
          <br />

          <strong>
            {totalGain >=
            0
              ? `+${totalGain}g`
              : `${totalGain}g`}
          </strong>
        </p>

        <p>
          Growth:
          <br />

          <strong>
            {percentageGain >=
            0
              ? `+${percentageGain}%`
              : `${percentageGain}%`}
          </strong>
        </p>

        <p>
          Last Weighed:
          <br />

          <strong>
            {snake.lastWeighedDate ||
              "-"}
          </strong>
        </p>

        <p>
          Days Since Weigh:
          <br />

          <strong>
            {daysSinceWeigh ??
              "-"}
          </strong>
        </p>

        <p>
          Reminder:
          <br />

          <strong>
            {reminder.status}
          </strong>
        </p>
      </div>

      {/* ============================= */}
      {/* ADD WEIGHT */}
      {/* ============================= */}

      <div className="tracker-card">
        <h2>
          ➕ Add Weight Record
        </h2>

        <label htmlFor="weight-record">
          Weight (g)
        </label>

        <input
          id="weight-record"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="e.g. 50.74"
          value={
            weight
          }
          onChange={(
            event
          ) =>
            setWeight(
              event.target.value
            )
          }
        />

        {/* ============================= */}
        {/* DATE */}
        {/* ============================= */}

        <label htmlFor="weight-date-text">
          📅 Date
        </label>

        <div
          style={{
            display:
              "flex",
            gap:
              "8px",
            alignItems:
              "center",
            width:
              "100%",
          }}
        >
          {/* ============================= */}
          {/* TYPABLE DATE */}
          {/* ============================= */}

          <input
            id="weight-date-text"
            type="text"

            /*
             * IMPORTANT:
             *
             * Do NOT use inputMode="numeric".
             *
             * That forces Android into
             * the number keyboard.
             *
             * text gives the user the
             * normal keyboard where
             * "/" is available.
             */

            inputMode="text"

            autoComplete="off"

            placeholder="DD/MM/YYYY"

            value={
              typedDate
            }

            onChange={(
              event
            ) =>
              handleTypedDateChange(
                event.target.value
              )
            }

            onBlur={() => {
              if (
                !typedDate.trim()
              ) {
                setDateError(
                  "Please enter a date."
                );

                return;
              }

              const parsed =
                parseTypedDate(
                  typedDate
                );

              if (!parsed) {
                setDateError(
                  "Please enter a valid date, e.g. 10/08/2026."
                );

                return;
              }

              setDate(
                parsed
              );

              setTypedDate(
                formatDateForDisplay(
                  parsed
                )
              );

              setDateError(
                ""
              );
            }}

            aria-label="Weight record date"

            style={{
              flex: 1,
            }}
          />

          {/* ============================= */}
          {/* CALENDAR PICKER */}
          {/* ============================= */}

          <input
            id="weight-date-calendar"
            type="date"
            value={
              date
            }
            onChange={(
              event
            ) =>
              handleCalendarDateChange(
                event.target.value
              )
            }
            aria-label="Choose weight record date"
            style={{
              width:
                "52px",
              minWidth:
                "52px",
              padding:
                "8px",
            }}
          />
        </div>

        <small>
          Type DD/MM/YYYY using
          the normal keyboard,
          or use the calendar.
        </small>

        {dateError && (
          <p
            style={{
              marginTop:
                "6px",
            }}
          >
            ⚠️ {dateError}
          </p>
        )}

        <button
          type="button"
          onClick={
            addWeight
          }
          disabled={
            saving
          }
        >
          {saving
            ? "💾 Saving..."
            : "💾 Save Weight"}
        </button>
      </div>

      {/* ============================= */}
      {/* GROWTH CHART */}
      {/* ============================= */}

      <div className="tracker-card">
        <h2>
          📈 Growth Chart
        </h2>

        {sortedChartHistory.length >=
        2 ? (
          <WeightChart
            history={
              sortedChartHistory
            }
          />
        ) : (
          <p>
            Add more weight
            records to see
            your growth chart.
          </p>
        )}
      </div>

      {/* ============================= */}
      {/* WEIGHT HISTORY */}
      {/* ============================= */}

      <div className="tracker-card">
        <h2>
          📜 Weight History
        </h2>

        {history.length >
        0 ? (
          [
            ...history,
          ]
            .reverse()
            .map(
              (
                record,
                index,
                array
              ) => (
                <div
                  key={
                    record.id
                  }
                  className="weight-history-card"
                >
                  <h3>
                    📅{" "}
                    {
                      record.date
                    }
                  </h3>

                  <p>
                    ⚖️{" "}
                    {
                      record.weight
                    }
                    {
                      record.unit
                    }
                  </p>

                  {array[
                    index + 1
                  ] && (
                    <p>
                      {record.weight -
                        array[
                          index +
                            1
                        ]
                          .weight >=
                      0
                        ? `⬆️ +${
                            record.weight -
                            array[
                              index +
                                1
                            ]
                              .weight
                          }g`
                        : `⬇️ ${
                            record.weight -
                            array[
                              index +
                                1
                            ]
                              .weight
                          }g`}
                    </p>
                  )}
                </div>
              )
            )
        ) : (
          <p>
            No recorded
            weigh-ins yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default WeightRecords;