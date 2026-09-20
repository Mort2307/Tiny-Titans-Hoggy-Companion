import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import PaidTierGate from "../components/PaidTierGate";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useAuth } from "../context/useAuth";
import {
  listRescueAnimals,
  setRescueReminderComplete,
  updateRescueAnimal,
} from "../services/rescueService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getRescueSetupState } from "../services/rescueSetupService";
import type {
  RescueAnimal,
  RescueAnimalStatus,
  RescueIntakeRecord,
  RescueLocationRecord,
  RescueOrganisation,
  RescueQuarantineRecord,
} from "../types/rescue";
import "../styles/rescue.css";

const STATUS_LABELS: Record<RescueAnimalStatus, string> = {
  in_care: "In care",
  quarantine: "Quarantine",
  under_observation: "Under observation",
  adopted: "Adopted",
  transferred: "Transferred",
  deceased: "Deceased",
};

function formatDate(value: string | number | null | undefined, time = false) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return time ? parsed.toLocaleString("en-GB") : parsed.toLocaleDateString("en-GB");
}

function animalLabel(animal: RescueAnimal) {
  const name = animal.name?.trim();
  const id = animal.rescueId?.trim();
  return name && id ? `${name} · ${id}` : name || id || "Unnamed animal";
}

function useRescueData() {
  const { user } = useAuth();
  const [organisation, setOrganisation] = useState<RescueOrganisation | null>(null);
  const [animals, setAnimals] = useState<RescueAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    const workspace = await getMyRescueWorkspace();
    const org = workspace.organisation;
    setOrganisation(org);
    if (!org) {
      setAnimals([]);
      return;
    }
    setAnimals(await listRescueAnimals(org.id));
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load the Rescue workspace."))
      .finally(() => setLoading(false));
  }, [refresh]);

  return { user, organisation, animals, loading, error, refresh };
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rescue-subhead">
      <div>
        <span className="rescue-eyebrow">{eyebrow}</span>
        <h1><TinyTitansIcon name="reptile" size={35} /> {title}</h1>
        <p>{description}</p>
      </div>
      {actions}
    </header>
  );
}

function GatePage({ children }: { children: ReactNode }) {
  return <PaidTierGate entitlement="rescue_workspace">{children}</PaidTierGate>;
}

