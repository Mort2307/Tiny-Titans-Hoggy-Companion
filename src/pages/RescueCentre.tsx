import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import PaidTierGate from "../components/PaidTierGate";
import { useAuth } from "../context/useAuth";
import { createRescueAnimal, createRescueOrganisation, getRescueAccess, getRescueOrganisationForUser, listRescueAnimals } from "../services/rescueService";
import type { RescueAnimal, RescueOrganisation } from "../types/rescue";
import "../styles/rescue.css";

const statusLabels: Record<RescueAnimal["status"], string> = {
  in_care: "In care",
  quarantine: "Quarantine",
  under_observation: "Observation",
  adopted: "Adopted",
  transferred: "Transferred",
  deceased: "Deceased",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default function RescueCentre() {
  const { user } = useAuth();
  const [org, setOrg] = useState<RescueOrganisation | null>(null);
  const [animals, setAnimals] = useState<RescueAnimal[]>([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [animal, setAnimal] = useState({
    name: "", speciesCommonName: "", scientificName: "", sex: "Unknown", morphOrColour: "", estimatedAge: "",
    status: "in_care" as RescueAnimal["status"], enclosure: "", intakeDate: new Date().toISOString().slice(0, 10),
    publicPreview: false, publicSummary: "", husbandrySummary: "", privateNotes: "",
  });

  async function refresh(uid: string) {
    const current = await getRescueOrganisationForUser(uid);
    setOrg(current);
    setAnimals(current ? await listRescueAnimals(current.id) : []);
  }

  useEffect(() => {
    if (!user) return;
    void refresh(user.uid).catch((error) => setMessage(error instanceof Error ? error.message : "Could not load the Rescue workspace."));
  }, [user]);

  async function createWorkspace() {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      await createRescueOrganisation(user.uid, name.trim() || "My Rescue Centre");
      await refresh(user.uid);
      setName("");
      setMessage("Organisation created. Your Rescue command centre is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the Rescue organisation.");
    } finally {
      setBusy(false);
    }
  }

  async function intake() {
    if (!org || !user) return;
    const cleanName = animal.name.trim();
    const cleanSpecies = animal.speciesCommonName.trim();
    if (!cleanName || !cleanSpecies) {
      setMessage("Animal name and species are required.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await createRescueAnimal({ ...animal, organisationId: org.id }, user.uid);
      await refresh(user.uid);
      setAnimal({ name: "", speciesCommonName: "", scientificName: "", sex: "Unknown", morphOrColour: "", estimatedAge: "", status: "in_care", enclosure: "", intakeDate: new Date().toISOString().slice(0, 10), publicPreview: false, publicSummary: "", husbandrySummary: "", privateNotes: "" });
      setMessage("Animal added to the Rescue register.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add the animal.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => animals.filter((item) => [item.name, item.speciesCommonName, item.scientificName, item.enclosure, item.status].join(" ").toLowerCase().includes(search.toLowerCase())), [animals, search]);
  const access = getRescueAccess(org, user?.uid);

  return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page">
    <header className="rescue-subhead"><div><span className="rescue-eyebrow">RESCUE WORKSPACE</span><h1><TinyTitansIcon name="reptile" size={35}/> {org?.name || "Rescue Centre"}</h1><p>One organisation workspace for every species, every animal identity and the operational record around it.</p></div></header>
    {!org ? <section className="rescue-card rescue-onboarding-card"><span className="rescue-eyebrow">ORGANISATION SETUP</span><h2>Set up your Rescue organisation</h2><p>This setup appears automatically the first time a Rescue-enabled account reaches the Rescue Centre. Create the organisation once and your staff, animals, QR identities, records and reports will all belong to it.</p><label>Rescue organisation name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Happy Hogs Rescue" autoFocus /></label><button type="button" onClick={() => void createWorkspace()} disabled={busy}>{busy ? "Creating…" : "Create Rescue organisation"}</button>{message && <div className="rescue-message" role="status">{message}</div>}</section> : <>
      <section className="rescue-card"><div className="rescue-detail-grid"><div><small>Organisation</small><strong>{org.name}</strong></div><div><small>Your role</small><strong>{access.role || "Unknown"}</strong></div><div><small>Workspace status</small><strong>{org.accountStatus?.replaceAll("_", " ") || "Unknown"}</strong></div><div><small>Pilot end</small><strong>{formatDate(org.pilotEndsAt)}</strong></div></div></section>
      <section className="rescue-grid"><Link className="rescue-card rescue-nav-card" to="/rescue/animals"><span className="rescue-eyebrow">ANIMAL REGISTER</span><h2>Animal Register</h2><p>Intake, search and open passports for any species, including unknown or pending identification.</p><span>Open register →</span></Link><Link className="rescue-card rescue-nav-card" to="/rescue/animals?intake=1"><span className="rescue-eyebrow">NEW INTAKE</span><h2>New Intake</h2><p>Create the animal record without an extra navigation step.</p><span>Start intake →</span></Link><Link className="rescue-card rescue-nav-card" to="/rescue/qr"><span className="rescue-eyebrow">QR IDENTITY</span><h2>Scan / Create QR</h2><p>Generate printable QR labels and resolve existing labels.</p><span>Open QR centre →</span></Link><Link className="rescue-card rescue-nav-card" to="/rescue/team"><span className="rescue-eyebrow">ACCESS CONTROL</span><h2>Team &amp; Permissions</h2><p>Manage organisational staff access and roles.</p><span>Open team →</span></Link></section>
      {message && <div className="rescue-message" role="status">{message}</div>}
      <section className="rescue-card"><span className="rescue-eyebrow">QUICK INTAKE</span><h2>Add rescue animal</h2><div className="rescue-form-grid"><label>Name<input value={animal.name} onChange={(event) => setAnimal((current) => ({ ...current, name: event.target.value }))} /></label><label>Species<input value={animal.speciesCommonName} onChange={(event) => setAnimal((current) => ({ ...current, speciesCommonName: event.target.value }))} /></label><label>Scientific name<input value={animal.scientificName} onChange={(event) => setAnimal((current) => ({ ...current, scientificName: event.target.value }))} /></label><label>Sex<select value={animal.sex} onChange={(event) => setAnimal((current) => ({ ...current, sex: event.target.value }))}><option>Unknown</option><option>Male</option><option>Female</option><option>Intersex</option></select></label></div><button type="button" onClick={() => void intake()} disabled={busy}>{busy ? "Adding…" : "Create animal record"}</button></section>
      <section className="rescue-card"><label className="rescue-search"><TinyTitansIcon name="search" size={21}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search animal, species, enclosure or status…" /></label><div className="rescue-animal-list">{filtered.map((item) => <Link className="rescue-animal-row" to={`/rescue/animals/${item.id}`} key={item.id}><span className="rescue-animal-avatar"><TinyTitansIcon name="reptile" size={23}/></span><span><strong>{item.name}</strong><small>{item.speciesCommonName} · {statusLabels[item.status]} · {item.enclosure || "No enclosure"}</small></span><span>Open →</span></Link>)}{!filtered.length && <div className="rescue-empty"><strong>No matching animals</strong><span>{animals.length ? "Try a different search." : "Use the quick intake above to create the first record."}</span></div>}</div></section>
    </>}
  </main></PaidTierGate>;
}
