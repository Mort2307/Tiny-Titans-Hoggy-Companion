import {
import TinyTitansIcon from "../../components/TinyTitansIcon";
  useEffect,
  useState
} from "react";
import { Link } from "react-router-dom";
import { updateRescueAnimal } from "../../services/rescueService";
import type { RescueAnimalStatus, RescueQuarantineRecord } from "../../types/rescue";
import { GatePage, PageHeader, useRescueData, animalLabel, formatDate } from "../../components/rescue/RescueOperationsShared";

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
    <PageHeader eyebrow="QUARANTINE & ISOLATION" title="Quarantine" description="Track isolation, reasons, review dates and outcomes without losing the original intake context." actions={<Link className="rescue-primary-link" to="/rescue/intake">Open intake <TinyTitansIcon name="forward" size={12} /></Link>} />
    {error && <div className="rescue-message rescue-message-error">{error}</div>}
    {message && <div className="rescue-message" role="status">{message}</div>}
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Currently quarantined</small><strong>{loading ? "…" : quarantined.length}</strong></div>
      <div><small>Needs review date</small><strong>{loading ? "…" : quarantined.filter((animal) => animal.quarantine?.reviewAt).length}</strong></div>
      <div><small>Animals without quarantine detail</small><strong>{loading ? "…" : quarantined.filter((animal) => !animal.quarantine).length}</strong></div>
    </div></section>
    <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">ACTIVE QUEUE</span><h2>Animals in quarantine</h2></div><span>{quarantined.length}</span></div>
      <div className="rescue-animal-list">{quarantined.map((animal) => <button type="button" className="rescue-animal-row" key={animal.id} onClick={() => setSelectedId(animal.id)}><span><TinyTitansIcon name="lock" size={16} /></span><span><strong>{animalLabel(animal)}</strong><small>{animal.quarantine?.area || "Isolation area not recorded"} · review {formatDate(animal.quarantine?.reviewAt)}</small></span><span>Review <TinyTitansIcon name="forward" size={12} /></span></button>)}{!quarantined.length && <div className="rescue-empty"><strong>No animals currently in quarantine</strong><span>New intakes can be placed into quarantine from the animal record.</span></div>}</div>
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