export function RescueIntake() {
  const { user, organisation, animals, loading, error } = useRescueData();
  const [selectedId, setSelectedId] = useState("");
  const [source, setSource] = useState<RescueIntakeRecord["source"]>("unknown");
  const [receivedAt, setReceivedAt] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [deliveredByContact, setDeliveredByContact] = useState("");
  const [reason, setReason] = useState("");
  const [knownHistory, setKnownHistory] = useState("");
  const [previousName, setPreviousName] = useState("");
  const [previousIdentifier, setPreviousIdentifier] = useState("");
  const [knownMedicalHistory, setKnownMedicalHistory] = useState("");
  const [knownFeedingHistory, setKnownFeedingHistory] = useState("");
  const [knownBehaviour, setKnownBehaviour] = useState("");
  const [conditionOnArrival, setConditionOnArrival] = useState("");
  const [quarantineReason, setQuarantineReason] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = animals.find((animal) => animal.id === selectedId) || null;

  useEffect(() => {
    if (!selected) return;
    const intake = selected.intakeRecord;
    if (!intake) {
      setSource("unknown"); setReceivedAt(selected.intakeDate || ""); setDeliveredBy(""); setDeliveredByContact("");
      setReason(""); setKnownHistory(""); setPreviousName(selected.previousName || ""); setPreviousIdentifier(selected.previousIdentifier || "");
      setKnownMedicalHistory(""); setKnownFeedingHistory(""); setKnownBehaviour(""); setConditionOnArrival(""); setQuarantineReason(""); setEvidenceSummary("");
      return;
    }
    setSource(intake.source); setReceivedAt(intake.receivedAt || selected.intakeDate || ""); setDeliveredBy(intake.deliveredBy);
    setDeliveredByContact(intake.deliveredByContact); setReason(intake.reason); setKnownHistory(intake.knownHistory); setPreviousName(intake.previousName);
    setPreviousIdentifier(intake.previousIdentifier); setKnownMedicalHistory(intake.knownMedicalHistory); setKnownFeedingHistory(intake.knownFeedingHistory);
    setKnownBehaviour(intake.knownBehaviour); setConditionOnArrival(intake.conditionOnArrival); setQuarantineReason(intake.quarantineReason);
    setEvidenceSummary(intake.evidenceSummary);
  }, [selected]);

  async function save() {
    if (!selected || !organisation) return;
    setBusy(true); setMessage("");
    try {
      const record: RescueIntakeRecord = {
        source, receivedAt: receivedAt || selected.intakeDate, deliveredBy: deliveredBy.trim(),
        deliveredByContact: deliveredByContact.trim(), reason: reason.trim(), knownHistory: knownHistory.trim(),
        previousName: previousName.trim(), previousIdentifier: previousIdentifier.trim(), knownMedicalHistory: knownMedicalHistory.trim(),
        knownFeedingHistory: knownFeedingHistory.trim(), knownBehaviour: knownBehaviour.trim(), conditionOnArrival: conditionOnArrival.trim(),
        quarantineReason: quarantineReason.trim(), acceptedByUid: selected.intakeRecord?.acceptedByUid || user?.uid || "",
        evidenceSummary: evidenceSummary.trim(),
      };
      await updateRescueAnimal(selected.id, { intakeRecord: record, previousName: record.previousName || undefined, previousIdentifier: record.previousIdentifier || undefined });
      setMessage(`Intake provenance saved for ${animalLabel(selected)}.`);
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Could not save the intake record.");
    } finally {
      setBusy(false);
    }
  }

  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="INTAKE & PROVENANCE" title="Rescue intake" description="Record where an animal came from, what was known on arrival and why it entered your care." actions={<Link className="rescue-primary-link" to="/rescue/animals?intake=1">Create new animal →</Link>} />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    {message && <div className="rescue-message" role="status">{message}</div>}
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Total animals</small><strong>{loading ? "…" : animals.length}</strong></div>
      <div><small>With intake provenance</small><strong>{loading ? "…" : animals.filter((animal) => animal.intakeRecord).length}</strong></div>
      <div><small>Unknown source</small><strong>{loading ? "…" : animals.filter((animal) => animal.intakeRecord?.source === "unknown" || !animal.intakeRecord).length}</strong></div>
    </div></section>
    <section className="rescue-card">
      <div className="rescue-panel-heading"><div><span className="rescue-eyebrow">SELECT ANIMAL</span><h2>Intake record</h2></div><span>{selected ? animalLabel(selected) : "Choose an animal"}</span></div>
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        <option value="">Choose an animal…</option>
        {animals.map((animal) => <option key={animal.id} value={animal.id}>{animalLabel(animal)} · {STATUS_LABELS[animal.status]}</option>)}
      </select>
      {selected ? <div className="rescue-form-grid">
        <label>Intake source<select value={source} onChange={(event) => setSource(event.target.value as RescueIntakeRecord["source"])}>{[
          ["surrender","Surrender"],["stray_found","Stray / found"],["rescue_transfer","Rescue transfer"],["owner_deceased","Owner deceased"],
          ["neglect","Neglect"],["seizure","Seizure"],["abandonment","Abandonment"],["private_rehome","Private rehome"],["other","Other"],["unknown","Unknown"],
        ].map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <label>Received date & time<input type="datetime-local" value={receivedAt ? receivedAt.slice(0,16) : ""} onChange={(event) => setReceivedAt(event.target.value)} /></label>
        <label>Delivered / surrendered by<input value={deliveredBy} onChange={(event) => setDeliveredBy(event.target.value)} /></label>
        <label>Contact / reference<input value={deliveredByContact} onChange={(event) => setDeliveredByContact(event.target.value)} /></label>
        <label className="rescue-form-grid-span">Reason / circumstances<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <label>Previous name<input value={previousName} onChange={(event) => setPreviousName(event.target.value)} /></label>
        <label>Previous identifier<input value={previousIdentifier} onChange={(event) => setPreviousIdentifier(event.target.value)} /></label>
        <label className="rescue-form-grid-span">Known history<textarea value={knownHistory} onChange={(event) => setKnownHistory(event.target.value)} /></label>
        <label className="rescue-form-grid-span">Known medical history<textarea value={knownMedicalHistory} onChange={(event) => setKnownMedicalHistory(event.target.value)} /></label>
        <label>Known feeding history<textarea value={knownFeedingHistory} onChange={(event) => setKnownFeedingHistory(event.target.value)} /></label>
        <label>Known behaviour<textarea value={knownBehaviour} onChange={(event) => setKnownBehaviour(event.target.value)} /></label>
        <label>Condition on arrival<textarea value={conditionOnArrival} onChange={(event) => setConditionOnArrival(event.target.value)} /></label>
        <label>Quarantine reason<textarea value={quarantineReason} onChange={(event) => setQuarantineReason(event.target.value)} /></label>
        <label className="rescue-form-grid-span">Evidence / handover summary<textarea value={evidenceSummary} onChange={(event) => setEvidenceSummary(event.target.value)} /></label>
        <div className="rescue-span-2"><button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save intake record"}</button><Link className="rescue-primary-link" to={`/rescue/animals/${selected.id}/manage`}>Open animal workspace →</Link></div>
      </div> : <div className="rescue-empty"><strong>Choose an animal above</strong><span>The complete intake history will be kept separately from later care records.</span></div>}
    </section>
  </main></GatePage>;
}

export function RescueQuarantine() {
  const { user, organisation, animals, loading, error, refresh } = useRescueData();
  const [selectedId, setSelectedId] = useState("");
  const [area, setArea] = useState("");
  const [reason, setReason] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const quarantined = animals.filter((animal) => animal.status === "quarantine");

  useEffect(() => {
    const selected = animals.find((animal) => animal.id === selectedId);
    if (!selected) return;
    const quarantine = selected.quarantine;
    setArea(quarantine?.area || "");
    setReason(quarantine?.reason || "");
    setReviewAt(quarantine?.reviewAt ? quarantine.reviewAt.slice(0,16) : "");
    setOutcome(quarantine?.outcome || "");
    setNotes(quarantine?.notes || "");
  }, [animals, selectedId]);

  async function save() {
    const selected = animals.find((animal) => animal.id === selectedId);
    if (!selected || !user || !organisation) return;
    setBusy(true); setMessage("");
    try {
      const record: RescueQuarantineRecord = {
        startedAt: selected.quarantine?.startedAt || new Date().toISOString(),
        reason: reason.trim(), area: area.trim(), reviewAt: reviewAt ? new Date(reviewAt).toISOString() : "",
        reviewedByUid: user.uid, outcome: outcome.trim(), notes: notes.trim(),
      };
      const closing = Boolean(outcome.trim()) || Boolean(reviewAt && new Date(reviewAt).getTime() < Date.now() && outcome.trim());
      const nextStatus: RescueAnimalStatus = closing ? "under_observation" : "quarantine";
      const lifecycle = [{
        id: crypto.randomUUID(), fromStatus: selected.status, toStatus: nextStatus, occurredAt: new Date().toISOString(),
        reason: closing ? "Quarantine review recorded" : "Quarantine record updated", recordedByUid: user.uid, visibility: "staff" as const,
      }, ...(selected.lifecycle || [])];
      const timeline = [{
        id: crypto.randomUUID(), type: "status" as const, occurredAt: new Date().toISOString(),
        title: closing ? "Quarantine review recorded" : "Quarantine updated", summary: reason.trim() || "Quarantine status recorded.",
        details: notes.trim(), recordedByUid: user.uid, visibility: "staff" as const,
      }, ...selected.timeline];
      await updateRescueAnimal(selected.id, { quarantine: record, status: nextStatus, lifecycle, timeline });
      await refresh();
      setMessage(closing ? `${animalLabel(selected)} moved to under observation.` : `Quarantine record saved for ${animalLabel(selected)}.`);
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Could not save quarantine details.");
    } finally {
      setBusy(false);
    }
  }

  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="QUARANTINE & ISOLATION" title="Quarantine" description="Track isolation, reasons, review dates and outcomes without losing the original intake context." actions={<Link className="rescue-primary-link" to="/rescue/intake">Open intake →</Link>} />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    {message && <div className="rescue-message" role="status">{message}</div>}
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Currently quarantined</small><strong>{loading ? "…" : quarantined.length}</strong></div>
      <div><small>Needs review date</small><strong>{loading ? "…" : quarantined.filter((animal) => animal.quarantine?.reviewAt).length}</strong></div>
      <div><small>Animals without quarantine detail</small><strong>{loading ? "…" : quarantined.filter((animal) => !animal.quarantine).length}</strong></div>
    </div></section>
    <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">ACTIVE QUEUE</span><h2>Animals in quarantine</h2></div><span>{quarantined.length}</span></div>
      <div className="rescue-animal-list">{quarantined.map((animal) => <button type="button" className="rescue-animal-row" key={animal.id} onClick={() => setSelectedId(animal.id)}><span>🛡️</span><span><strong>{animalLabel(animal)}</strong><small>{animal.quarantine?.area || "Isolation area not recorded"} · review {formatDate(animal.quarantine?.reviewAt)}</small></span><span>Review →</span></button>)}{!quarantined.length && <div className="rescue-empty"><strong>No animals currently in quarantine</strong><span>New intakes can be placed into quarantine from the animal record.</span></div>}</div>
    </section>
    {selectedId && <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">REVIEW</span><h2>{animalLabel(animals.find((animal) => animal.id === selectedId)!)}</h2></div></div><div className="rescue-form-grid">
      <label>Isolation area<input value={area} onChange={(event) => setArea(event.target.value)} /></label>
      <label>Review date & time<input type="datetime-local" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></label>
      <label className="rescue-form-grid-span">Quarantine reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <label>Outcome<textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="Keep blank while still quarantined" /></label>
      <label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    </div><button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save quarantine review"}</button></section>}
  </main></GatePage>;
}

export function RescueMedical() {
  const { animals, loading, error } = useRescueData();
  const healthRecords = useMemo(() => animals.flatMap((animal) => (animal.careRecords || []).filter((record) => record.type === "health").map((record) => ({ animal, record }))).sort((a,b) => b.record.occurredAt.localeCompare(a.record.occurredAt)), [animals]);
  const urgent = animals.flatMap((animal) => (animal.reminders || []).filter((item) => !item.completed && ["vet","medical","medication"].some((term) => item.kind.toLowerCase().includes(term))).map((item) => ({ animal, item })));

  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="MEDICAL & VETERINARY" title="Medical & Vet" description="A dedicated clinical workspace for health observations, medical follow-ups and links into each animal's full history." />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Animals with health records</small><strong>{loading ? "…" : new Set(healthRecords.map(({animal}) => animal.id)).size}</strong></div>
      <div><small>Health records</small><strong>{loading ? "…" : healthRecords.length}</strong></div>
      <div><small>Open clinical follow-ups</small><strong>{loading ? "…" : urgent.length}</strong></div>
    </div></section>
    <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">CLINICAL HISTORY</span><h2>Recent health records</h2></div></div>
      <div className="rescue-record-list">{healthRecords.slice(0,40).map(({animal,record}) => <article key={`${animal.id}-${record.id}`}><header><strong>{animalLabel(animal)}</strong><span>{formatDate(record.occurredAt, true)}</span></header><p>{record.title}</p><p>{record.summary || "No summary recorded."}</p><small>{record.visibility === "medical" ? "Medical / vet" : "Staff record"}</small><div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/animals/${animal.id}/manage`}>Open animal history →</Link></div></article>)}{!healthRecords.length && <div className="rescue-empty"><strong>No medical records yet</strong><span>Health observations added from an animal workspace will appear here.</span></div>}</div>
    </section>
  </main></GatePage>;
}

export function RescueTasks() {
  const { animals, loading, error, refresh } = useRescueData();
  const [filter, setFilter] = useState<"open"|"overdue"|"completed">("open");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const refreshNow = () => setNowMs(Date.now());
    refreshNow();
    const timer = window.setInterval(refreshNow, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const tasks = useMemo(() => animals.flatMap((animal) => (animal.reminders || []).map((item) => ({ animal, item }))).sort((a,b) => a.item.dueAt.localeCompare(b.item.dueAt)), [animals]);
  const filtered = tasks.filter(({item}) => filter === "completed" ? item.completed : !item.completed && (filter === "open" || (nowMs > 0 && new Date(item.dueAt).getTime() < nowMs)));
  async function toggle(animal: RescueAnimal, reminderId: string, completed: boolean) {
    setBusy(`${animal.id}:${reminderId}`); setMessage("");
    try { await setRescueReminderComplete(animal.id, reminderId, completed); await refresh(); } catch(error) { setMessage(error instanceof Error ? error.message : "Could not update the task."); } finally { setBusy(""); }
  }
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="FOLLOW-UP & TASKS" title="Reminders & tasks" description="See every open, overdue and completed follow-up across the Rescue population." />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    {message && <div className="rescue-message rescue-message-error">{message}</div>}
    <section className="rescue-card"><div className="rescue-form-actions">
      {(["open","overdue","completed"] as const).map((item) => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item === "open" ? "Open" : item === "overdue" ? "Overdue" : "Completed"}</button>)}
    </div>
    <div className="rescue-record-list">{filtered.map(({animal,item}) => <article key={`${animal.id}-${item.id}`}><header><strong>{item.title}</strong><span>{formatDate(item.dueAt,true)}</span></header><p>{animalLabel(animal)} · {item.kind} · {item.priority}</p><p>{item.notes || "No notes."}</p><div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/animals/${animal.id}/manage`}>Open animal →</Link><button type="button" disabled={busy === `${animal.id}:${item.id}`} onClick={() => void toggle(animal,item.id,!item.completed)}>{item.completed ? "Reopen" : "Complete"}</button></div></article>)}{!filtered.length && <div className="rescue-empty"><strong>No {filter} tasks</strong><span>Tasks added to individual animal records will appear here.</span></div>}</div></section>
    {loading && <div className="rescue-card"><p>Loading Rescue tasks…</p></div>}
  </main></GatePage>;
}

export function RescueFoster() {
  const { animals, error, loading } = useRescueData();
  const placements = animals.flatMap((animal) => (animal.fosterPlacements || []).map((placement) => ({ animal, placement }))).sort((a,b) => b.placement.startedAt.localeCompare(a.placement.startedAt));
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="FOSTER & PLACEMENT" title="Foster care" description="Track active foster placements, returns, handovers and the care context attached to each animal." />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Active placements</small><strong>{loading ? "…" : placements.filter(({placement}) => placement.status === "active").length}</strong></div>
      <div><small>Placement records</small><strong>{loading ? "…" : placements.length}</strong></div>
      <div><small>Animals in foster</small><strong>{loading ? "…" : new Set(placements.filter(({placement}) => placement.status === "active").map(({animal})=>animal.id)).size}</strong></div>
    </div></section>
    <section className="rescue-card"><div className="rescue-record-list">{placements.slice(0,60).map(({animal,placement}) => <article key={`${animal.id}-${placement.id}`}><header><strong>{animalLabel(animal)}</strong><span>{placement.status}</span></header><p><strong>{placement.fosterName}</strong> · {placement.contact || "No contact recorded"}</p><p>{placement.notes || "No handover notes."}</p><small>Started {formatDate(placement.startedAt)}{placement.endedAt ? ` · ended ${formatDate(placement.endedAt)}` : ""}</small><div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/animals/${animal.id}/manage`}>Open placement →</Link></div></article>)}{!placements.length && <div className="rescue-empty"><strong>No foster placements yet</strong><span>Start a foster placement from the individual animal workspace.</span></div>}</div></section>
  </main></GatePage>;
}

export function RescueTransfers() {
  const { animals, error, loading } = useRescueData();
  const transfers = animals.flatMap((animal) => (animal.transfers || []).map((transfer) => ({ animal, transfer }))).sort((a,b) => b.transfer.occurredAt.localeCompare(a.transfer.occurredAt));
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="MOVEMENT & TRANSFERS" title="Transfers" description="Keep every incoming and outgoing transfer with the animal record, including reason, reference and handover notes." />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Incoming</small><strong>{loading ? "…" : transfers.filter(({transfer}) => transfer.direction === "incoming").length}</strong></div>
      <div><small>Outgoing</small><strong>{loading ? "…" : transfers.filter(({transfer}) => transfer.direction === "outgoing").length}</strong></div>
      <div><small>Total records</small><strong>{loading ? "…" : transfers.length}</strong></div>
    </div></section>
    <section className="rescue-card"><div className="rescue-record-list">{transfers.slice(0,80).map(({animal,transfer}) => <article key={`${animal.id}-${transfer.id}`}><header><strong>{animalLabel(animal)}</strong><span>{transfer.direction === "incoming" ? "Incoming" : "Outgoing"} · {formatDate(transfer.occurredAt)}</span></header><p><strong>{transfer.organisationOrPerson}</strong> · {transfer.reason || "No reason recorded."}</p>{transfer.reference && <small>Reference: {transfer.reference}</small>}{transfer.notes && <p>{transfer.notes}</p>}<div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/animals/${animal.id}/manage`}>Open animal →</Link></div></article>)}{!transfers.length && <div className="rescue-empty"><strong>No transfer records yet</strong><span>Transfers recorded on an individual animal appear here.</span></div>}</div></section>
  </main></GatePage>;
}

