import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import PaidTierGate from "../components/PaidTierGate";
import { useAuth } from "../context/useAuth";
import { createRescueAnimal, createRescueOrganisation, getOwnedRescueOrganisation, listRescueAnimals } from "../services/rescueService";
import type { RescueAnimal, RescueOrganisation } from "../types/rescue";
import "../styles/rescue.css";

export default function RescueCentre() {
  const { user } = useAuth();
  const [org, setOrg] = useState<RescueOrganisation | null>(null);
  const [animals, setAnimals] = useState<RescueAnimal[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [animal, setAnimal] = useState({
    name: "", speciesCommonName: "", scientificName: "", sex: "Unknown", morphOrColour: "", estimatedAge: "",
    status: "in_care" as RescueAnimal["status"], enclosure: "", intakeDate: new Date().toISOString().slice(0,10),
    publicPreview: true, publicSummary: "", husbandrySummary: "", privateNotes: "",
  });

  async function refresh(uid: string) {
    const current = await getOwnedRescueOrganisation(uid);
    setOrg(current);
    if (current) setAnimals(await listRescueAnimals(current.id));
  }
  useEffect(() => { if (user) void refresh(user.uid).catch((error) => setMessage(error instanceof Error ? error.message : "Rescue workspace unavailable.")); }, [user]);

  async function setup() {
    if (!user) return;
    setBusy(true);
    try { setOrg(await createRescueOrganisation(user.uid, name)); setName(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not create workspace."); }
    finally { setBusy(false); }
  }

  async function addAnimal() {
    if (!user || !org) return;
    if (!animal.name.trim() || !animal.speciesCommonName.trim()) { setMessage("Animal name and species are required."); return; }
    setBusy(true);
    try {
      await createRescueAnimal({ ...animal, organisationId: org.id }, user.uid);
      setAnimals(await listRescueAnimals(org.id));
      setAnimal((current) => ({ ...current, name: "", speciesCommonName: "", scientificName: "", publicSummary: "", privateNotes: "" }));
      setMessage("Animal record created.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save animal."); }
    finally { setBusy(false); }
  }

  const counts = useMemo(() => animals.reduce((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result; }, {} as Record<string, number>), [animals]);

  return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page">
    <header className="rescue-hero"><div><span className="rescue-eyebrow">TINY TITANS · RESCUE OPERATIONS</span><h1><TinyTitansIcon name="health" size={34} /> Rescue Centre</h1><p>Species-agnostic animal management, QR identity and full-history passports.</p></div><Link className="rescue-primary-link" to="/rescue/species-incubator"><TinyTitansIcon name="observatory" size={22} /> Species Incubator</Link></header>
    {!org ? <section className="rescue-card"><span className="rescue-eyebrow">START HERE</span><h2>Create a rescue workspace</h2><p>Log any species immediately. Unsupported species can be marked for identification and verification.</p><div className="rescue-inline"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rescue Centre name" /><button type="button" onClick={() => void setup()} disabled={busy}>{busy ? "Creating…" : "Create Workspace"}</button></div></section> :
    <>
      <section className="rescue-stat-grid">{[["Animals", animals.length], ["Quarantine", counts.quarantine || 0], ["Observation", counts.under_observation || 0], ["Public profiles", animals.filter((item) => item.publicPreview).length]].map(([label, value]) => <Link className="rescue-stat-card" to="/rescue/animals" key={String(label)}><TinyTitansIcon name="reptile" size={27} /><strong>{String(value)}</strong><span>{String(label)}</span></Link>)}</section>
      <section className="rescue-card"><span className="rescue-eyebrow">WORKSPACES</span><h2>Rescue operations</h2><div className="rescue-tile-grid">
        <Link to="/rescue/animals"><TinyTitansIcon name="reptile" size={25} /><strong>Animal register</strong><small>Search and open every animal passport.</small></Link>
        <Link to="/rescue/scan"><TinyTitansIcon name="observatory" size={25} /><strong>QR scanner</strong><small>Resolve a label to a read-only passport.</small></Link>
        <Link to="/rescue/species-incubator"><TinyTitansIcon name="genetics" size={25} /><strong>Species Incubator</strong><small>Build evidence-backed species candidates.</small></Link>
        <Link to="/rescue/team"><TinyTitansIcon name="community" size={25} /><strong>Team & permissions</strong><small>Separate membership from edit authority.</small></Link>
        <Link to="/rescue/reports"><TinyTitansIcon name="weight" size={25} /><strong>Rescue reports</strong><small>Operational totals and record completeness.</small></Link>
        <Link to="/rescue/adoption"><TinyTitansIcon name="wall" size={25} /><strong>Adoption profiles</strong><small>Prepare safe public-facing previews.</small></Link>
      </div></section>
      <section className="rescue-card"><span className="rescue-eyebrow">QUICK INTAKE</span><h2>Add an animal</h2><div className="rescue-form-grid">
        <label>Animal name<input value={animal.name} onChange={(event) => setAnimal({ ...animal, name: event.target.value })} /></label>
        <label>Species / common name<input value={animal.speciesCommonName} onChange={(event) => setAnimal({ ...animal, speciesCommonName: event.target.value })} /></label>
        <label>Scientific name<input value={animal.scientificName} onChange={(event) => setAnimal({ ...animal, scientificName: event.target.value })} /></label>
        <label>Sex<input value={animal.sex} onChange={(event) => setAnimal({ ...animal, sex: event.target.value })} /></label>
        <label>Morph / colour<input value={animal.morphOrColour} onChange={(event) => setAnimal({ ...animal, morphOrColour: event.target.value })} /></label>
        <label>Estimated age<input value={animal.estimatedAge} onChange={(event) => setAnimal({ ...animal, estimatedAge: event.target.value })} /></label>
        <label>Enclosure<input value={animal.enclosure} onChange={(event) => setAnimal({ ...animal, enclosure: event.target.value })} /></label>
        <label>Status<select value={animal.status} onChange={(event) => setAnimal({ ...animal, status: event.target.value as RescueAnimal["status"] })}>{["in_care","quarantine","under_observation","adopted","transferred","deceased"].map((status) => <option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}</select></label>
        <label>Intake date<input type="date" value={animal.intakeDate} onChange={(event) => setAnimal({ ...animal, intakeDate: event.target.value })} /></label>
        <label>Public summary<textarea value={animal.publicSummary} onChange={(event) => setAnimal({ ...animal, publicSummary: event.target.value })} /></label>
        <label>Private intake notes<textarea value={animal.privateNotes} onChange={(event) => setAnimal({ ...animal, privateNotes: event.target.value })} /></label>
      </div><button type="button" onClick={() => void addAnimal()} disabled={busy}>{busy ? "Saving…" : "Create Animal Record"}</button>{message && <div className="rescue-message" role="status">{message}</div>}</section>
    </>
    }
  </main></PaidTierGate>;
}
