import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getBreedingProjects, saveBreedingProject } from "../services/breedingService";
import type { Snake } from "../types/Snake";
import type { BreedingProject } from "../types/Breeding";
import "./BreedingPlanner.css";

const today = () => new Date().toISOString().slice(0, 10);
const makeId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `breeding-${Date.now()}`;

export default function FreeBreedingPlanner() {
  const { user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [maleId, setMaleId] = useState("");
  const [femaleId, setFemaleId] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [plannedDate, setPlannedDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || loading || profileLoading) return;
    void Promise.all([getUserSnakes(user.uid), getBreedingProjects(user.uid)]).then(([loadedSnakes, loadedProjects]) => {
      setSnakes(loadedSnakes.filter((snake) => snake?.id));
      setProjects(loadedProjects);
    }).catch((err) => setError(err instanceof Error ? err.message : "Unable to load your breeding planner."));
  }, [user, loading, profileLoading]);

  const males = useMemo(() => snakes.filter((snake) => snake.sex === "Male"), [snakes]);
  const females = useMemo(() => snakes.filter((snake) => snake.sex === "Female"), [snakes]);
  const selectedMale = males.find((snake) => snake.id === maleId);
  const selectedFemale = females.find((snake) => snake.id === femaleId);

  async function createProject() {
    if (!user) return;
    if (!selectedMale || !selectedFemale) {
      setError("Select one male and one female first.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const project: BreedingProject = {
        id: makeId(),
        ownerId: user.uid,
        name: name.trim() || `${selectedMale.name} × ${selectedFemale.name}`,
        maleId: selectedMale.id,
        femaleId: selectedFemale.id,
        status: "Planned",
        expectedTraits: [...new Set([...(selectedMale.morphs ?? []), ...(selectedFemale.morphs ?? [])])],
        goal: goal.trim() || undefined,
        notes: [plannedDate ? `Planned start: ${plannedDate}` : "", notes.trim()].filter(Boolean).join("\n") || undefined,
      };
      await saveBreedingProject(user.uid, project);
      setProjects((current) => [project, ...current]);
      setMaleId("");
      setFemaleId("");
      setName("");
      setGoal("");
      setNotes("");
      setPlannedDate(today());
      setMessage("✅ Breeding project saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the breeding project.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || profileLoading) return <main className="page-container breeding-page"><BackHomeButton /><h1>🥚 Breeding Planner</h1><p>Loading your breeding records…</p></main>;
  if (!user) return <main className="page-container breeding-page"><BackHomeButton /><h1>🥚 Breeding Planner</h1><p>Sign in to create breeding plans.</p><button type="button" onClick={() => navigate("/login")}>Sign In</button></main>;

  return <main className="page-container breeding-page">
    <BackHomeButton />
    <header className="breeding-hero">
      <div><p className="breeding-eyebrow">Tiny Titans · Everyday Breeding</p><h1>🥚 Breeding Planner</h1><p>Plan a pairing, keep a simple record and come back to it later. Your breeding records are yours to keep; deeper genetics and breeding intelligence can sit on top of the same project.</p></div>
      <div className="breeding-callout"><strong>Free Keeper</strong><div>Core planning and record keeping included</div></div>
    </header>
    {error && <div className="breeding-card" role="alert">⚠️ {error}</div>}
    {message && <div className="breeding-card" role="status">{message}</div>}
    <div className="breeding-grid">
      <section className="breeding-card">
        <h2>Create a breeding plan</h2>
        <p className="breeding-muted">Choose animals from your existing Tiny Titans records. This basic planner does not make genetic claims.</p>
        <div className="breeding-form">
          <label>Male<select value={maleId} onChange={(event) => setMaleId(event.target.value)}><option value="">Select a male…</option>{males.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>
          <label>Female<select value={femaleId} onChange={(event) => setFemaleId(event.target.value)}><option value="">Select a female…</option>{females.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>
          <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. 2027 Arctic project" /></label>
          <label>Breeding goal<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What are you hoping to work towards?" /></label>
          <label>Planned date<input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></label>
          <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you want to remember about this pairing…" /></label>
          <button type="button" onClick={() => void createProject()} disabled={busy}>{busy ? "Saving…" : "Save breeding plan"}</button>
        </div>
      </section>
      <section className="breeding-card">
        <h2>Your projects</h2>
        {!projects.length ? <p className="breeding-muted">No breeding projects yet.</p> : <div className="breeding-stack">{projects.slice(0, 12).map((project) => { const male = snakes.find((snake) => snake.id === project.maleId); const female = snakes.find((snake) => snake.id === project.femaleId); return <article className="breeding-mini" key={project.id}><strong>{project.name}</strong><span>{male?.name || "Unknown male"} × {female?.name || "Unknown female"}</span><small>{project.goal || "No goal recorded"}</small><span className="breeding-badge">{project.status}</span></article>; })}</div>}
      </section>
    </div>
    <section className="breeding-card"><h2>What paid tiers add</h2><p>The same core project can later gain deeper genetics forecasting, readiness intelligence, breeding-cycle tracking, production records, richer analytics and next-generation planning without taking the basic planner away from Free Keepers.</p></section>
  </main>;
}