export function RescueLocations() {
  const { user, organisation, animals, error, loading, refresh } = useRescueData();
  const [selectedId, setSelectedId] = useState("");
  const [facility, setFacility] = useState("");
  const [room, setRoom] = useState("");
  const [zone, setZone] = useState("");
  const [enclosure, setEnclosure] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = animals.find((animal) => animal.id === selectedId) || null;

  async function move() {
    if (!selected || !user || !organisation) return;
    setBusy(true); setMessage("");
    try {
      const record: RescueLocationRecord = {
        id: crypto.randomUUID(), occurredAt: new Date().toISOString(), facility: facility.trim(),
        room: room.trim(), zone: zone.trim(), enclosure: enclosure.trim(), reason: reason.trim(), recordedByUid: user.uid, visibility: "staff",
      };
      const timeline = [{
        id: crypto.randomUUID(), type: "location" as const, occurredAt: record.occurredAt, title: "Location updated",
        summary: record.enclosure ? `Moved to ${record.enclosure}.` : "Animal location updated.", details: record.reason,
        recordedByUid: user.uid, visibility: "staff" as const,
      }, ...selected.timeline];
      await updateRescueAnimal(selected.id, { locations: [record, ...(selected.locations || [])], enclosure: record.enclosure, timeline });
      await refresh(); setMessage(`Location updated for ${animalLabel(selected)}.`); setFacility(""); setRoom(""); setZone(""); setEnclosure(""); setReason("");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Could not record the move.");
    } finally { setBusy(false); }
  }

  const history = animals.flatMap((animal) => (animal.locations || []).map((location) => ({ animal, location }))).sort((a,b)=>b.location.occurredAt.localeCompare(a.location.occurredAt));

  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="LOCATIONS & MOVEMENT" title="Locations & moves" description="Track where every animal is kept and preserve a movement history whenever its enclosure changes." />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    {message && <div className="rescue-message" role="status">{message}</div>}
    <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">CURRENT LOCATIONS</span><h2>Population by recorded enclosure</h2></div><span>{loading ? "…" : animals.length}</span></div><div className="rescue-animal-list">{animals.map((animal)=> <Link className="rescue-animal-row" to={`/rescue/animals/${animal.id}/manage`} key={animal.id}><span>📍</span><span><strong>{animalLabel(animal)}</strong><small>{animal.enclosure || "Location not recorded"} · {STATUS_LABELS[animal.status]}</small></span><span>Open →</span></Link>)}{!animals.length && !loading && <div className="rescue-empty"><strong>No animals recorded</strong><span>Add your first intake before managing locations.</span></div>}</div></section>
    <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">RECORD A MOVE</span><h2>New location event</h2></div></div><div className="rescue-form-grid">
      <label>Animal<select value={selectedId} onChange={(event)=>setSelectedId(event.target.value)}><option value="">Choose an animal…</option>{animals.map((animal)=><option value={animal.id} key={animal.id}>{animalLabel(animal)}</option>)}</select></label>
      <label>Facility<input value={facility} onChange={(event)=>setFacility(event.target.value)} /></label>
      <label>Room<input value={room} onChange={(event)=>setRoom(event.target.value)} /></label>
      <label>Zone<input value={zone} onChange={(event)=>setZone(event.target.value)} /></label>
      <label>Enclosure<input value={enclosure} onChange={(event)=>setEnclosure(event.target.value)} /></label>
      <label className="rescue-form-grid-span">Reason / context<textarea value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Intake, quarantine move, cleaning, foster return, regrouping…"/></label>
    </div><button type="button" onClick={() => void move()} disabled={busy || !selectedId}>{busy ? "Saving…" : "Record location move"}</button></section>
    <section className="rescue-card"><span className="rescue-eyebrow">MOVEMENT HISTORY</span><h2>Recent location events</h2><div className="rescue-record-list">{history.slice(0,80).map(({animal,location})=><article key={`${animal.id}-${location.id}`}><header><strong>{animalLabel(animal)}</strong><span>{formatDate(location.occurredAt,true)}</span></header><p>{[location.facility,location.room,location.zone,location.enclosure].filter(Boolean).join(" · ") || "Location not recorded"}</p><small>{location.reason || "No reason supplied."}</small></article>)}{!history.length && <div className="rescue-empty"><strong>No location history yet</strong><span>Record the first move when an animal changes enclosure.</span></div>}</div></section>
  </main></GatePage>;
}

