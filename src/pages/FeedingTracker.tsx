import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import FeedingHistory from "../components/Feeding/FeedingHistory";
import FeedingLogForm from "../components/Feeding/FeedingLogForm";
import FeedingOverviewStats from "../components/Feeding/FeedingOverviewStats";
import { useFeedingTracker } from "../hooks/useFeedingTracker";
import "./../styles/trackerWorkspace.css";

export default function FeedingTracker() {
  const {
    user, loading, profileLoading, navigate, isImperial, weightUnit, formatWeight,
    snakes, selectedSnake, selectedSnakeId, setSelectedSnakeId, feedings, loadingSnakes, loadingFeedings,
    saving, error, success, editingId, deleteTarget, setDeleteTarget,
    date, setDate, foodType, setFoodType, customFood, setCustomFood, size, setSize, quantity, setQuantity,
    weight, setWeight, feedingMethod, setFeedingMethod, response, setResponse, notes, setNotes,
    diet, feedingFoodTypes, counts, acceptanceRate, lastFeeding, lastSuccessfulFeeding, resetForm, editFeeding,
    selectSnake, handleSubmit, handleDelete,
  } = useFeedingTracker();

  if (loading || profileLoading || (Boolean(user) && loadingSnakes)) {
    return <div className="tt-tracker-page"><BackHomeButton /><div className="tt-tracker-panel"><p className="tt-tracker-eyebrow">Keeper records</p><h1>🍽️ Feeding Tracker</h1><p className="tt-tracker-panel-muted">Loading feeding records…</p></div></div>;
  }

  return <main className="tt-tracker-page">
    <BackHomeButton />
    <header className="tt-tracker-header">
      <p className="tt-tracker-eyebrow">Keeper records · Feeding intelligence</p>
      <div className="tt-tracker-title-row"><div><h1>🍽️ Feeding Tracker</h1><p className="tt-tracker-subtitle">Log the actual prey item, quantity and mass for every snake — from a mouse pinkie to a whole rabbit, fish, egg or bird.</p></div>
        <div className="tt-tracker-snake"><label htmlFor="feeding-snake">Record for<select id="feeding-snake" value={selectedSnakeId} onChange={(event) => selectSnake(event.target.value)} disabled={saving}>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label></div>
      </div>
      <nav className="tt-tracker-nav" aria-label="Tracker navigation">
        <button type="button" className="active" onClick={() => document.getElementById("feeding-overview")?.scrollIntoView({ behavior: "smooth" })}>Overview</button>
        <button type="button" onClick={() => document.getElementById("feeding-log")?.scrollIntoView({ behavior: "smooth" })}>Log feeding</button>
        <button type="button" onClick={() => document.getElementById("feeding-history")?.scrollIntoView({ behavior: "smooth" })}>History ({feedings.length})</button>
        <Link to="/feeding/preparation">🧊 Preparation</Link>
        <button type="button" onClick={() => selectedSnakeId && navigate(`/snakes/${selectedSnakeId}/weights`)}>⚖️ Weight</button>
        <button type="button" onClick={() => selectedSnakeId && navigate(`/snakes/${selectedSnakeId}/shedding`)}>🐍 Shed</button>
      </nav>
    </header>

    {error && <div className="tt-tracker-message error" role="alert">⚠️ {error}</div>}
    {success && <div className="tt-tracker-message success" role="status">✅ {success}</div>}

    {snakes.length === 0 ? (
      <section className="tt-tracker-panel"><div className="tt-empty"><h2>No snakes yet</h2><p>Add a snake before recording a feeding.</p><button className="tt-tracker-button" type="button" onClick={() => navigate("/snakes")}>➕ Add a Snake</button></div></section>
    ) : <>
      <FeedingOverviewStats feedings={feedings} acceptanceRate={acceptanceRate} lastFeeding={lastFeeding} lastSuccessfulFeeding={lastSuccessfulFeeding} />

      <div className="tt-tracker-grid">
        <div className="tt-tracker-stack">
          <FeedingLogForm
            date={date} setDate={setDate} foodType={foodType} setFoodType={setFoodType} customFood={customFood} setCustomFood={setCustomFood}
            size={size} setSize={setSize} quantity={quantity} setQuantity={setQuantity} weight={weight} setWeight={setWeight}
            feedingMethod={feedingMethod} setFeedingMethod={setFeedingMethod} response={response} setResponse={setResponse}
            notes={notes} setNotes={setNotes} diet={diet} feedingFoodTypes={feedingFoodTypes} editingId={editingId}
            saving={saving} weightUnit={weightUnit} isImperial={isImperial} onSubmit={(event) => void handleSubmit(event)} onReset={() => resetForm()}
          />
        </div>
        <aside className="tt-tracker-stack">
          <section className="tt-tracker-panel"><p className="tt-tracker-eyebrow">Species diet intelligence</p><h2>🐍 {selectedSnake?.name}</h2><p className="tt-tracker-panel-muted">{selectedSnake?.species}</p>
            <div className="tt-tracker-message success"><strong>{diet.guild}</strong><br />{diet.note}</div>
            <ul className="tt-tracker-side-list">
              <li><strong>Primary prey categories</strong><br />{diet.categories.join(" · ")}</li>
              <li><strong>Recommended prey</strong><br />{diet.recommended.length ? diet.recommended.join(", ") : "Record exact prey under Other"}</li>
              <li><strong>Accepted</strong><br />{counts.Accepted} of {feedings.length}</li>
              <li><strong>Refused</strong><br />{counts.Refused}</li>
              <li><strong>Partial / regurgitated</strong><br />{counts.Partial} / {counts.Regurgitated}</li>
            </ul>
          </section>
          <section className="tt-tracker-panel"><p className="tt-tracker-eyebrow">Important</p><h2>🎯 Record the actual meal</h2><p className="tt-tracker-panel-muted">Tiny Titans does not silently turn every snake into a rodent-only feeder. Species profiles can surface fish, amphibians, eggs, birds and larger whole prey, while the exact item and mass stay attached to the keeper record.</p></section>
        </aside>
      </div>

      <FeedingHistory snakeName={selectedSnake?.name} feedings={feedings} loadingFeedings={loadingFeedings} saving={saving} formatWeight={formatWeight} onEdit={editFeeding} onDelete={setDeleteTarget} />
    </>}

    <ConfirmActionDialog open={Boolean(deleteTarget)} title="Delete feeding record?" description={deleteTarget ? <>This will permanently delete the {deleteTarget.foodType === "Other" ? deleteTarget.customFood || "custom" : deleteTarget.foodType} feeding recorded on {deleteTarget.date}.</> : null} confirmLabel="Delete feeding" busy={saving} onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }} onCancel={() => setDeleteTarget(null)} />
  </main>;
}

