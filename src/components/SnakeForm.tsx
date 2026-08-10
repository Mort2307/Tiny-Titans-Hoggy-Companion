import type {
  Snake,
} from "../types/Snake";

import type {
  Het,
} from "../types/genetics";

import type {
  WeightRecord,
} from "../types/Weight";

import MultiSelectDropdown from "./MultiSelectDropdown";
import HetSelector from "./HetSelector";

import {
  morphs,
} from "../data/morphs";

import {
  getDateDuration,
} from "../utils/dateDuration";

type SnakeFormProps = {
  form: {
    name: string;
    species: string;
    photo: string;
    sex: Snake["sex"];

    morphs: string[];
    customMorph: string;

    hets: Het[];
    customHets: string;

    startingWeight: number | null;
    startingWeightDate: string;

    weight: number | null;
    lastWeighedDate: string;

    weightHistory: WeightRecord[];

    hatchDate: string;
    arrivalDate: string;

    notes: string;
  };

  updateField: (
    field: string,
    value: unknown
  ) => void;

  onSave: () => void;

  editing: boolean;

  saving?: boolean;
};

function SnakeForm({
  form,
  updateField,
  onSave,
  editing,
  saving = false,
}: SnakeFormProps) {

  const sortedMorphs =
    morphs
      .map(
        (morph) =>
          morph.name
      )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );

  // =========================================
  // SUBMIT
  // =========================================

  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (
      saving
    ) {
      return;
    }

    onSave();
  }

  // =========================================
  // PHOTO
  // =========================================

  function handlePhotoChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onloadend =
      () => {

        if (
          typeof reader.result !==
          "string"
        ) {
          return;
        }

        updateField(
          "photo",
          reader.result
        );
      };

    reader.readAsDataURL(
      file
    );
  }

  // =========================================
  // RENDER
  // =========================================

  return (
    <form
      className="snake-form"
      onSubmit={handleSubmit}
      noValidate
    >

      <h2>
        {editing
          ? "✏️ Edit Snake"
          : "🐍 Add Snake"}
      </h2>

      {/* ========================= */}
      {/* BASIC INFORMATION */}
      {/* ========================= */}

      <h3>
        🐍 Basic Information
      </h3>

      <label htmlFor="snake-name">
        Snake Name
      </label>

      <input
        id="snake-name"
        type="text"
        value={form.name}
        onChange={(event) =>
          updateField(
            "name",
            event.target.value
          )
        }
        autoComplete="off"
        required
      />

      <label htmlFor="snake-species">
        Species
      </label>

      <input
        id="snake-species"
        type="text"
        value={form.species}
        onChange={(event) =>
          updateField(
            "species",
            event.target.value
          )
        }
      />

      {/* ========================= */}
      {/* PHOTO */}
      {/* ========================= */}

      <label>
        Photo
      </label>

      <label
        htmlFor="snake-photo"
        className="snake-photo-picker"
      >
        📷 Add Photo
      </label>

      <input
        id="snake-photo"
        type="file"
        accept="image/*"
        onChange={
          handlePhotoChange
        }
        style={{
          display: "none",
        }}
      />

      {form.photo && (
        <img
          src={form.photo}
          alt={
            form.name ||
            "Snake preview"
          }
          className="snake-form-photo"
        />
      )}

      {/* ========================= */}
      {/* SEX */}
      {/* ========================= */}

      <label htmlFor="snake-sex">
        Sex
      </label>

      <select
        id="snake-sex"
        value={form.sex}
        onChange={(event) =>
          updateField(
            "sex",
            event.target.value
          )
        }
      >

        <option value="Unknown">
          Unknown
        </option>

        <option value="Male">
          Male
        </option>

        <option value="Female">
          Female
        </option>

      </select>

      {/* ========================= */}
      {/* DATES */}
      {/* ========================= */}

      <h3>
        📅 Dates & Timeline
      </h3>

      <label htmlFor="hatch-date">
        Hatch Date
      </label>

      <input
        id="hatch-date"
        type="date"
        value={
          form.hatchDate
        }
        onChange={(event) =>
          updateField(
            "hatchDate",
            event.target.value
          )
        }
      />

      {form.hatchDate && (
        <div className="date-duration-display">

          🎂 Age:{" "}

          <strong>
            {getDateDuration(
              form.hatchDate
            )}
          </strong>

        </div>
      )}

      <label htmlFor="arrival-date">
        Arrival Date
      </label>

      <input
        id="arrival-date"
        type="date"
        value={
          form.arrivalDate
        }
        onChange={(event) =>
          updateField(
            "arrivalDate",
            event.target.value
          )
        }
      />

      {form.arrivalDate && (
        <div className="date-duration-display">

          🏠 Time with you:{" "}

          <strong>
            {getDateDuration(
              form.arrivalDate
            )}
          </strong>

        </div>
      )}

      {/* ========================= */}
      {/* WEIGHT */}
      {/* ========================= */}

      <h3>
        ⚖️ Weight Tracking
      </h3>

      <label htmlFor="starting-weight">
        Starting Weight (g)
      </label>

      <input
        id="starting-weight"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        placeholder="e.g. 50.74"
        value={
          form.startingWeight ??
          ""
        }
        onChange={(event) => {

          const value =
            event.target.value
              ? Number(
                  event.target.value
                )
              : null;

          updateField(
            "startingWeight",
            value
          );

          if (
            value !== null &&
            !form.startingWeightDate
          ) {

            updateField(
              "startingWeightDate",
              new Date()
                .toISOString()
                .split("T")[0]
            );
          }
        }}
      />

      <label htmlFor="starting-weight-date">
        Starting Weight Date
      </label>

      <input
        id="starting-weight-date"
        type="date"
        value={
          form.startingWeightDate
        }
        onChange={(event) =>
          updateField(
            "startingWeightDate",
            event.target.value
          )
        }
      />

      <label htmlFor="current-weight">
        Current Weight (g)
      </label>

      <input
        id="current-weight"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        placeholder="e.g. 90.25"
        value={
          form.weight ??
          ""
        }
        onChange={(event) =>
          updateField(
            "weight",
            event.target.value
              ? Number(
                  event.target.value
                )
              : null
          )
        }
      />

      <label htmlFor="last-weighed-date">
        Last Weighed Date
      </label>

      <input
        id="last-weighed-date"
        type="date"
        value={
          form.lastWeighedDate
        }
        onChange={(event) =>
          updateField(
            "lastWeighedDate",
            event.target.value
          )
        }
      />

      {/* ========================= */}
      {/* MORPHS */}
      {/* ========================= */}

      <h3>
        🧬 Visual Morphs
      </h3>

      <MultiSelectDropdown
        title="Select Morphs"
        options={sortedMorphs}
        selected={
          form.morphs
        }
        setSelected={(value) =>
          updateField(
            "morphs",
            value
          )
        }
      />

      <label htmlFor="custom-morph">
        Custom Morph
      </label>

      <input
        id="custom-morph"
        type="text"
        value={
          form.customMorph
        }
        onChange={(event) =>
          updateField(
            "customMorph",
            event.target.value
          )
        }
      />

      {/* ========================= */}
      {/* HETS */}
      {/* ========================= */}

      <h3>
        🧬 Hets
      </h3>

      <HetSelector
        options={morphs}
        selected={
          form.hets
        }
        setSelected={(value) =>
          updateField(
            "hets",
            value
          )
        }
      />

      <label htmlFor="custom-hets">
        Additional Genetics Notes
      </label>

      <textarea
        id="custom-hets"
        value={
          form.customHets
        }
        onChange={(event) =>
          updateField(
            "customHets",
            event.target.value
          )
        }
      />

      {/* ========================= */}
      {/* NOTES */}
      {/* ========================= */}

      <label htmlFor="snake-notes">
        Notes
      </label>

      <textarea
        id="snake-notes"
        value={
          form.notes
        }
        onChange={(event) =>
          updateField(
            "notes",
            event.target.value
          )
        }
      />

      {/* ========================= */}
      {/* SAVE */}
      {/* ========================= */}

      <button
        type="submit"
        className="save-snake-button"
        disabled={saving}
      >
        {saving
          ? "💾 Saving..."
          : "💾 Save Snake"}
      </button>

    </form>
  );
}

export default SnakeForm;