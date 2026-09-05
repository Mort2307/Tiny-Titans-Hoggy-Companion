import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { FoodType, FeedingMethod, FeedingRecord, FeedingResponse } from "../types/Feeding";
import { getUserSnakes } from "../services/snakeService";
import { deleteSnakeFeeding, getSnakeFeedings, saveSnakeFeeding } from "../services/feedingService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import { generateId } from "../utils/generateId";
import { getSpeciesDiet, type PreyCategory, type SpeciesDiet } from "../data/feeding/speciesDiet";
import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import "../styles/trackerWorkspace.css";

const feedingMethods: FeedingMethod[] = ["Tongs", "Drop Feed", "Hand Fed", "Scented", "Other"];
const feedingResponses: FeedingResponse[] = ["Accepted", "Refused", "Partial", "Regurgitated"];
const responseEmoji: Record<FeedingResponse, string> = { Accepted: "✅", Refused: "❌", Partial: "⚠️", Regurgitated: "🔴" };
const responseCopy: Record<FeedingResponse, string> = { Accepted: "Accepted", Refused: "Refused", Partial: "Partial", Regurgitated: "Regurgitated" };

const categoryByFood: Record<FoodType, PreyCategory> = {
  "Pinkie Mouse": "rodent", "Fuzzy Mouse": "rodent", "Hopper Mouse": "rodent", "Adult Mouse": "rodent",
  "Rat Pup": "rodent", "Rat Fuzzy": "rodent", "Adult Rat": "rodent", Rabbit: "lagomorph", Piglet: "other",
  Quail: "bird", "Other Bird": "bird", Fish: "fish", Amphibian: "amphibian", Egg: "egg", "Reptile Prey": "reptile",
  Invertebrate: "invertebrate", Other: "other",
};

function today() { return new Date().toISOString().split("T")[0]; }
function toDisplayWeight(value: number | undefined, isImperial: boolean) { return value == null ? "" : String(isImperial ? value / 28.349523125 : value); }

