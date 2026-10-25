import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import BreedingProjectManagement from "../components/BreedingProjectManagement";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansFeedback from "../components/TinyTitansFeedback";
import TinyTitansEmptyState from "../components/TinyTitansEmptyState";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getBreedingPairings, getBreedingProjects, saveBreedingPairing, saveBreedingProject } from "../services/breedingService";
import type { Snake } from "../types/Snake";
import type { BreedingPairing, BreedingProject, BreedingStatus } from "../types/Breeding";
import "./BreedingPlanner.css";

const today = () => new Date().toISOString().slice(0, 10);
const makeId = (prefix: string) => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}`;
const statuses: BreedingStatus[] = ["Planned", "Paired", "Locked", "Gravid", "Laid", "Complete", "Failed"];

export default function BasicBreedingPlanner() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [pairings, setPairings] = useState<BreedingPairing[]>([]);
  const [maleId, setMaleId] = useState("");
  const [femaleId, setFemaleId] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [targetTraits, setTargetTraits] = useState("");
  const [status, setStatus] = useState<BreedingStatus>("Planned");
  const [pairingDate, setPairingDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    void Promise.all([getUserSnakes(user.uid), getBreedingProjects(user.uid)])
      .then(([loadedSnakes, loadedProjects]) => {
        setSnakes(loadedSnakes.filter((snake) => snake?.id));
        setProjects(loadedProjects);
        if (loadedSnakes.some((snake) => snake.sex === "Male")) setMaleId((current) => current || loadedSnakes.find((snake) => snake.sex === "Male")?.id || "");
        if (loadedSnakes.some((snake) => snake.sex === "Female")) setFemaleId((current) => current || loadedSnakes.find((snake) => snake.sex === "Female")?.id || "");
        if (loadedProjects[0]?.id) setSelectedProjectId((current) => current || loadedProjects[0].id);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load breeding records."));
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (!user || !selectedProjectId) {
      setPairings([]);
      return;
    }
    void getBreedingPairings(user.uid, selectedProjectId)
      .then(setPairings)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load pairing records."));
  }, [user, selectedProjectId]);

  const males = useMemo(() => snakes.filter((snake) => snake.sex === "Male"), [snakes]);
  const females = useMemo(() => snakes.filter((snake) => snake.sex === "Female"), [snakes]);
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedMale = selectedProject ? snakes.find((snake) => snake.id === selectedProject.maleId) : undefined;
  const selectedFemale = selectedProject ? snakes.find((snake) => snake.id === selectedProject.femaleId) : undefined;
  const latestPairing = pairings[0];

  async function createProject() {
    if (!user) return;
    const male = males.find((snake) => snake.id === maleId);
    const female = females.find((snake) => snake.id === femaleId);
    if (!male || !female) {
      setError("Select one male and one female from your animals first.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const project: BreedingProject = {
      id: makeId("breeding"), ownerId: user.uid, name: name.trim() || `${male.name} × ${female.name}`,
      maleId: male.id, femaleId: female.id, status, goal: goal.trim() || undefined,
      targetTraits: targetTraits.split(",").map((item) => item.trim()).filter(Boolean),
      priority: "Normal", notes: notes.trim() || undefined,
    };
    try {
      await saveBreedingProject(user.uid, project);
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
      setName(""); setGoal(""); setTargetTraits(""); setNotes("");
      setMessage("Breeding plan saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this breeding plan.");
    } finally {
      setSaving(false);
    }
  }

  async function recordPairing() {
    if (!user || !selectedProject) {
      setError("Create or select a breeding plan first.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const pairing: BreedingPairing = {
      id: makeId("pairing"), projectId: selectedProject.id, maleId: selectedProject.maleId,
      femaleId: selectedProject.femaleId, pairingDate, status: "Paired", notes: notes.trim() || undefined,
    };
    try {
      await saveBreedingPairing(user.uid, selectedProject.id, pairing);
      const updatedProject: BreedingProject = { ...selectedProject, status: "Paired" };
      await saveBreedingProject(user.uid, updatedProject);
      setPairings((current) => [pairing, ...current]);
      setProjects((current) => current.map((project) => project.id === updatedProject.id ? updatedProject : project));
      setNotes("");
      setMessage("Pairing recorded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record this pairing.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(nextStatus: BreedingStatus) {
    if (!user || !selectedProject) return;
    setSaving(true);
    setError("");
    try {
      const updatedProject = { ...selectedProject, status: nextStatus };
      await saveBreedingProject(user.uid, updatedProject);
      setProjects((current) => current.map((project) => project.id === updatedProject.id ? updatedProject : project));
      setMessage(`Status updated to ${nextStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the breeding plan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><h2><TinyTitansIcon name="breeding" size={25} /> Breeding Planner</h2><p>Loading your breeding records…</p></div>;
  if (!user) return <div className="page-container"><BackHomeButton /><h2><TinyTitansIcon name="breeding" size={25} /> Breeding Planner</h2><p>Sign in to manage breeding plans.</p></div>;

  return (
    <main className="page-container breeding-page">
      <BackHomeButton />
      <BreedingProjectManagement />
      <header className="breeding-hero">
        <div>
          <p className="breeding-eyebrow">Tiny Titans · Everyday Breeding</p>
          <h1><TinyTitansIcon name="breeding" size={28} /> Breeding Planner</h1>
          <p>Plan a pairing, record what actually happened and keep the breeding history attached to your animals.</p>
        </div>
        <div className="breeding-callout"><strong>Free Keeper</strong><div>Core breeding planning is available without a paid tier.</div></div>
      </header>

      {error && <TinyTitansFeedback kind="error">{error}</TinyTitansFeedback>}
      {message && <TinyTitansFeedback kind="success">{message}</TinyTitansFeedback>}

      <div className="breeding-grid">
        <section className="breeding-card">
          <h2>1. Create a plan</h2>
          <p className="breeding-muted">Keep it simple: who, why and what you are aiming to do.</p>
          <div className="breeding-form">
            <label>Male<select value={maleId} onChange={(event) => setMaleId(event.target.value)}><option value="">Select male…</option>{males.map((snake) => <option key={snake.id} value={snake.id}>{snake.name || "Unnamed"}</option>)}</select></label>
            <label>Female<select value={femaleId} onChange={(event) => setFemaleId(event.target.value)}><option value="">Select female…</option>{females.map((snake) => <option key={snake.id} value={snake.id}>{snake.name || "Unnamed"}</option>)}</select></label>
            <label>Plan name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. 2026 Arctic project" /></label>
            <label>Goal<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="e.g. Continue this line / target a trait" /></label>
            <label>Target traits<input value={targetTraits} onChange={(event) => setTargetTraits(event.target.value)} placeholder="Optional · comma separated" /></label>
            <label>Starting status<select value={status} onChange={(event) => setStatus(event.target.value as BreedingStatus)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything useful to remember about the plan…" /></label>
            <button type="button" disabled={saving} onClick={() => void createProject()}>{saving ? "Saving…" : "Save breeding plan"}</button>
          </div>
        </section>

        <section className="breeding-card">
          <h2>2. Your plans</h2>
          {!projects.length ? <TinyTitansEmptyState compact icon="breeding" title="No breeding plans yet" description="Create your first pairing plan from the animals and goals on this page." /> : <div>{projects.map((project) => { const male = snakes.find((snake) => snake.id === project.maleId); const female = snakes.find((snake) => snake.id === project.femaleId); return <button key={project.id} type="button" className={`breeding-project${project.id === selectedProjectId ? " is-active" : ""}`} onClick={() => setSelectedProjectId(project.id)}><strong>{project.name}</strong><small>{male?.name || "Male"} × {female?.name || "Female"} · {project.status}</small><small>{project.goal || "No goal recorded"}</small></button>; })}</div>}
          {selectedProject && <div className="breeding-callout"><strong>{selectedMale?.name || "Male"} × {selectedFemale?.name || "Female"}</strong><p>{selectedProject.goal || "No goal recorded."}</p><div className="breeding-actions">{statuses.map((nextStatus) => <button key={nextStatus} type="button" disabled={saving || selectedProject.status === nextStatus} onClick={() => void updateStatus(nextStatus)}>{nextStatus}</button>)}</div></div>}
        </section>
      </div>

      {selectedProject && <section className="breeding-card">
        <div className="breeding-project-header"><div><p className="breeding-eyebrow">OFFSPRING INTELLIGENCE</p><h2>Explore possible offspring</h2></div></div>
        <p className="breeding-muted">Review documented morph combinations, carrier states and outcome probabilities. Undocumented parental genetics remain unknown rather than being treated as normal.</p>
        <div className="breeding-actions"><button type="button" onClick={() => navigate("/calculator?male=" + encodeURIComponent(selectedProject.maleId) + "&female=" + encodeURIComponent(selectedProject.femaleId))}>View offspring and named combos</button></div>
      </section>}

      {selectedProject && <section className="breeding-card">
        <div className="breeding-project-header"><div><p className="breeding-eyebrow">PAIRING LOG</p><h2>Record an actual pairing</h2></div><span className="breeding-badge">{pairings.length} recorded</span></div>
        <p className="breeding-muted">This is a record of an observed pairing, not a promise of successful reproduction.</p>
        <div className="breeding-grid-wide">
          <label>Date<input type="date" value={pairingDate} onChange={(event) => setPairingDate(event.target.value)} /></label>
          <label>Optional note<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observed behaviour / context" /></label>
          <div className="breeding-actions"><button type="button" disabled={saving} onClick={() => void recordPairing()}>{saving ? "Saving…" : "Record pairing"}</button><button type="button" onClick={() => navigate("/breeding/cycle")}>Advanced cycle tools</button></div>
        </div>
        {latestPairing && <div className="breeding-mini"><strong>{latestPairing.pairingDate}</strong><span>Latest pairing · {latestPairing.notes || "No note recorded."}</span></div>}
      </section>}

      <section className="breeding-card">
        <div className="breeding-project-header"><div><p className="breeding-eyebrow">PAID EXPANSION</p><h2>More depth when you need it</h2></div><span className="breeding-badge">Paid tiers</span></div>
        <div className="breeding-grid-wide">
          <div className="breeding-mini"><strong>Cycle intelligence</strong><span>Detailed phase tracking, observations, uncertainty and environmental records.</span></div>
          <div className="breeding-mini"><strong>Readiness & analysis</strong><span>Deeper breeding-readiness views and longitudinal analysis.</span></div>
          <div className="breeding-mini"><strong>Production tools</strong><span>Expanded clutch, egg, incubation and production workflows.</span></div>
        </div>
        <div className="breeding-actions"><button type="button" onClick={() => navigate("/breeding/cycle")}>Cycle Manager</button><button type="button" onClick={() => navigate("/breeding/readiness")}>Readiness</button><button type="button" onClick={() => navigate("/breeding/production")}>Production</button></div>
      </section>
    </main>
  );
}
