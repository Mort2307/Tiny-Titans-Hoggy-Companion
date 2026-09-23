import BackHomeButton from "../components/BackHomeButton";
import SaveProgress from "../components/SaveProgress";
import SnakeForm from "../components/SnakeForm";
import { useSnakeEdit } from "../hooks/useSnakeEdit";

function SnakeEdit() {
  const { id, isNew, form, loaded, saving, saveStage, saveError, loading, profileLoading, navigate, updateField, saveSnake } = useSnakeEdit();

  if (loading || profileLoading || !loaded) {
    return (
      <div className="page-container">
        <BackHomeButton />
        <h1>🐍 Loading Snake...</h1>
        <div className="tracker-card">
          <h3>Loading your Tiny Titan...</h3>
          <p>Please wait while Tiny Titans retrieves the snake record.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <BackHomeButton />
      <h1>{isNew ? "➕ Add New Snake" : "✏️ Edit Snake"}</h1>
      <SaveProgress stage={saveStage} snakeName={form.name} errorMessage={saveError} />
      <SnakeForm
        form={form}
        updateField={updateField}
        onSave={() => void saveSnake()}
        onMorphLibrarySubmit={async (submission) => { await saveSnake(submission); }}
        editing={!isNew}
        saving={saving}
      />
      <button
        type="button"
        className="cancel-snake-button"
        disabled={saving}
        onClick={() => {
          if (saving) return;
          navigate(isNew ? "/snakes" : `/snakes/${id}`);
        }}
      >
        Cancel
      </button>
    </div>
  );
}

export default SnakeEdit;