export default function FeedingTracker() {
  const { id: routeSnakeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, weightUnit, formatWeight } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [feedings, setFeedings] = useState<FeedingRecord[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [loadedFeedingsKey, setLoadedFeedingsKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedingRecord | null>(null);
  const [date, setDate] = useState(today());
  const [foodType, setFoodType] = useState<FoodType>("Pinkie Mouse");
  const [customFood, setCustomFood] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("");
  const [feedingMethod, setFeedingMethod] = useState<FeedingMethod>("Tongs");
  const [response, setResponse] = useState<FeedingResponse>("Accepted");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let cancelled = false;
    void getUserSnakes(user.uid).then((loaded) => {
      if (cancelled) return;
      const valid = loaded.filter((snake) => Boolean(snake?.id));
      setSnakes(valid);
      setSelectedSnakeId((current) => routeSnakeId && valid.some((snake) => snake.id === routeSnakeId) ? routeSnakeId : valid.some((snake) => snake.id === current) ? current : valid[0]?.id ?? "");
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load your snakes.");
    }).finally(() => {
      if (!cancelled) setLoadingSnakes(false);
    });
    return () => { cancelled = true; };
  }, [user, loading, profileLoading, routeSnakeId]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const diet = useMemo(() => getSpeciesDiet(selectedSnake), [selectedSnake]);
  const feedingFoodTypes = useMemo(() => {
    const recommended = diet.recommended.length ? diet.recommended : ["Other" as FoodType];
    const additional = diet.additional.filter((food) => !recommended.includes(food));
    return { recommended, additional };
  }, [diet]);
  const feedingsKey = user && selectedSnakeId ? `${user.uid}:${selectedSnakeId}` : null;
  const loadingFeedings = Boolean(feedingsKey && loadedFeedingsKey !== feedingsKey);

  useEffect(() => {
    if (!user || !selectedSnakeId) return;
    let cancelled = false;
    void getSnakeFeedings(user.uid, selectedSnakeId).then((records) => {
      if (cancelled) return;
      setFeedings(records);
      setLoadedFeedingsKey(feedingsKey);
      const recordId = searchParams.get("record");
      const record = recordId ? records.find((item) => item.id === recordId) : undefined;
      if (record) {
        queueMicrotask(() => {
          if (cancelled) return;
          setEditingId(record.id);
          setDate(record.date);
          setFoodType(record.foodType);
          setCustomFood(record.customFood ?? "");
          setSize(record.size ?? "");
          setQuantity(String(record.quantity ?? 1));
          setWeight(toDisplayWeight(record.weight, isImperial));
          setFeedingMethod(record.feedingMethod ?? "Tongs");
          setResponse(record.response);
          setNotes(record.notes ?? "");
          setSuccess("📌 Opened from the Life Timeline. You are editing this exact feeding record.");
          requestAnimationFrame(() => document.getElementById("feeding-log")?.scrollIntoView({ behavior: "smooth", block: "center" }));
          setSearchParams((current) => { current.delete("record"); return current; }, { replace: true });
        });
      }
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load feeding history.");
    });
    return () => { cancelled = true; };
  }, [user, selectedSnakeId, feedingsKey, searchParams, setSearchParams, isImperial]);

  const counts = useMemo(() => ({
    Accepted: feedings.filter((f) => f.response === "Accepted").length,
    Refused: feedings.filter((f) => f.response === "Refused").length,
    Partial: feedings.filter((f) => f.response === "Partial").length,
    Regurgitated: feedings.filter((f) => f.response === "Regurgitated").length,
  }), [feedings]);
  const acceptanceRate = feedings.length ? Math.round((counts.Accepted / feedings.length) * 100) : 0;
  const lastFeeding = feedings[0] ?? null;

  function resetForm(nextDiet: SpeciesDiet = diet) {
    const defaultFood = nextDiet.recommended[0] ?? "Other";
    setEditingId(null);
    setDate(today());
    setFoodType(defaultFood);
    setCustomFood("");
    setSize("");
    setQuantity("1");
    setWeight("");
    setFeedingMethod("Tongs");
    setResponse("Accepted");
    setNotes("");
  }

  function editFeeding(feeding: FeedingRecord) {
    setEditingId(feeding.id);
    setDate(feeding.date);
    setFoodType(feeding.foodType);
    setCustomFood(feeding.customFood ?? "");
    setSize(feeding.size ?? "");
    setQuantity(String(feeding.quantity ?? 1));
    setWeight(toDisplayWeight(feeding.weight, isImperial));
    setFeedingMethod(feeding.feedingMethod ?? "Tongs");
    setResponse(feeding.response);
    setNotes(feeding.notes ?? "");
    document.getElementById("feeding-log")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!user || !selectedSnakeId) { setError("Please select a snake and make sure you are logged in."); return; }
    if (foodType === "Other" && !customFood.trim()) { setError("Please enter the food type."); return; }
    const numericQuantity = quantity === "" ? 1 : Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0 || !Number.isInteger(numericQuantity)) { setError("Prey quantity must be a whole number of 1 or more."); return; }
    if (weight !== "" && (!Number.isFinite(Number(weight)) || Number(weight) < 0)) { setError(`Please enter a valid prey weight in ${weightUnit}.`); return; }
    setSaving(true);
    try {
      const preyWeightG = weight === "" ? undefined : isImperial ? Number(weight) * 28.349523125 : Number(weight);
      const record: FeedingRecord = {
        id: editingId ?? generateId(),
        snakeId: selectedSnakeId,
        date,
        foodType,
        ...(foodType === "Other" ? { customFood: customFood.trim() } : {}),
        ...(size ? { size } : {}),
        ...(numericQuantity !== 1 ? { quantity: numericQuantity } : {}),
        ...(preyWeightG !== undefined ? { weight: preyWeightG } : {}),
        preyCategory: categoryByFood[foodType],
        ...(feedingMethod ? { feedingMethod } : {}),
        response,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      const saved = await saveSnakeFeeding(user.uid, record);
      setFeedings((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)));
      setLoadedFeedingsKey(feedingsKey);
      setSuccess(editingId ? "Feeding record updated successfully." : "Feeding recorded successfully.");
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this feeding.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(feeding: FeedingRecord) {
    if (!user || saving) return;
    setDeleteTarget(null);
    setSaving(true);
    setError("");
    try {
      await deleteSnakeFeeding(user.uid, feeding.snakeId, feeding.id);
      setFeedings((current) => current.filter((item) => item.id !== feeding.id));
      setSuccess("Feeding record deleted.");
      if (editingId === feeding.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete this feeding.");
    } finally {
      setSaving(false);
    }
  }

  function daysSince(value: string) {
    const d = new Date(`${value}T00:00:00`);
    return Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000));
  }

  if (loading || profileLoading || (Boolean(user) && loadingSnakes)) return <div className="tt-tracker-page"><BackHomeButton /><div className="tt-tracker-panel"><p className="tt-tracker-eyebrow">Keeper records</p><h1>🍽️ Feeding Tracker</h1><p className="tt-tracker-panel-muted">Loading feeding records…</p></div></div>;

  return <main className="tt-tracker-page">
    <BackHomeButton />
    <header className="tt-tracker-header">
      <p className="tt-tracker-eyebrow">Keeper records · Feeding intelligence</p>
      <div className="tt-tracker-title-row">
        <div>
          <h1>🍽️ Feeding Tracker</h1>
          <p className="tt-tracker-subtitle">Log the actual prey item, quantity and mass for every snake — from a mouse pinkie to a whole rabbit, fish, egg or bird.</p>
        </div>
        <div className="tt-tracker-snake"><label htmlFor="feeding-snake">Record for<select id="feeding-snake" value={selectedSnakeId} onChange={(event) => { const nextSnakeId = event.target.value; const nextSnake = snakes.find((snake) => snake.id === nextSnakeId); setSelectedSnakeId(nextSnakeId); resetForm(getSpeciesDiet(nextSnake)); }} disabled={saving}>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label></div>
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

    {snakes.length === 0 ? <section className="tt-tracker-panel"><div className="tt-empty"><h2>No snakes yet</h2><p>Add a snake before recording a feeding.</p><button className="tt-tracker-button" type="button" onClick={() => navigate("/snakes")}>➕ Add a Snake</button></div></section> : <>
      <section id="feeding-overview" className="tt-tracker-stat-grid">
        <div className="tt-tracker-stat"><span>Last meal</span><strong>{lastFeeding?.date ?? "—"}</strong></div>
        <div className="tt-tracker-stat"><span>Days since</span><strong>{lastFeeding ? daysSince(lastFeeding.date) : "—"}</strong></div>
        <div className="tt-tracker-stat"><span>Acceptance</span><strong>{acceptanceRate}%</strong></div>
        <div className="tt-tracker-stat"><span>Total feeds</span><strong>{feedings.length}</strong></div>
      </section>

      <div className="tt-tracker-grid">
        <div className="tt-tracker-stack">
          <section id="feeding-log" className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">{editingId ? "Editing existing meal" : "New feeding event"}</p>
            <h2>{editingId ? "✏️ Edit Feeding" : "🍽️ Record Feeding"}</h2>
            <form className="tt-tracker-form" onSubmit={(event) => void handleSubmit(event)}>
              <label htmlFor="feeding-date">Feeding date<input id="feeding-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={saving} required /></label>
              <label htmlFor="feeding-food">Prey type
                <select id="feeding-food" value={foodType} onChange={(event) => setFoodType(event.target.value as FoodType)} disabled={saving}>
                  <optgroup label={`Recommended for ${diet.label}`}>
                    {feedingFoodTypes.recommended.map((food) => <option key={food}>{food}</option>)}
                  </optgroup>
                  {feedingFoodTypes.additional.length > 0 && <optgroup label="Other supported prey">
                    {feedingFoodTypes.additional.map((food) => <option key={food}>{food}</option>)}
                  </optgroup>}
                </select>
              </label>
              {foodType === "Other" && <label htmlFor="custom-food">Food description<input id="custom-food" value={customFood} onChange={(event) => setCustomFood(event.target.value)} placeholder="e.g. young rat, locusts, day-old chick" disabled={saving} required /></label>}
              <label htmlFor="feeding-size">Prey size<select id="feeding-size" value={size} onChange={(event) => setSize(event.target.value)} disabled={saving}><option value="">Select prey size…</option>{["Extra Small", "Small", "Medium", "Large", "Extra Large"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label htmlFor="feeding-quantity">Prey quantity<input id="feeding-quantity" type="number" inputMode="numeric" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={saving} /></label>
              <label htmlFor="feeding-weight">Mass ({weightUnit})<input id="feeding-weight" type="number" inputMode="decimal" min="0" step="any" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder={isImperial ? "e.g. 1.2" : "e.g. 34"} disabled={saving} /><small>For multiple prey items, record the total mass of the feed unless your notes specify otherwise.</small></label>
              <label htmlFor="feeding-method">Feeding method<select id="feeding-method" value={feedingMethod} onChange={(event) => setFeedingMethod(event.target.value as FeedingMethod)} disabled={saving}>{feedingMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
              <label htmlFor="feeding-response">Response<select id="feeding-response" value={response} onChange={(event) => setResponse(event.target.value as FeedingResponse)} disabled={saving}>{feedingResponses.map((item) => <option key={item}>{responseCopy[item]}</option>)}</select></label>
              <label htmlFor="feeding-notes">Keeper notes<textarea id="feeding-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Actual prey details, preparation, acceptance behaviour, anything worth preserving…" rows={4} disabled={saving} /></label>
              <div className="tt-tracker-actions"><button className="tt-tracker-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "💾 Update Feeding" : "💾 Record Feeding"}</button>{editingId && <button className="tt-tracker-button secondary" type="button" onClick={() => resetForm()} disabled={saving}>Cancel edit</button>}</div>
            </form>
          </section>
        </div>

        <aside className="tt-tracker-stack">
          <section className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">Species diet intelligence</p>
            <h2>🐍 {selectedSnake?.name}</h2>
            <p className="tt-tracker-panel-muted">{selectedSnake?.species}</p>
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

      <section id="feeding-history" className="tt-tracker-panel">
        <div className="tt-tracker-section-heading"><div><p className="tt-tracker-eyebrow">Feeding history</p><h2>📋 {selectedSnake?.name}'s meals</h2></div><span className="tt-tracker-panel-muted">{loadingFeedings ? "Loading…" : `${feedings.length} recorded feed${feedings.length === 1 ? "" : "s"}`}</span></div>
        {loadingFeedings ? <p className="tt-tracker-panel-muted">Loading feeding history…</p> : feedings.length === 0 ? <div className="tt-empty"><h3>No feeding records yet</h3><p>The first meal you record will appear here.</p></div> : <div className="tt-tracker-history">
          {feedings.map((feeding) => <article key={feeding.id} className="tt-tracker-history-item">
            <div><strong>{feeding.date}</strong><div>{feeding.foodType === "Other" ? feeding.customFood || "Other" : feeding.foodType}{feeding.quantity && feeding.quantity > 1 ? ` × ${feeding.quantity}` : ""}{feeding.size ? ` · ${feeding.size}` : ""}</div><small>{feeding.weight != null ? `Total mass: ${formatWeight(feeding.weight)}` : "Mass not recorded"}{feeding.preyCategory ? ` · ${feeding.preyCategory}` : ""}</small></div>
            <div><span>{responseEmoji[feeding.response]} {responseCopy[feeding.response]}</span><div className="tt-tracker-actions"><button type="button" className="tt-tracker-button secondary" onClick={() => editFeeding(feeding)} disabled={saving}>Edit</button><button type="button" className="tt-tracker-button danger" onClick={() => setDeleteTarget(feeding)} disabled={saving}>Delete</button></div></div>
          </article>)}
        </div>}
      </section>
    </>}

    <ConfirmActionDialog open={Boolean(deleteTarget)} title="Delete feeding record?" description={deleteTarget ? <>This will permanently delete the {deleteTarget.foodType === "Other" ? deleteTarget.customFood || "custom" : deleteTarget.foodType} feeding recorded on {deleteTarget.date}.</> : null} confirmLabel="Delete feeding" busy={saving} onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }} onCancel={() => setDeleteTarget(null)} />
  </main>;
}