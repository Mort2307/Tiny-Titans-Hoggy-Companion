import {
  useState,
} from "react";


import type {
  ChangeEvent,
  FormEvent,
} from "react";


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


import {
  compressImage,
} from "../utils/imageCompression";


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
  const [
    processingPhoto,
    setProcessingPhoto,
  ] = useState(false);


  const [
    photoError,
    setPhotoError,
  ] = useState("");


  const [
    submitAttempted,
    setSubmitAttempted,
  ] = useState(false);


  // =========================================
  // SUBMIT
  // =========================================


  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    setSubmitAttempted(true);


    console.log(
      "Tiny Titans: FORM SUBMIT",
      {
        name: form.name,
        species: form.species,
        sex: form.sex,
        photoPresent:
          Boolean(form.photo),
        photoLength:
          form.photo?.length ?? 0,
        morphs:
          form.morphs,
        hets:
          form.hets,
        saving,
        processingPhoto,
      }
    );


    if (saving) {
      console.warn(
        "Tiny Titans: save already in progress"
      );


      return;
    }


    if (processingPhoto) {
      console.warn(
        "Tiny Titans: cannot save while photo is processing"
      );


      return;
    }


    if (!form.name.trim()) {
      console.warn(
        "Tiny Titans: cannot save snake without a name"
      );


      return;
    }


    console.log(
      "Tiny Titans: calling onSave()"
    );


    onSave();
  }


  // =========================================
  // PHOTO
  // =========================================


  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];


    // Reset the input so selecting the same
    // image again still triggers onChange.
    event.target.value = "";


    if (!file) {
      return;
    }


    console.log(
      "Tiny Titans: uploading snake photo",
      {
        name:
          file.name,
        type:
          file.type,
        size:
          file.size,
        sizeMB:
          (
            file.size /
            1024 /
            1024
          ).toFixed(2),
      }
    );


    setPhotoError("");


    setProcessingPhoto(true);


    try {
      console.log(
        "Tiny Titans: compressing snake photo"
      );


      const compressedPhoto =
        await compressImage(
          file
        );


      console.log(
        "Tiny Titans: photo compression complete",
        {
          originalSize:
            file.size,
          compressedLength:
            compressedPhoto.length,
        }
      );


      updateField(
        "photo",
        compressedPhoto
      );


      console.log(
        "Tiny Titans: photo stored in form state"
      );
    } catch (
      error
    ) {
      console.error(
        "Tiny Titans: photo processing failed",
        error
      );


      setPhotoError(
        error instanceof Error
          ? error.message
          : "Tiny Titans could not process this photo."
      );
    } finally {
      setProcessingPhoto(false);
    }
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
      {/* SAVE STATUS */}
      {/* ========================= */}


      {saving && (
        <div
          className="date-duration-display"
          role="status"
          aria-live="polite"
        >
          💾 Saving your snake to Tiny Titans...
        </div>
      )}


      {submitAttempted &&
        !saving &&
        !form.name.trim() && (
          <div
            className="date-duration-display"
            role="alert"
          >
            ⚠️ Please enter a snake name before saving.
          </div>
        )}


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
        value={
          form.name
        }
        onChange={(event) =>
          updateField(
            "name",
            event.target.value
          )
        }
        autoComplete="off"
        required
        disabled={saving}
      />


      <label htmlFor="snake-species">
        Species
      </label>


      <input
        id="snake-species"
        type="text"
        value={
          form.species
        }
        onChange={(event) =>
          updateField(
            "species",
            event.target.value
          )
        }
        disabled={saving}
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
        {processingPhoto
          ? "⏳ Processing photo..."
          : "📷 Add Photo"}
      </label>


      <input
        id="snake-photo"
        type="file"
        accept="image/*"
        onChange={
          handlePhotoChange
        }
        disabled={
          processingPhoto ||
          saving
        }
        style={{
          display: "none",
        }}
      />


      {processingPhoto && (
        <div
          className="date-duration-display"
          role="status"
          aria-live="polite"
        >
          ⏳ Compressing your photo
          so it can be safely stored...
        </div>
      )}


      {photoError && (
        <div
          className="date-duration-display"
          role="alert"
        >
          ⚠️ {photoError}
        </div>
      )}


      {form.photo &&
        !processingPhoto && (
          <img
            src={
              form.photo
            }
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
        value={
          form.sex
        }
        onChange={(event) =>
          updateField(
            "sex",
            event.target.value
          )
        }
        disabled={saving}
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
        disabled={saving}
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
        disabled={saving}
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
        disabled={saving}
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
        disabled={saving}
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
        disabled={saving}
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
        disabled={saving}
      />


      {/* ========================= */}
      {/* MORPHS */}
      {/* ========================= */}


      <h3>
        🧬 Visual Morphs
      </h3>


      <MultiSelectDropdown
        title="Select Morphs"
        options={
          morphs
        }
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
        disabled={saving}
      />


      {/* ========================= */}
      {/* HETS */}
      {/* ========================= */}


      <h3>
        🧬 Hets
      </h3>


      <HetSelector
        options={
          morphs
        }
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
        disabled={saving}
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
        disabled={saving}
      />


      {/* ========================= */}
      {/* SAVE */}
      {/* ========================= */}


      <button
        type="submit"
        className="save-snake-button"
        disabled={
          saving ||
          processingPhoto
        }
      >
        {processingPhoto
          ? "⏳ Processing Photo..."
          : saving
            ? "💾 Saving..."
            : "💾 Save Snake"}
      </button>

    </form>
  );
}


export default SnakeForm;