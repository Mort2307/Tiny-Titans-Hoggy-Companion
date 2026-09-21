import {
  useEffect,
  useState
} from "react";
import { Link } from "react-router-dom";
import { updateRescueAnimal } from "../services/rescueService";
import type { RescueIntakeRecord } from "../types/rescue";
import { GatePage, PageHeader, useRescueData, animalLabel, STATUS_LABELS } from "../components/rescue/RescueOperationsShared";

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
      await updateRescueAnimal(selected.id, { intakeRecord: record });
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
