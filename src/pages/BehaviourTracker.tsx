import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansEmptyState from "../components/TinyTitansEmptyState";
import { deleteSnakeBehaviourRecord, getSnakeBehaviourRecords, saveSnakeBehaviourRecord } from "../services/behaviourService";
import { getUserSnakes } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import type { BehaviourContext, BehaviourObservation, BehaviourRecord } from "../types/Behaviour";
import type { Snake } from "../types/Snake";
import { generateId } from "../utils/generateId";
import { isFutureDate, parseUserDate } from "../utils/dateDisplay";
import "../styles/trackerWorkspace.css";

const observations: BehaviourObservation[] = ["Exploring", "Burrowing", "Hiding", "Defensive display", "Huffing", "Hooding", "Bluff strike", "Musk", "Thanatosis", "Handling response", "Other"];
const contexts: BehaviourContext[] = ["Routine observation", "Handling", "After feeding", "Pre-shed", "Enclosure change", "Other"];
const today = () => new Date().toISOString().slice(0, 10);

export default function BehaviourTracker() {
  const navigate = useNavigate();
  const { id: routeSnakeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [snakeId, setSnakeId] = useState("");
  const [records, setRecords] = useState<BehaviourRecord[]>([]);
  const [observation, setObservation] = useState<BehaviourObservation>("Exploring");
  const [context, setContext] = useState<BehaviourContext>("Routine observation");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [relatedChange, setRelatedChange] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BehaviourRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === snakeId), [snakes, snakeId]);
  const distinctBehaviours = useMemo(() => new Set(records.map((record) => record.observation)).size, [records]);
  const latest = records[0];

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    void getUserSnakes(user.uid)
      .then((loaded) => {
        setSnakes(loaded);
        setSnakeId((current) =>
          routeSnakeId && loaded.some((snake) => snake.id === routeSnakeId)
            ? routeSnakeId
            : loaded.some((snake) => snake.id === current)
              ? current
              : loaded[0]?.id ?? "",
        );
      })
      .catch(() => setMessage("Unable to load your animals."));
  }, [user, loading, profileLoading, routeSnakeId]);

  useEffect(() => {
    if (!user || !snakeId) return;
    void getSnakeBehaviourRecords(user.uid, snakeId)
      .then(setRecords)
      .catch(() => setMessage("Unable to load behaviour observations."));
  }, [user, snakeId]);

  useEffect(() => {
    const recordId = searchParams.get("record");
    if (!recordId || records.length === 0) return;
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    queueMicrotask(() => {
      setEditingId(record.id);
      setObservation(record.observation);
      setContext(record.context);
      setDate(record.date);
      setDescription(record.description);
      setDuration(record.duration ?? "");
      setRelatedChange(record.relatedChange ?? "");
      setMessage("Opened from the Life Timeline. You are editing this exact behaviour observation.");
      requestAnimationFrame(() =>
        document.getElementById("behaviour-record")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      setSearchParams((current) => {
        current.delete("record");
        return current;
      }, { replace: true });
    });
  }, [records, searchParams, setSearchParams]);

  useEffect(() => {
    if (!user || !snakeId || searchParams.get("action") !== "log") return;
    queueMicrotask(() => {
      reset();
      setMessage("Tiny Titans opened the behaviour journal because this is the next supported keeper action.");
      requestAnimationFrame(() =>
        document.getElementById("behaviour-record")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      setSearchParams((current) => {
        current.delete("action");
        return current;
      }, { replace: true });
    });
  }, [user, snakeId, searchParams, setSearchParams]);

  function reset() {
    setEditingId(null);
    setObservation("Exploring");
    setContext("Routine observation");
    setDate(today());
    setDescription("");
    setDuration("");
    setRelatedChange("");
  }

  function edit(record: BehaviourRecord) {
    setEditingId(record.id);
    setObservation(record.observation);
    setContext(record.context);
    setDate(record.date);
    setDescription(record.description);
    setDuration(record.duration ?? "");
    setRelatedChange(record.relatedChange ?? "");
    requestAnimationFrame(() =>
      document.getElementById("behaviour-record")?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !snakeId) return;

    const parsedDate = parseUserDate(date);
    if (!parsedDate) {
      setMessage("Enter a valid date as DD-MM-YYYY.");
      return;
    }
    if (isFutureDate(parsedDate, today())) {
      setMessage("Behaviour observations cannot be recorded in the future. Past dates are fully supported.");
      return;
    }
    if (!description.trim()) {
      setMessage("Describe what happened and its context. A label alone is not enough.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const saved = await saveSnakeBehaviourRecord(user.uid, {
        id: editingId ?? generateId(),
        snakeId,
        date: parsedDate,
        observation,
        context,
        description: description.trim(),
        ...(duration.trim() ? { duration: duration.trim() } : {}),
        ...(relatedChange.trim() ? { relatedChange: relatedChange.trim() } : {}),
      });
      setRecords((current) =>
        [saved, ...current.filter((record) => record.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)),
      );
      const wasEditing = Boolean(editingId);
      reset();
      setMessage(
        wasEditing
          ? "Behaviour observation updated."
          : "Behaviour observation saved. Tiny Titans records behaviour without assigning a diagnosis or personality label.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this observation.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !deleteTarget) return;
    setBusy(true);
    try {
      await deleteSnakeBehaviourRecord(user.uid, deleteTarget.snakeId, deleteTarget.id);
      setRecords((current) => current.filter((record) => record.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) reset();
      setDeleteTarget(null);
      setMessage("Behaviour observation deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete this observation.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || profileLoading) {
    return (
      <main className="tt-tracker-page">
        <BackHomeButton />
        <section className="tt-tracker-panel">
          <p className="tt-tracker-eyebrow">Keeper records</p>
          <h1><TinyTitansIcon name="behaviour" size={26} /> Behaviour Journal</h1>
          <p className="tt-tracker-panel-muted">Loading behaviour observations…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="tt-tracker-page">
      <BackHomeButton />

      <header className="tt-tracker-header">
        <p className="tt-tracker-eyebrow">Keeper records · Behaviour journal</p>
        <div className="tt-tracker-title-row">
          <div>
            <h1><TinyTitansIcon name="behaviour" size={26} /> Behaviour Journal</h1>
            <p className="tt-tracker-subtitle">
              Describe what happened and its context. Tiny Titans records observations and patterns without turning normal defensive behaviour into a diagnosis or fixed personality label.
            </p>
          </div>
          <div className="tt-tracker-snake">
            <label htmlFor="behaviour-snake">
              Record for
              <select id="behaviour-snake" value={snakeId} onChange={(event) => setSnakeId(event.target.value)} disabled={busy}>
                {snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <nav className="tt-tracker-nav" aria-label="Tracker navigation">
          <button type="button" className="active" onClick={() => document.getElementById("behaviour-overview")?.scrollIntoView({ behavior: "smooth" })}>Overview</button>
          <button type="button" onClick={() => document.getElementById("behaviour-record")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Log observation</button>
          <button type="button" onClick={() => document.getElementById("behaviour-history")?.scrollIntoView({ behavior: "smooth" })}>History ({records.length})</button>
          <button type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/weights`)}><TinyTitansIcon name="weight" size={18} /> Weight</button>
          <button type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/feeding`)}><TinyTitansIcon name="feeding" size={18} /> Feeding</button>
          <button type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/health`)}><TinyTitansIcon name="health" size={18} /> Health</button>
        </nav>
      </header>

      <section id="behaviour-overview" className="tt-tracker-stat-grid" aria-label="Behaviour record summary">
        <div className="tt-tracker-stat"><span>Observations</span><strong>{records.length}</strong></div>
        <div className="tt-tracker-stat"><span>Behaviour types</span><strong>{distinctBehaviours}</strong></div>
        <div className="tt-tracker-stat"><span>Latest</span><strong>{latest?.observation ?? "—"}</strong></div>
        <div className="tt-tracker-stat"><span>Last recorded</span><strong>{latest?.date ?? "—"}</strong></div>
      </section>

      {message && <div className="tt-tracker-message" role="status">{message}</div>}

      <div className="tt-tracker-grid">
        <div className="tt-tracker-stack">
          <section id="behaviour-record" className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">{editingId ? "Editing observation" : "New observation"}</p>
            <h2>{editingId ? "Update behaviour observation" : "Record what happened"}</h2>

            <form className="tt-tracker-form" onSubmit={(event) => void submit(event)}>
              <label htmlFor="behaviour-date">Date
                <input id="behaviour-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <label htmlFor="behaviour-observation">Observed behaviour
                <select id="behaviour-observation" value={observation} onChange={(event) => setObservation(event.target.value as BehaviourObservation)}>
                  {observations.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label htmlFor="behaviour-context">Context
                <select id="behaviour-context" value={context} onChange={(event) => setContext(event.target.value as BehaviourContext)}>
                  {contexts.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label htmlFor="behaviour-duration">Duration <small>Optional</small>
                <input id="behaviour-duration" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="e.g. 10 minutes" />
              </label>
              <label htmlFor="behaviour-change">What changed beforehand? <small>Optional</small>
                <input id="behaviour-change" value={relatedChange} onChange={(event) => setRelatedChange(event.target.value)} placeholder="e.g. enclosure clean yesterday" />
              </label>
              <label htmlFor="behaviour-description">Description
                <textarea id="behaviour-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What did the snake do? What happened immediately before and after?" required rows={4} />
              </label>
              <div className="tt-tracker-actions">
                <button className="tt-tracker-button" type="submit" disabled={busy || !snakeId}>
                  {busy ? "Saving…" : editingId ? "Update observation" : "Save observation"}
                </button>
                {editingId && <button className="tt-tracker-button secondary" type="button" onClick={reset} disabled={busy}>Cancel edit</button>}
              </div>
            </form>
          </section>
        </div>

        <aside className="tt-tracker-stack">
          <section className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">Animal</p>
            <h2>{selectedSnake?.name ?? "Select an animal"}</h2>
            <p className="tt-tracker-panel-muted">{selectedSnake?.species ?? "Behaviour records are stored against the individual animal."}</p>
            <ul className="tt-tracker-side-list">
              <li><strong>Observations</strong><br />{records.length}</li>
              <li><strong>Behaviour types</strong><br />{distinctBehaviours}</li>
              <li><strong>Latest context</strong><br />{latest?.context ?? "No observations yet"}</li>
            </ul>
          </section>

          <section className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">Quick navigation</p>
            <h2>Related keeper records</h2>
            <div className="tt-tracker-actions">
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/weights`)}>Weight</button>
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/feeding`)}>Feeding</button>
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/shedding`)}>Shedding</button>
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/health`)}>Health</button>
            </div>
          </section>
        </aside>
      </div>

      <section id="behaviour-history" className="tt-tracker-panel" style={{ marginTop: 16 }}>
        <div className="tt-history-toolbar">
          <div>
            <p className="tt-tracker-eyebrow">Context-rich journal</p>
            <h2><TinyTitansIcon name="timeline" size={19} /> Observation history</h2>
          </div>
          <span className="tt-tracker-panel-muted">Newest first · {records.length} observations</span>
        </div>

        {records.length === 0 ? (
          <TinyTitansEmptyState compact icon="behaviour" title="No behaviour observations yet" description="Use the journal above to record the first observation with its context." />
        ) : (
          <div className="tt-history-list">
            {records.map((record) => (
              <article className="tt-history-item" key={record.id}>
                <div className="tt-history-item-header">
                  <div>
                    <h3>{record.observation}</h3>
                    <p>{record.date} · {record.context}</p>
                  </div>
                  {record.duration && <span className="tt-tracker-panel-muted">{record.duration}</span>}
                </div>
                <div className="tt-history-details">
                  <span>{record.description}</span>
                  {record.relatedChange && <span>Change beforehand: {record.relatedChange}</span>}
                </div>
                <div className="tt-tracker-actions">
                  <button className="tt-tracker-button secondary" type="button" onClick={() => edit(record)} disabled={busy}><TinyTitansIcon name="edit" size={16} /> Edit</button>
                  <button className="tt-tracker-button secondary danger" type="button" onClick={() => setDeleteTarget(record)} disabled={busy}><TinyTitansIcon name="delete" size={16} /> Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        title="Delete behaviour observation?"
        description="This permanently removes this individual observation."
        confirmLabel="Delete observation"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </main>
  );
}