export function RescueCompliance() {
  const { user } = useAuth();
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof getRescueSetupState>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const workspace = await getMyRescueWorkspace();
        if (!workspace.organisation) throw new Error("No Rescue organisation is connected to this account.");
        const state = await getRescueSetupState(workspace.organisation.id);
        if (active) setSetup(state);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load Rescue compliance details.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  if (loading) return <GatePage><main className="rescue-page"><section className="rescue-card"><p>Loading Rescue compliance…</p></section></main></GatePage>;
  if (!setup) return <GatePage><main className="rescue-page"><div className="rescue-message rescue-message-error">{message}</div></main></GatePage>;
  const org = setup.organisation;
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="COMPLIANCE & IDENTITY" title="Organisation compliance" description="See exactly what is stored for your Rescue registration, verification references and public transparency settings." actions={<Link className="rescue-primary-link" to="/rescue/organisation">Edit organisation →</Link>} />
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Setup</small><strong>{org.setupComplete ? "Complete" : "Incomplete"}</strong></div>
      <div><small>Directory</small><strong>{org.directoryVisible ? "Public" : "Hidden"}</strong></div>
      <div><small>Public registrations</small><strong>{org.registrationsPublic ? "Published" : "Private"}</strong></div>
      <div><small>Completed</small><strong>{formatDate(org.setupCompletedAt)}</strong></div>
    </div></section>
    <section className="rescue-card"><span className="rescue-eyebrow">REGISTERED DETAILS</span><h2>{org.name}</h2><div className="rescue-detail-grid">
      <div><small>Charity registration</small><strong>{org.charityNumber || "Not supplied"}</strong></div>
      <div><small>Company registration</small><strong>{org.companyNumber || "Not supplied"}</strong></div>
      <div><small>Local authority licence</small><strong>{org.localAuthorityLicence || "Not supplied"}</strong></div>
      <div><small>Other permit / registration</small><strong>{org.otherRegistrationNumber || "Not supplied"}</strong></div>
      <div><small>Issuing authority</small><strong>{org.registrationAuthority || "Not supplied"}</strong></div>
      <div><small>Evidence / verification link</small>{org.registrationEvidenceUrl ? <a href={org.registrationEvidenceUrl} target="_blank" rel="noreferrer">Open evidence ↗</a> : <strong>Not supplied</strong>}</div>
    </div>{org.registrationsPublic && <p className="rescue-form-hint">These registration fields are currently configured to be visible on the public profile. TinyTitans records entered information; it does not independently verify a registration number.</p>}{!org.registrationsPublic && <p className="rescue-form-hint">Registration details remain private from the public Rescue profile.</p>}</section>
    <section className="rescue-card"><span className="rescue-eyebrow">PUBLIC CONTACT & LOCATION</span><div className="rescue-detail-grid">
      <div><small>Location</small><strong>{org.locationLabel || "Not supplied"}</strong></div>
      <div><small>Postcode</small><strong>{org.postcode || "Not supplied"}</strong></div>
      <div><small>Region</small><strong>{org.region || "Not supplied"}</strong></div>
      <div><small>Country</small><strong>{org.country || "Not supplied"}</strong></div>
      <div><small>Contact email</small><strong>{org.contactEmail || "Not supplied"}</strong></div>
      <div><small>Telephone</small><strong>{org.phone || "Not supplied"}</strong></div>
      <div><small>Opening / contact times</small><strong>{org.openingHours || "Not supplied"}</strong></div>
      <div><small>Website</small><strong>{org.website || "Not supplied"}</strong></div>
    </div></section>
    <section className="rescue-card"><span className="rescue-eyebrow">PUBLIC PROFILE</span><h2>See exactly what visitors will see</h2><p>Use the preview before sharing your Rescue profile. Public-safe animal profiles and community actions stay separate from your private records.</p><div className="rescue-form-actions"><Link className="rescue-primary-link" to="/rescue/public-preview">Open preview →</Link>{org.directoryVisible && <Link className="rescue-primary-link" to={`/rescue/public/${setup.organisationId}`}>Open live public profile ↗</Link>}</div></section>
  </main></GatePage>;
}

