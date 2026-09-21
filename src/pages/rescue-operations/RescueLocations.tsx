import {
  useState
} from "react";
import { Link } from "react-router-dom";
import { updateRescueAnimal } from "../services/rescueService";
import type { RescueLocationRecord } from "../types/rescue";
import { GatePage, PageHeader, useRescueData, animalLabel, formatDate, STATUS_LABELS } from "../components/rescue/RescueOperationsShared";

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
