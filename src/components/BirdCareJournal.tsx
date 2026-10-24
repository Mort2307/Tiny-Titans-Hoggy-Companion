import { useEffect, useMemo, useState, type FormEvent } from "react";
import { addAvianObservation, deleteAvianObservation, listAvianObservations, type AvianCareCategory, type AvianCareObservation } from "../services/avianCareJournalService";
import { getTinyTitansErrorMessage } from "../utils/firebaseError";
import ConfirmActionDialog from "./ConfirmActionDialog";
import TinyTitansFeedback from "./TinyTitansFeedback";

const CATEGORIES: Array<{ id: AvianCareCategory; label: string; hint: string }> = [
  { id: "weight", label: "Body weight", hint: "A measured weight in grams, not a body-condition assessment" },
  { id: "food-water", label: "Food & water", hint: "What was offered, eaten, appetite and water observations" },
  { id: "moult-feathers", label: "Feathers & moulting", hint: "Observed feather condition or moult changes" },
  { id: "activity-enrichment", label: "Flight & enrichment", hint: "Movement, play, social or enrichment observations" },
  { id: "droppings", label: "Droppings", hint: "Observations only — not a diagnosis" },
  { id: "welfare", label: "Health & welfare notes", hint: "Symptoms, veterinary appointment or recovery note" },
  { id: "other", label: "Other care note", hint: "Sleep, housing, cleaning or other keeper details" },
];
const label = (category: AvianCareCategory) => CATEGORIES.find((item) => item.id === category)?.label || "Care observation";
function localDay() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export default function BirdCareJournal({ uid, animalId }: { uid: string; animalId: string }) {
  const [records, setRecords] = useState<AvianCareObservation[]>([]);
  const [category, setCategory] = useState<AvianCareCategory>("weight");
  const [date, setDate] = useState(localDay);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<AvianCareObservation | null>(null);
  const latestWeights = useMemo(() => records.filter((record) => record.category === "weight" && record.weightGrams !== undefined), [records]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    void listAvianObservations(uid, animalId).then((result) => { if (active) setRecords(result); })
      .catch((error) => { if (active) setLoadError(getTinyTitansErrorMessage(error, "Could not load this bird's care history.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid, animalId, retry]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setNotice(""); setLoadError("");
    try {
      const number = category === "weight" ? Number(weight) : undefined;
      await addAvianObservation(uid, animalId, { category, observedAt: date, note, weightGrams: number });
      setWeight(""); setNote("");
      setNotice("Bird observation saved.");
      setRetry((count) => count + 1);
    } catch (error) { setLoadError(getTinyTitansErrorMessage(error, "Could not save the bird observation.")); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!pendingDelete || busy) return;
    setBusy(true); setLoadError("");
    try {
      await deleteAvianObservation(uid, animalId, pendingDelete.id);
      setRecords((current) => current.filter((record) => record.id !== pendingDelete.id));
      setNotice("Observation deleted.");
      setPendingDelete(null);
    } catch (error) { setLoadError(getTinyTitansErrorMessage(error, "Could not delete the observation.")); }
    finally { setBusy(false); }
  }

  return <section className="universal-animals-panel avian-care-journal">
    <p className="eyebrow">BIRD KEEPER WORKSPACE</p>
    <h2>Care &amp; observation journal</h2>
    <p>Record your bird's routine, food, measured weight, moult, exercise and welfare observations. These are private keeper notes, not veterinary diagnoses or generic species care instructions.</p>
    {latestWeights.length > 0 && <p className="avian-care-journal__summary">Latest recorded weight: <strong>{latestWeights[0].weightGrams} g</strong> on {latestWeights[0].observedAt} · {latestWeights.length} weight entr{latestWeights.length === 1 ? "y" : "ies"}</p>}
    <form onSubmit={(event) => void save(event)} className="avian-care-journal__form">
      <label>Observation type
        <select value={category} onChange={(event) => setCategory(event.target.value as AvianCareCategory)} disabled={busy}>
          {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p className="avian-care-journal__hint">{CATEGORIES.find((item) => item.id === category)?.hint}</p>
      <label>Observed on <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} /></label>
      {category === "weight" && <label>Measured weight (grams)
        <input type="number" step="0.1" min="0.1" max="500000" inputMode="decimal" required value={weight} onChange={(event) => setWeight(event.target.value)} disabled={busy} placeholder="e.g. 56.4" />
      </label>}
      <label>Keeper's observation
        <textarea rows={3} maxLength={3000} required={category !== "weight"} value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} placeholder="What did you observe today?" />
      </label>
      <button className="universal-primary-action" type="submit" disabled={busy}>{busy ? "Saving observation…" : "Save observation"}</button>
    </form>
    {notice && <TinyTitansFeedback kind="success" role="status">{notice}</TinyTitansFeedback>}
    {loadError && <TinyTitansFeedback kind="error" role="alert">{loadError}</TinyTitansFeedback>}
    {loading ? <p role="status">Loading bird care history…</p> : loadError && records.length === 0 ? <button type="button" className="universal-secondary-action" onClick={() => setRetry((count) => count + 1)}>Try loading again</button> :
      <div className="avian-care-journal__history">
        <h3>Recent observations</h3>
        {records.length === 0 ? <p>No bird care observations have been logged yet.</p> : records.slice(0, 50).map((record) =>
          <article className="avian-care-journal__entry" key={record.id}>
            <div><strong>{label(record.category)}</strong><small>{record.observedAt}</small></div>
            {record.weightGrams !== undefined && <b>{record.weightGrams} g</b>}
            {record.note && <p>{record.note}</p>}
            <button type="button" className="universal-secondary-action" disabled={busy} onClick={() => setPendingDelete(record)}>Delete observation</button>
          </article>
        )}
        {records.length > 50 && <p>Showing the latest 50 observations.</p>}
      </div>
    }
    <p className="avian-care-journal__hint">Changes in breathing, inability to perch, severe weakness or other urgent health concerns need an avian veterinarian, not an app-generated diagnosis.</p>
    <ConfirmActionDialog open={Boolean(pendingDelete)} title="Delete this bird observation?" description="This care note will be permanently removed. Your other records are preserved." confirmLabel="Delete observation" destructive busy={busy} onConfirm={() => void remove()} onCancel={() => { if (!busy) setPendingDelete(null); }} />
  </section>;
}
