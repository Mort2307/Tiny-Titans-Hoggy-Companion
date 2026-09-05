import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import PageBackButton from "../components/PageBackButton";
import { getCreatorVivariumShowcases, reviewVivariumShowcase } from "../services/vivariumShowcaseService";
import type { VivariumShowcaseSubmission } from "../types/vivariumShowcase";
import { findSnakeSpecies } from "../data/species/speciesRegistry";
import "../styles/CreatorTools.css";
import "../styles/vivariumShowcase.css";

function formatDate(value: unknown) {
  if (!value) return "—";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleString("en-GB");
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB");
}

export default function CreatorVivariumShowcase() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<VivariumShowcaseSubmission[]>([]);
  const [selected, setSelected] = useState<VivariumShowcaseSubmission | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setItems(await getCreatorVivariumShowcases()); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load vivarium submissions."); } finally { setLoading(false); }
  }
  useEffect(() => { if (profile?.role === "admin" && user) void load(); }, [profile?.role, user]);
  const visible = items.filter((item) => filter === "all" || item.status === "Pending" || item.status === "NeedsInfo");
  const pending = items.filter((item) => item.status === "Pending" || item.status === "NeedsInfo").length;

  async function act(status: "Approved" | "Rejected" | "NeedsInfo") {
    if (!selected || !user) return;
    const reason = status === "Rejected" || status === "NeedsInfo" ? (window.prompt(status === "Rejected" ? "Rejection reason:" : "What information is needed?", "") ?? "") : "";
    if ((status === "Rejected" || status === "NeedsInfo") && !reason.trim()) return;
    setWorking(true); setError(""); setSuccess("");
    try { await reviewVivariumShowcase(selected.id, status, user.uid, reason); setSuccess(`${selected.title} marked ${status}.`); setSelected(null); await load(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Unable to update the showcase."); } finally { setWorking(false); }
  }

  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return <main className="creator-admin-page">
    <header className="creator-admin-header"><div><PageBackButton fallbackPath="/creator" label="Back to Creator Centre" /><span className="creator-admin-kicker">CREATOR CENTRE · COMMUNITY MEDIA</span><h1>🏡 Vivarium Showcase Review</h1><p>Check that community setup submissions are useful, appropriately described and safe to publish without turning them into universal husbandry prescriptions.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button></header>
    {error && <div className="creator-error">{error}</div>}{success && <div className="creator-success">✓ {success}</div>}
    <div className="morph-library__filters"><button type="button" className={filter === "pending" ? "is-active" : ""} onClick={() => setFilter("pending")}>🏡 Pending · {pending}</button><button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>All · {items.length}</button></div>
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">SETUP QUEUE</span><h2>{pending} awaiting review</h2></div></div>{loading ? <div className="creator-loading">Loading vivarium submissions…</div> : visible.length === 0 ? <div className="creator-list-item"><strong>No vivarium submissions in this view.</strong><span>The queue is clear.</span></div> : <div className="creator-list">{visible.map((item) => <button key={item.id} type="button" className="creator-user-row" onClick={() => setSelected(item)}><span>🏡</span><span><strong>{item.title}</strong><small>{findSnakeSpecies(item.speciesId)?.commonNames[0] || item.speciesName} · {formatDate(item.submittedAt)}</small></span><span>{item.status}</span></button>)}</div>}</section>
    {selected && <div className="vivarium-modal-backdrop" role="presentation" onMouseDown={() => !working && setSelected(null)}><article className="vivarium-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="vivarium-modal__close" type="button" onClick={() => setSelected(null)} aria-label="Close">×</button><span className="vivarium-kicker">REVIEW · {findSnakeSpecies(selected.speciesId)?.commonNames[0] || selected.speciesName}</span><h2>{selected.title}</h2><p>{selected.description}</p><div className="vivarium-meta-grid">{selected.dimensions && <div><span>Dimensions</span><strong>{selected.dimensions}</strong></div>}{selected.enclosureType && <div><span>Type</span><strong>{selected.enclosureType}</strong></div>}{selected.setupAge && <div><span>Setup age</span><strong>{selected.setupAge}</strong></div>}</div><div className="vivarium-media-grid">{selected.media?.map((media) => media.type === "video" ? <figure key={media.id} className="vivarium-media-card"><video controls preload="metadata" src={media.url} /><figcaption>🎥 {media.name}</figcaption></figure> : <figure key={media.id} className="vivarium-media-card"><img src={media.url} alt="" /><figcaption>📷 {media.name}</figcaption></figure>)}</div><div className="vivarium-learning-grid"><section><h4>💚 What works</h4><p>{selected.whatWorks || "Not supplied."}</p></section><section><h4>🔧 What changed</h4><p>{selected.whatChanged || "Not supplied."}</p></section><section><h4>🧠 Lessons</h4><p>{selected.lessonsLearned || "Not supplied."}</p></section><section><h4>📋 Husbandry details</h4><p>Substrate: {selected.substrate || "—"}<br />Heating: {selected.heating || "—"}<br />Temperature: {selected.temperature || "—"}<br />Humidity: {selected.humidity || "—"}<br />Ventilation: {selected.ventilation || "—"}</p></section></div><div className="creator-actions"><button type="button" onClick={() => void act("Approved")} disabled={working}>✓ Approve & publish</button><button type="button" onClick={() => void act("NeedsInfo")} disabled={working}>Request changes</button><button type="button" onClick={() => void act("Rejected")} disabled={working}>Reject</button></div></article></div>}
  </main>;
}
