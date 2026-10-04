import { useEffect, useState } from "react";
import PageBackButton from "../components/PageBackButton";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansFeedback from "../components/TinyTitansFeedback";
import {
  SERVICE_ANIMAL_GROUP_LABELS,
  SERVICE_CATEGORY_LABELS,
  listServiceDirectorySubmissions,
  reviewServiceDirectorySubmission,
  type ServiceDirectorySubmission,
} from "../services/serviceDirectoryService";
import "../styles/serviceDirectory.css";

function when(value: number | null): string {
  return value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Unknown";
}

export default function CreatorServiceDirectory() {
  const [items, setItems] = useState<ServiceDirectorySubmission[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try { setItems(await listServiceDirectorySubmissions("pending")); }
    catch (err) { setError(err instanceof Error ? err.message : "Directory review queue could not be loaded."); }
  }
  useEffect(() => { void load(); }, []);

  async function decide(item: ServiceDirectorySubmission, decision: "approve" | "reject") {
    setBusyId(item.id); setError(""); setMessage("");
    try {
      await reviewServiceDirectorySubmission(item.id, decision, notes[item.id] || "");
      setMessage(decision === "approve" ? item.name + " has been reviewed and published." : item.name + " was rejected.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Review decision failed."); }
    finally { setBusyId(""); }
  }

  return <main className="tt-services-page">
    <PageBackButton fallbackPath="/creator" label="Back to Creator Centre" />
    <header className="tt-services-hero"><div><span className="tt-services-kicker">CREATOR · DIRECTORY REVIEW</span><h1><TinyTitansIcon name="vet" size={29} /> Service submissions</h1><p>Nothing reaches the public specialist directory until it has been reviewed here. Approval confirms the listing is suitable to publish; it does not automatically certify professional credentials or service quality.</p></div><button type="button" onClick={() => void load()}>Refresh</button></header>
    {message && <TinyTitansFeedback>{message}</TinyTitansFeedback>}
    {error && <TinyTitansFeedback className="tt-services-error">{error}</TinyTitansFeedback>}
    <section className="tt-service-review-list">
      {items.map((item) => <article key={item.id} className="tt-service-review-card">
        <header><div><span className="tt-service-category">{SERVICE_CATEGORY_LABELS[item.category]}</span><h2>{item.name}</h2><small>Submitted {when(item.submittedAtMs)}</small></div>{item.emergencyCare && <em>Emergency care claimed</em>}</header>
        <p>{[item.line1, item.city, item.region, item.postcode, item.countryCode].filter(Boolean).join(", ")}</p>
        <div className="tt-service-tags">{item.animalGroups.map((group) => <span key={group}>{SERVICE_ANIMAL_GROUP_LABELS[group]}</span>)}</div>
        <dl><div><dt>Phone</dt><dd>{item.phone || "—"}</dd></div><div><dt>Email</dt><dd>{item.email || "—"}</dd></div><div><dt>Website</dt><dd>{item.website || "—"}</dd></div></dl>
        {item.notes && <p className="tt-service-review-notes">{item.notes}</p>}
        <label>Creator review note<textarea rows={3} value={notes[item.id] || ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} /></label>
        <div className="tt-service-review-actions"><button type="button" disabled={Boolean(busyId)} onClick={() => void decide(item, "reject")}>Reject</button><button type="button" className="is-primary" disabled={Boolean(busyId)} onClick={() => void decide(item, "approve")}>{busyId === item.id ? "Saving…" : "Approve & publish"}</button></div>
      </article>)}
      {!items.length && <article className="tt-services-empty"><TinyTitansIcon name="check" size={30} /><strong>Review queue clear</strong><p>No service submissions are awaiting review.</p></article>}
    </section>
  </main>;
}
