import { Link } from "react-router-dom";
import { GatePage, PageHeader, useRescueData, animalLabel, formatDate } from "../../components/rescue/RescueOperationsShared";
import TinyTitansIcon from "../../components/TinyTitansIcon";

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
    <section className="rescue-card"><div className="rescue-record-list">{placements.slice(0,60).map(({animal,placement}) => <article key={`${animal.id}-${placement.id}`}><header><strong>{animalLabel(animal)}</strong><span>{placement.status}</span></header><p><strong>{placement.fosterName}</strong> · {placement.contact || "No contact recorded"}</p><p>{placement.notes || "No handover notes."}</p><small>Started {formatDate(placement.startedAt)}{placement.endedAt ? ` · ended ${formatDate(placement.endedAt)}` : ""}</small><div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/animals/${animal.id}/manage`}>Open placement <TinyTitansIcon name="forward" size={12} /></Link></div></article>)}{!placements.length && <div className="rescue-empty"><strong>No foster placements yet</strong><span>Start a foster placement from the individual animal workspace.</span></div>}</div></section>
  </main></GatePage>;
}