export function RescuePublicPreview() {
  const { user } = useAuth();
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof getRescueSetupState>> | null>(null);
  const [animals, setAnimals] = useState<RescueAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const workspace = await getMyRescueWorkspace();
        if (!workspace.organisation) throw new Error("No Rescue organisation is connected to this account.");
        const [state, animalRows] = await Promise.all([getRescueSetupState(workspace.organisation.id), listRescueAnimals(workspace.organisation.id)]);
        if (active) { setSetup(state); setAnimals(animalRows); }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not build the Rescue preview.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  if (loading) return <GatePage><main className="rescue-page"><section className="rescue-card"><p>Building public preview…</p></section></main></GatePage>;
  if (!setup) return <GatePage><main className="rescue-page"><div className="rescue-message rescue-message-error">{message}</div></main></GatePage>;
  const org = setup.organisation;
  const publicAnimals = animals.filter((animal) => animal.publicPreview && animal.status !== "deceased" && animal.status !== "transferred");
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="PUBLIC PROFILE PREVIEW" title="Your public Rescue profile" description="This is a management preview of the information visitors can see. Private care records, staff information and internal notes are excluded." actions={<Link className="rescue-primary-link" to="/rescue/organisation">Edit profile →</Link>} />
    {org.heroImageUrl && <div className="rescue-public-hero-image"><img src={org.heroImageUrl} alt="" /></div>}
    <header className="rescue-public-hero rescue-card">{org.logoUrl ? <img src={org.logoUrl} alt="" className="rescue-public-logo" /> : <span className="rescue-public-logo rescue-public-logo-fallback"><TinyTitansIcon name="health" size={34}/></span>}<div><span className="rescue-eyebrow">PUBLIC RESCUE PROFILE</span><h2>{org.name}</h2><p>{org.locationLabel}{org.region ? ` · ${org.region}` : ""}{org.country ? ` · ${org.country}` : ""}</p></div></header>
    <section className="rescue-card"><span className="rescue-eyebrow">ABOUT</span><h2>About this Rescue</h2><p>{org.directoryDescription || "No public description yet."}</p></section>
    {(org.contactEmail || org.phone || org.postcode || org.openingHours) && <section className="rescue-card"><span className="rescue-eyebrow">CONTACT</span><div className="rescue-public-contact-grid">{org.contactEmail && <div><small>Email</small><strong>{org.contactEmail}</strong></div>}{org.phone && <div><small>Telephone</small><strong>{org.phone}</strong></div>}{org.postcode && <div><small>Postcode</small><strong>{org.postcode}</strong></div>}{org.openingHours && <div className="rescue-public-contact-span"><small>Opening / contact times</small><p>{org.openingHours}</p></div>}</div></section>}
    {org.registrationsPublic && (org.charityNumber || org.companyNumber || org.localAuthorityLicence || org.otherRegistrationNumber || org.registrationAuthority) && <section className="rescue-card"><span className="rescue-eyebrow">REGISTRATION</span><h2>Public registration details</h2><div className="rescue-public-contact-grid">{org.charityNumber && <div><small>Charity number</small><strong>{org.charityNumber}</strong></div>}{org.companyNumber && <div><small>Company number</small><strong>{org.companyNumber}</strong></div>}{org.localAuthorityLicence && <div><small>Local authority licence</small><strong>{org.localAuthorityLicence}</strong></div>}{org.otherRegistrationNumber && <div><small>Other registration</small><strong>{org.otherRegistrationNumber}</strong></div>}{org.registrationAuthority && <div><small>Issuing authority</small><strong>{org.registrationAuthority}</strong></div>}</div><p className="rescue-form-hint">These are entered by the Rescue and are not independently verified by TinyTitans.</p></section>}
    <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">FEATURED ANIMALS</span><h2>Public-safe animal profiles</h2></div><span>{publicAnimals.length}</span></div><div className="rescue-animal-list">{publicAnimals.map((animal)=><article className="rescue-animal-row" key={animal.id}><span>🐍</span><span><strong>{animal.name || "Rescue animal"}</strong><small>{animal.speciesCommonName || "Species pending"} · {animal.sex || "Unknown"}</small>{animal.publicSummary && <small>{animal.publicSummary}</small>}</span><span>{STATUS_LABELS[animal.status]}</span></article>)}{!publicAnimals.length && <div className="rescue-empty"><strong>No public animal profiles</strong><span>Enable a public-safe preview on individual animal records to feature them here.</span></div>}</div></section>
    <section className="rescue-card"><div className="rescue-form-actions"><Link className="rescue-primary-link" to="/rescue/organisation">Back to organisation editor →</Link>{org.directoryVisible && <Link className="rescue-primary-link" to={`/rescue/public/${setup.organisationId}`}>Open live profile ↗</Link>}</div></section>
  </main></GatePage>;
}
