import BackHomeButton from "../components/BackHomeButton";
import SaveProgress from "../components/SaveProgress";
import SnakeForm from "../components/SnakeForm";
import { useSnakeEdit } from "../hooks/useSnakeEdit";
import TinyTitansIcon from "../components/TinyTitansIcon";

function SnakeEdit() {
  const { id, isNew, form, loaded, saving, saveStage, saveError, loading, profileLoading, navigate, updateField, saveSnake } = useSnakeEdit();

  if (loading || profileLoading || !loaded) {
    return (
      <div className="page-container">
        <BackHomeButton />
        <h1><TinyTitansIcon name="reptile" size={28} /> Loading Snake...</h1>
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
      <h1>{isNew ? <><TinyTitansIcon name="add" size={24} /> Add New Snake</> : <><TinyTitansIcon name="edit" size={24} /> Edit Snake</>}</h1>
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