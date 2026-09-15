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

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function ageInDays(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / 86400000)) : 0;
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
    if (user) void refresh(user.uid).catch((error) => setMessage(error instanceof Error ? error.message : "Rescue workspace unavailable."));
  }, [user]);

  async function setup() {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      const created = await createRescueOrganisation(user.uid, name);
      setOrg(created);
      setName("");
      setMessage("Rescue workspace created. Your operational dashboard is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create workspace.");
    } finally {
      setBusy(false);
    }
  }

  async function addAnimal() {
    if (!user || !org) return;
    if (!animal.name.trim() || !animal.speciesCommonName.trim()) {
      setMessage("Animal name and species are required for intake.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await createRescueAnimal({ ...animal, organisationId: org.id }, user.uid);
      setAnimals(await listRescueAnimals(org.id));
      setAnimal((current) => ({ ...current, name: "", speciesCommonName: "", scientificName: "", publicSummary: "", privateNotes: "" }));
      setMessage("Animal record created and added to the intake history.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save animal.");
    } finally {
      setBusy(false);
    }
  }

  const access = useMemo(() => getRescueAccess(org, user?.uid), [org, user?.uid]);
  const counts = useMemo(() => animals.reduce((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, {} as Record<string, number>), [animals]);

  const filteredAnimals = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return animals.slice(0, 8);
    return animals.filter((item) => [item.name, item.speciesCommonName, item.scientificName, item.enclosure, item.morphOrColour].join(" ").toLowerCase().includes(needle)).slice(0, 12);
  }, [animals, search]);

  const priorityAnimals = useMemo(() => animals
    .filter((item) => item.status === "quarantine" || item.status === "under_observation" || !item.enclosure || !item.speciesCommonName)
    .sort((a, b) => {
      const score = (item: RescueAnimal) => (item.status === "quarantine" ? 3 : item.status === "under_observation" ? 2 : 1) + (!item.enclosure ? 1 : 0) + (!item.scientificName ? 1 : 0);
      return score(b) - score(a) || new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    })
    .slice(0, 6), [animals]);

  const recentActivity = useMemo(() => animals
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6), [animals]);

  const incompleteRecords = animals.filter((item) => !item.enclosure || !item.scientificName || !item.husbandrySummary).length;
  const activeCare = (counts.in_care || 0) + (counts.quarantine || 0) + (counts.under_observation || 0);
  const activeMembers = [org?.ownerUid, ...(org?.managerUids || []), ...(org?.staffUids || []), ...(org?.medicalUids || []), ...(org?.fosterUids || []), ...(org?.viewerUids || [])].filter(Boolean).filter((uid, index, list) => list.indexOf(uid) === index).length;
  const limit = org?.animalLimit;
  const statusLabel = org?.accountStatus === "paid_active" ? "Paid workspace" : org?.pilotStatus === "pilot_active" ? "30-day pilot" : "Rescue workspace";

  return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page rescue-command-centre">
    <header className="rescue-hero rescue-command-hero">
      <div>
        <div className="rescue-command-kicker"><span className="rescue-eyebrow">TINY TITANS · RESCUE OPERATIONS</span>{org && <span className="rescue-role-badge">{access.role || "member"}</span>}</div>
        <h1><TinyTitansIcon name="health" size={38} /> {org ? org.name : "Rescue Centre"}</h1>
        <p>{org ? "Your rescue operations workspace — animal intake, daily care, records, team coordination, adoption and public identity." : "A dedicated operational workspace for rescue organisations, not a keeper dashboard."}</p>
      </div>
      {org && <div className="rescue-command-actions"><Link className="rescue-primary-link" to="/rescue/animals"><TinyTitansIcon name="reptile" size={21} /> Animal register</Link><Link className="rescue-secondary-link" to="/rescue/scan"><TinyTitansIcon name="observatory" size={21} /> Scan QR</Link></div>}
    </header>

    {!org ? <section className="rescue-card rescue-onboarding-card">
      <span className="rescue-eyebrow">RESCUE WORKSPACE</span>
      <h2>Turn TinyTitans into your rescue operations desk</h2>
      <p>The Rescue workspace is separate from personal animal keeping. Create the organisation once, then invite staff, fosters and veterinary users into the same workspace with their own TinyTitans accounts.</p>
      <div className="rescue-onboarding-grid">
        <div><strong>Animal register</strong><span>One searchable record for every animal in care.</span></div>
        <div><strong>Care history</strong><span>Chronological intake, husbandry, weight, feeding, behaviour and medical events.</span></div>
        <div><strong>Team access</strong><span>Role-based access without forcing every staff member to buy Rescue.</span></div>
        <div><strong>Public identity</strong><span>Controlled public previews and QR identity without exposing private records.</span></div>
      </div>
      <div className="rescue-inline"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rescue Centre / organisation name" /><button type="button" onClick={() => void setup()} disabled={busy}>{busy ? "Creating…" : "Create Rescue Workspace"}</button></div>
      {message && <div className="rescue-message" role="status">{message}</div>}
    </section> : <>
      <nav className="rescue-workspace-nav" aria-label="Rescue workspace">
        <Link className="active" to="/rescue">Dashboard</Link>
        <Link to="/rescue/animals">Animals</Link>
        <Link to="/rescue/adoption">Adoption</Link>
        <Link to="/rescue/reports">Reports</Link>
        <Link to="/rescue/team">Team</Link>
        <Link to="/rescue/scan">QR / Scanner</Link>
        <Link to="/rescue/species-incubator">Species discovery</Link>
      </nav>

      <section className="rescue-stat-grid rescue-command-stats">
        <Link className="rescue-stat-card" to="/rescue/animals"><TinyTitansIcon name="reptile" size={26} /><strong>{animals.length}</strong><span>Total animals</span><small>{activeCare} currently active</small></Link>
        <Link className="rescue-stat-card rescue-stat-alert" to="/rescue/animals"><TinyTitansIcon name="health" size={26} /><strong>{counts.quarantine || 0}</strong><span>Quarantine</span><small>Keep visible on the daily board</small></Link>
        <Link className="rescue-stat-card" to="/rescue/animals"><TinyTitansIcon name="observatory" size={26} /><strong>{counts.under_observation || 0}</strong><span>Observation</span><small>Animals needing closer follow-up</small></Link>
        <Link className="rescue-stat-card" to="/rescue/adoption"><TinyTitansIcon name="wall" size={26} /><strong>{animals.filter((item) => item.publicPreview).length}</strong><span>Public profiles</span><small>{animals.filter((item) => !item.publicPreview && item.status === "in_care").length} potential profiles not yet published</small></Link>
      </section>

      <section className="rescue-command-grid rescue-command-grid-main">
        <div className="rescue-card rescue-priority-card">
          <div className="rescue-card-head"><div><span className="rescue-eyebrow">TODAY'S PRIORITY QUEUE</span><h2>What needs attention?</h2><p>Operational prompts based on the records currently in this workspace.</p></div><Link className="rescue-text-link" to="/rescue/reports">Open reports →</Link></div>
          {priorityAnimals.length ? <div className="rescue-priority-list">{priorityAnimals.map((item) => <Link className="rescue-priority-row" to={`/rescue/animals/${item.id}/manage`} key={item.id}><span className="rescue-priority-dot" /><span><strong>{item.name}</strong><small>{item.speciesCommonName} · {statusLabels[item.status]}{item.enclosure ? ` · ${item.enclosure}` : " · enclosure not recorded"}</small></span><b>{item.status === "quarantine" ? "QUARANTINE" : item.status === "under_observation" ? "OBSERVATION" : "RECORD CHECK"}</b></Link>)}</div> : <div className="rescue-empty"><strong>No immediate record priorities</strong><span>Your current animal records do not have obvious queue items. Keep the daily board up to date as animals move through care.</span></div>}
        </div>

        <div className="rescue-card rescue-operations-card">
          <span className="rescue-eyebrow">RESCUE COMMAND BOARD</span><h2>Daily operations</h2>
          <div className="rescue-command-action-grid">
            <Link to="/rescue/animals"><TinyTitansIcon name="reptile" size={23} /><strong>Open animal register</strong><small>Search, filter and open passports.</small></Link>
            <Link to="/rescue/scan"><TinyTitansIcon name="observatory" size={23} /><strong>Scan an animal</strong><small>Resolve QR identity instantly.</small></Link>
            <Link to="/rescue/adoption"><TinyTitansIcon name="wall" size={23} /><strong>Adoption pipeline</strong><small>Manage public-facing profiles.</small></Link>
            <Link to="/rescue/team"><TinyTitansIcon name="community" size={23} /><strong>Team & roles</strong><small>Manage operational access.</small></Link>
            <Link to="/rescue/reports"><TinyTitansIcon name="weight" size={23} /><strong>Reports</strong><small>Review workload and completeness.</small></Link>
            <Link to="/rescue/species-incubator"><TinyTitansIcon name="genetics" size={23} /><strong>Species discovery</strong><small>Submit unfamiliar species for review.</small></Link>
          </div>
        </div>
      </section>

      <section className="rescue-command-grid">
        <div className="rescue-card">
          <div className="rescue-card-head"><div><span className="rescue-eyebrow">ANIMAL REGISTER</span><h2>Latest records</h2></div><Link className="rescue-text-link" to="/rescue/animals">View all →</Link></div>
          <div className="rescue-search"><TinyTitansIcon name="search" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, species, enclosure or colour…" aria-label="Search rescue animals" /></div>
          {filteredAnimals.length ? <div className="rescue-animal-list">{filteredAnimals.map((item) => <Link className="rescue-animal-row rescue-register-row" to={`/rescue/animals/${item.id}`} key={item.id}><span className="rescue-animal-avatar"><TinyTitansIcon name="reptile" size={21} /></span><span><strong>{item.name}</strong><small>{item.speciesCommonName} · {statusLabels[item.status]} · {item.enclosure || "No enclosure recorded"}</small></span><span className="rescue-row-date">{formatDate(item.updatedAt)}</span></Link>)}</div> : <div className="rescue-empty"><strong>{animals.length ? "No matching animals" : "No animals recorded yet"}</strong><span>{animals.length ? "Try a different search term." : "Use Quick Intake below to create the first record."}</span></div>}
        </div>

        <div className="rescue-card">
          <span className="rescue-eyebrow">WORKSPACE HEALTH</span><h2>Operational snapshot</h2>
          <div className="rescue-health-list">
            <div><span>Record completeness</span><strong>{animals.length ? Math.max(0, Math.round(((animals.length - incompleteRecords) / animals.length) * 100)) : 0}%</strong><small>{incompleteRecords} record{incompleteRecords === 1 ? "" : "s"} need key information</small></div>
            <div><span>Team members</span><strong>{activeMembers}</strong><small>Owner, managers, staff, medical, foster and viewer access</small></div>
            <div><span>Animal capacity</span><strong>{limit ? `${animals.length}/${limit}` : String(animals.length)}</strong><small>{limit ? `${Math.max(0, limit - animals.length)} spaces remaining` : "No local workspace limit recorded"}</small></div>
            <div><span>Species discovery</span><strong>{org.speciesDiscovered.length}</strong><small>Species candidates discovered through this rescue</small></div>
          </div>
          <div className="rescue-workspace-status"><span className="rescue-status-pill">{statusLabel}</span><span>Signed in as <strong>{access.role || "member"}</strong></span></div>
        </div>
      </section>

      <section className="rescue-command-grid">
        <div className="rescue-card">
          <span className="rescue-eyebrow">CARE FLOOR</span><h2>Where animals are in the workflow</h2>
          <div className="rescue-floor-grid">
            <Link to="/rescue/animals"><strong>{counts.quarantine || 0}</strong><span>Quarantine</span><small>Isolation / intake stage</small></Link>
            <Link to="/rescue/animals"><strong>{counts.under_observation || 0}</strong><span>Observation</span><small>Closer monitoring</small></Link>
            <Link to="/rescue/animals"><strong>{counts.in_care || 0}</strong><span>General care</span><small>Currently in rescue care</small></Link>
            <Link to="/rescue/animals"><strong>{counts.adopted || 0}</strong><span>Adopted</span><small>Completed placement records</small></Link>
          </div>
        </div>
        <div className="rescue-card">
          <span className="rescue-eyebrow">RECENT ACTIVITY</span><h2>Latest record movement</h2>
          {recentActivity.length ? <div className="rescue-activity-list">{recentActivity.map((item) => <Link to={`/rescue/animals/${item.id}`} className="rescue-activity-row" key={item.id}><span>{item.timeline[0]?.type === "medical" ? "✚" : item.timeline[0]?.type === "feeding" ? "◉" : "●"}</span><span><strong>{item.name}</strong><small>{item.timeline[0]?.title || "Record updated"} · {formatDate(item.updatedAt)}</small></span></Link>)}</div> : <div className="rescue-empty"><strong>No recent activity</strong><span>New intake and care events will appear here.</span></div>}
        </div>
      </section>

      <section className="rescue-card rescue-quick-intake-card">
        <div className="rescue-card-head"><div><span className="rescue-eyebrow">QUICK INTAKE</span><h2>Bring an animal into the system</h2><p>Capture the essentials immediately; the detailed passport can be completed later.</p></div><span className="rescue-intake-tip">Fast entry · full history later</span></div>
        <div className="rescue-form-grid rescue-intake-grid">
          <label>Animal / case name<input value={animal.name} onChange={(event) => setAnimal({ ...animal, name: event.target.value })} /></label>
          <label>Species / common name<input value={animal.speciesCommonName} onChange={(event) => setAnimal({ ...animal, speciesCommonName: event.target.value })} /></label>
          <label>Scientific name<input value={animal.scientificName} onChange={(event) => setAnimal({ ...animal, scientificName: event.target.value })} placeholder="Optional at first intake" /></label>
          <label>Sex<input value={animal.sex} onChange={(event) => setAnimal({ ...animal, sex: event.target.value })} /></label>
          <label>Morph / colour<input value={animal.morphOrColour} onChange={(event) => setAnimal({ ...animal, morphOrColour: event.target.value })} /></label>
          <label>Estimated age<input value={animal.estimatedAge} onChange={(event) => setAnimal({ ...animal, estimatedAge: event.target.value })} /></label>
          <label>Enclosure / location<input value={animal.enclosure} onChange={(event) => setAnimal({ ...animal, enclosure: event.target.value })} placeholder="Rack, vivarium, room or foster location" /></label>
          <label>Status<select value={animal.status} onChange={(event) => setAnimal({ ...animal, status: event.target.value as RescueAnimal["status"] })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Intake date<input type="date" value={animal.intakeDate} onChange={(event) => setAnimal({ ...animal, intakeDate: event.target.value })} /></label>
          <label>Public summary<textarea value={animal.publicSummary} onChange={(event) => setAnimal({ ...animal, publicSummary: event.target.value })} placeholder="Safe information suitable for a public profile later" /></label>
          <label>Private intake notes<textarea value={animal.privateNotes} onChange={(event) => setAnimal({ ...animal, privateNotes: event.target.value })} placeholder="Internal intake details, history and handover notes" /></label>
        </div>
        <div className="rescue-inline-actions"><button type="button" onClick={() => void addAnimal()} disabled={busy}>{busy ? "Saving…" : "Create Animal Record"}</button><Link className="rescue-primary-link" to="/rescue/animals">Open full register</Link></div>
        {message && <div className="rescue-message" role="status">{message}</div>}
      </section>

      <section className="rescue-command-footer"><div><span className="rescue-eyebrow">RESCUE PRINCIPLE</span><strong>The rescue workspace is organisation-first.</strong><p>Staff keep their own TinyTitans identity while the rescue owns the operational records, roles and access policy.</p></div><div className="rescue-footer-links"><Link to="/account/billing">Billing</Link><Link to="/rescue/team">Manage team</Link><Link to="/rescue/reports">Reports</Link></div></section>
    </>}
  </main></PaidTierGate>;
}
