import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansEmptyState from "../components/TinyTitansEmptyState";
import type { HealthEventType, HealthStatus } from "../types/Health";
import { HEALTH_EVENT_TYPES, HEALTH_STATUSES } from "../lib/healthTracker";
import { useHealthTracker } from "../hooks/useHealthTracker";
import "../styles/trackerWorkspace.css";

export default function HealthTracker() {
  const navigate = useNavigate();
  const {
    snakes, snakeId, setSnakeId, records, eventType, setEventType, status, setStatus,
    date, setDate, title, setTitle, description, setDescription, vetName, setVetName,
    followUpDate, setFollowUpDate, notes, setNotes, medicationName, setMedicationName,
    dose, setDose, frequency, setFrequency, firstDoseAt, setFirstDoseAt, intervalHours,
    setIntervalHours, remindersEnabled, setRemindersEnabled, editingId, deleteTarget,
    setDeleteTarget, message, busy, selectedSnake, medicationRecords, reset, edit, submit,
    medicationAction, stopMedication, remove,
  } = useHealthTracker();

  const followUps = records.filter((record) => Boolean(record.followUpDate)).length;
  const latest = records[0];

  return (
    <main className="tt-tracker-page">
      <BackHomeButton />

      <header className="tt-tracker-header">
        <p className="tt-tracker-eyebrow">Keeper records · Health &amp; veterinary care</p>
        <div className="tt-tracker-title-row">
          <div>
            <h1><TinyTitansIcon name="vet" size={26} /> Health &amp; Vet Records</h1>
            <p className="tt-tracker-subtitle">
              Keep observations, veterinary visits, medication schedules and follow-ups in one auditable care timeline. Tiny Titans records care; it does not diagnose illness or replace a reptile veterinarian.
            </p>
          </div>
          <div className="tt-tracker-snake">
            <label htmlFor="health-snake">
              Record for
              <select id="health-snake" value={snakeId} onChange={(event) => setSnakeId(event.target.value)} disabled={busy}>
                {snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <nav className="tt-tracker-nav" aria-label="Tracker navigation">
          <button type="button" className="active" onClick={() => document.getElementById("health-overview")?.scrollIntoView({ behavior: "smooth" })}>Overview</button>
          <button type="button" onClick={() => document.getElementById("health-record")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Log health</button>
          <button type="button" onClick={() => document.getElementById("health-history")?.scrollIntoView({ behavior: "smooth" })}>History ({records.length})</button>
          <button type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/weights`)}><TinyTitansIcon name="weight" size={18} /> Weight</button>
          <button type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/feeding`)}><TinyTitansIcon name="feeding" size={18} /> Feeding</button>
          <button type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/behaviour`)}><TinyTitansIcon name="behaviour" size={18} /> Behaviour</button>
        </nav>
      </header>

      <section id="health-overview" className="tt-tracker-stat-grid" aria-label="Health record summary">
        <div className="tt-tracker-stat"><span>Records</span><strong>{records.length}</strong></div>
        <div className="tt-tracker-stat"><span>Active medication</span><strong>{medicationRecords.length}</strong></div>
        <div className="tt-tracker-stat"><span>Follow-ups</span><strong>{followUps}</strong></div>
        <div className="tt-tracker-stat"><span>Latest status</span><strong>{latest?.status ?? "—"}</strong></div>
      </section>

      {message && <div className="tt-tracker-message" role="status">{message}</div>}

      <div className="tt-tracker-grid">
        <div className="tt-tracker-stack">
          <section id="health-record" className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">{editingId ? "Editing health record" : "New health record"}</p>
            <h2>{editingId ? "Update health or veterinary record" : "Record health or veterinary care"}</h2>

            <form className="tt-tracker-form" onSubmit={(event) => void submit(event)}>
              <label htmlFor="health-date">Date
                <input id="health-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <label htmlFor="health-type">Record type
                <select id="health-type" value={eventType} onChange={(event) => setEventType(event.target.value as HealthEventType)}>
                  {HEALTH_EVENT_TYPES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label htmlFor="health-status">Status
                <select id="health-status" value={status} onChange={(event) => setStatus(event.target.value as HealthStatus)}>
                  {HEALTH_STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label htmlFor="health-title">Title
                <input id="health-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Vet recheck" required />
              </label>
              <label htmlFor="health-vet">Veterinary practice / clinician <small>Optional</small>
                <input id="health-vet" value={vetName} onChange={(event) => setVetName(event.target.value)} />
              </label>
              <label htmlFor="health-follow-up">Follow-up date <small>Optional</small>
                <input id="health-follow-up" type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} />
              </label>
              <label htmlFor="health-description">Description
                <textarea id="health-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened, when, and what you could observe. Avoid guessing a diagnosis." required rows={4} />
              </label>

              {eventType === "Medication" && (
                <fieldset>
                  <legend><TinyTitansIcon name="timeline" size={17} /> Working medication schedule</legend>
                  <p className="tt-tracker-panel-muted">Enter the prescribed schedule exactly. The reminder engine uses the next due time and records every administration separately.</p>
                  <div className="tt-tracker-form tt-tracker-form--nested">
                    <label htmlFor="medication-name">Medication
                      <input id="medication-name" value={medicationName} onChange={(event) => setMedicationName(event.target.value)} placeholder="Medication name" />
                    </label>
                    <label htmlFor="medication-dose">Dose
                      <input id="medication-dose" value={dose} onChange={(event) => setDose(event.target.value)} placeholder="e.g. 0.2 ml" />
                    </label>
                    <label htmlFor="medication-frequency">Frequency
                      <select id="medication-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)}>
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="twice-daily">Twice daily</option>
                        <option value="every-other-day">Every other day</option>
                        <option value="custom">Custom interval</option>
                      </select>
                    </label>
                    {frequency === "custom" && (
                      <label htmlFor="medication-interval">Interval hours
                        <input id="medication-interval" type="number" min="1" max="720" value={intervalHours} onChange={(event) => setIntervalHours(event.target.value)} />
                      </label>
                    )}
                    <label htmlFor="medication-first-dose">First dose due
                      <input id="medication-first-dose" type="datetime-local" value={firstDoseAt} onChange={(event) => setFirstDoseAt(event.target.value)} />
                    </label>
                  </div>
                  <label className="tt-tracker-check">
                    <input type="checkbox" checked={remindersEnabled} onChange={(event) => setRemindersEnabled(event.target.checked)} />
                    Enable medication reminders
                  </label>
                </fieldset>
              )}

              <label htmlFor="health-notes">Notes <small>Optional</small>
                <textarea id="health-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
              </label>

              <div className="tt-tracker-actions">
                <button className="tt-tracker-button" type="submit" disabled={busy || !snakeId}>
                  {busy ? "Saving…" : editingId ? "Update record" : "Save health record"}
                </button>
                {editingId && <button className="tt-tracker-button secondary" type="button" onClick={reset} disabled={busy}>Cancel edit</button>}
              </div>
            </form>
          </section>

          {medicationRecords.length > 0 && (
            <section className="tt-tracker-panel">
              <div className="tt-history-toolbar">
                <div>
                  <p className="tt-tracker-eyebrow">Medication workflow</p>
                  <h2><TinyTitansIcon name="timeline" size={19} /> Active medication</h2>
                </div>
                <span className="tt-tracker-panel-muted">{medicationRecords.length} active</span>
              </div>
              <div className="tt-history-list">
                {medicationRecords.map((record) => (
                  <article key={record.id} className="tt-history-item">
                    <div className="tt-history-item-header">
                      <div>
                        <h3>{record.medicationSchedule?.medicationName}</h3>
                        <p>{selectedSnake?.name}</p>
                      </div>
                      <span className="tt-tracker-panel-muted">{record.medicationSchedule?.dose}</span>
                    </div>
                    <div className="tt-history-details">
                      <span>Next due: {record.medicationSchedule?.nextDueAt ? new Date(record.medicationSchedule.nextDueAt).toLocaleString() : "Complete"}</span>
                    </div>
                    <div className="tt-tracker-actions">
                      <button className="tt-tracker-button" type="button" onClick={() => void medicationAction(record, "given")} disabled={busy}>Dose given</button>
                      <button className="tt-tracker-button secondary" type="button" onClick={() => void medicationAction(record, "skipped")} disabled={busy}>Skip</button>
                      <button className="tt-tracker-button secondary danger" type="button" onClick={() => void stopMedication(record)} disabled={busy}>Stop reminders</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="tt-tracker-stack">
          <section className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">Animal</p>
            <h2>{selectedSnake?.name ?? "Select an animal"}</h2>
            <p className="tt-tracker-panel-muted">{selectedSnake?.species ?? "Health records are stored against the individual animal."}</p>
            <ul className="tt-tracker-side-list">
              <li><strong>Health records</strong><br />{records.length}</li>
              <li><strong>Active medication</strong><br />{medicationRecords.length}</li>
              <li><strong>Follow-ups</strong><br />{followUps}</li>
            </ul>
          </section>
          <section className="tt-tracker-panel">
            <p className="tt-tracker-eyebrow">Quick navigation</p>
            <h2>Related keeper records</h2>
            <div className="tt-tracker-actions">
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/weights`)}>Weight</button>
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/feeding`)}>Feeding</button>
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/shedding`)}>Shedding</button>
              <button className="tt-tracker-button secondary" type="button" onClick={() => snakeId && navigate(`/snakes/${snakeId}/behaviour`)}>Behaviour</button>
            </div>
          </section>
        </aside>
      </div>

      <section id="health-history" className="tt-tracker-panel" style={{ marginTop: 16 }}>
        <div className="tt-history-toolbar">
          <div>
            <p className="tt-tracker-eyebrow">Auditable care timeline</p>
            <h2><TinyTitansIcon name="timeline" size={19} /> Health history</h2>
          </div>
          <span className="tt-tracker-panel-muted">Newest first · {records.length} records</span>
        </div>

        {records.length === 0 ? (
          <TinyTitansEmptyState compact icon="vet" title="No health or veterinary records yet" description="Use the form above to add the first observation, treatment or veterinary record." />
        ) : (
          <div className="tt-history-list">
            {records.map((record) => (
              <article className="tt-history-item" key={record.id}>
                <div className="tt-history-item-header">
                  <div>
                    <h3>{record.title}</h3>
                    <p>{record.date} · {record.eventType} · {record.status}</p>
                  </div>
                  {record.followUpDate && <span className="tt-tracker-panel-muted">Follow-up {record.followUpDate}</span>}
                </div>
                <div className="tt-history-details">
                  <span>{record.description}</span>
                  {record.vetName && <span>Veterinary practice / clinician: {record.vetName}</span>}
                  {record.medicationAdministrations?.length ? <span>{record.medicationAdministrations.filter((item) => item.status === "given").length} doses recorded</span> : null}
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
        title="Delete health record?"
        description="This permanently removes this individual health or veterinary record."
        confirmLabel="Delete record"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </main>
  );
}
