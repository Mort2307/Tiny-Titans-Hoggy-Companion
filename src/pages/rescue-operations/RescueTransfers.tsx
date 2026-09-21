import { Link } from "react-router-dom";
import { GatePage, PageHeader, useRescueData, animalLabel, formatDate } from "../components/rescue/RescueOperationsShared";

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
