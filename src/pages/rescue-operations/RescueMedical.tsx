import {
import TinyTitansIcon from "../../components/TinyTitansIcon";
  useMemo
} from "react";
import { Link } from "react-router-dom";
import { GatePage, PageHeader, useRescueData, animalLabel, formatDate } from "../../components/rescue/RescueOperationsShared";

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
      <div className="rescue-record-list">{healthRecords.slice(0,40).map(({animal,record}) => <article key={`${animal.id}-${record.id}`}><header><strong>{animalLabel(animal)}</strong><span>{formatDate(record.occurredAt, true)}</span></header><p>{record.title}</p><p>{record.summary || "No summary recorded."}</p><small>{record.visibility === "medical" ? "Medical / vet" : "Staff record"}</small><div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/animals/${animal.id}/manage`}>Open animal history <TinyTitansIcon name="forward" size={12} /></Link></div></article>)}{!healthRecords.length && <div className="rescue-empty"><strong>No medical records yet</strong><span>Health observations added from an animal workspace will appear here.</span></div>}</div>
    </section>
  </main></GatePage>;
}
