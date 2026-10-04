import { useEffect, useMemo, useState } from "react";
import PageBackButton from "../components/PageBackButton";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansFeedback from "../components/TinyTitansFeedback";
import {
  SERVICE_ANIMAL_GROUP_LABELS,
  SERVICE_CATEGORY_LABELS,
  listVerifiedServices,
  submitServiceDirectoryEntry,
  type ServiceAnimalGroup,
  type ServiceCategory,
  type ServiceDirectoryEntry,
} from "../services/serviceDirectoryService";
import "../styles/serviceDirectory.css";

const categories = Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[];
const animalGroups = Object.keys(SERVICE_ANIMAL_GROUP_LABELS) as ServiceAnimalGroup[];

export default function ServiceDirectory() {
  const [services, setServices] = useState<ServiceDirectoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ServiceCategory>("all");
  const [showSubmit, setShowSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", category: "exotics_vet" as ServiceCategory, animalGroups: ["reptiles"] as ServiceAnimalGroup[],
    line1: "", city: "", region: "", postcode: "", countryCode: "GB", phone: "", email: "", website: "", notes: "", emergencyCare: false,
  });

  async function load() {
    setBusy(true); setError("");
    try { setServices(await listVerifiedServices()); }
    catch (err) { setError(err instanceof Error ? err.message : "Services could not be loaded."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return services.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!needle) return true;
      return [item.name, item.city, item.region, item.postcode, SERVICE_CATEGORY_LABELS[item.category], ...item.animalGroups.map((group) => SERVICE_ANIMAL_GROUP_LABELS[group])].join(" ").toLowerCase().includes(needle);
    });
  }, [services, query, category]);

  function toggleGroup(group: ServiceAnimalGroup) {
    setForm((current) => ({ ...current, animalGroups: current.animalGroups.includes(group) ? current.animalGroups.filter((item) => item !== group) : [...current.animalGroups, group] }));
  }
  async function submit() {
    setBusy(true); setMessage(""); setError("");
    try {
      await submitServiceDirectoryEntry(form);
      setMessage("Thanks — the service has been submitted for Tiny Titans review before it appears publicly.");
      setShowSubmit(false);
      setForm((current) => ({ ...current, name: "", line1: "", city: "", region: "", postcode: "", phone: "", email: "", website: "", notes: "", emergencyCare: false }));
    } catch (err) { setError(err instanceof Error ? err.message : "Service submission failed."); }
    finally { setBusy(false); }
  }

  return <main className="tt-services-page">
    <PageBackButton fallbackPath="/account/settings" label="Back" />
    <header className="tt-services-hero">
      <div><span className="tt-services-kicker">TINY TITANS · COMMUNITY VERIFIED</span><h1><TinyTitansIcon name="vet" size={29} /> Exotic Services Directory</h1><p>A specialist directory built for animal keepers rather than a paid generic places API. Entries are community submitted and Creator reviewed before publication.</p></div>
      <button type="button" className="is-primary" onClick={() => setShowSubmit((value) => !value)}>{showSubmit ? "Close submission" : "Suggest a service"}</button>
    </header>

    {message && <TinyTitansFeedback>{message}</TinyTitansFeedback>}
    {error && <TinyTitansFeedback className="tt-services-error">{error}</TinyTitansFeedback>}

    {showSubmit && <section className="tt-services-submit">
      <div><span className="tt-services-kicker">ADD TO THE DIRECTORY</span><h2>Suggest a specialist service</h2><p>Tiny Titans does not publish submissions automatically. The Creator review queue checks the details before an entry becomes verified.</p></div>
      <div className="tt-services-form">
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} /></label>
        <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ServiceCategory })}>{categories.map((item) => <option key={item} value={item}>{SERVICE_CATEGORY_LABELS[item]}</option>)}</select></label>
        <label>Address<input value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} /></label>
        <label>Town / city<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
        <label>County / region<input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></label>
        <label>Postcode<input value={form.postcode} onChange={(event) => setForm({ ...form, postcode: event.target.value })} /></label>
        <label>Country code<input value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value.toUpperCase() })} maxLength={2} /></label>
        <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Website<input type="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://" /></label>
      </div>
      <fieldset><legend>Animals supported</legend><div className="tt-services-checks">{animalGroups.map((group) => <label key={group}><input type="checkbox" checked={form.animalGroups.includes(group)} onChange={() => toggleGroup(group)} /> {SERVICE_ANIMAL_GROUP_LABELS[group]}</label>)}</div></fieldset>
      <label className="tt-services-wide">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={1200} rows={4} /></label>
      <label className="tt-services-toggle"><input type="checkbox" checked={form.emergencyCare} onChange={(event) => setForm({ ...form, emergencyCare: event.target.checked })} /> Offers emergency / out-of-hours care</label>
      <button type="button" className="is-primary" disabled={busy || !form.name.trim() || !form.city.trim() || form.animalGroups.length === 0} onClick={() => void submit()}>{busy ? "Submitting…" : "Submit for review"}</button>
    </section>}

    <section className="tt-services-toolbar">
      <label><TinyTitansIcon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, town, postcode or animal…" /></label>
      <select value={category} onChange={(event) => setCategory(event.target.value as "all" | ServiceCategory)}><option value="all">All services</option>{categories.map((item) => <option key={item} value={item}>{SERVICE_CATEGORY_LABELS[item]}</option>)}</select>
      <span>{filtered.length} verified</span>
    </section>

    <section className="tt-services-grid">
      {filtered.map((item) => <article key={item.id} className="tt-service-card">
        <header><span className="tt-service-category">{SERVICE_CATEGORY_LABELS[item.category]}</span>{item.emergencyCare && <em>Emergency care</em>}</header>
        <h2>{item.name}</h2>
        <p className="tt-service-location">{[item.line1, item.city, item.region, item.postcode].filter(Boolean).join(", ")} · {item.countryCode}</p>
        <div className="tt-service-tags">{item.animalGroups.map((group) => <span key={group}>{SERVICE_ANIMAL_GROUP_LABELS[group]}</span>)}</div>
        {item.notes && <p>{item.notes}</p>}
        <div className="tt-service-actions">{item.phone && <a href={"tel:" + item.phone}>Call</a>}{item.email && <a href={"mailto:" + item.email}>Email</a>}{item.website && <a href={item.website} target="_blank" rel="noreferrer">Website</a>}</div>
        <footer><TinyTitansIcon name="check" size={14} /> Creator reviewed · community confirmations {item.communitySubmissionCount}</footer>
      </article>)}
      {!busy && filtered.length === 0 && <article className="tt-services-empty"><TinyTitansIcon name="vet" size={30} /><strong>No matching verified services yet</strong><p>This directory grows through keeper submissions rather than a paid places provider.</p></article>}
    </section>
  </main>;
}
