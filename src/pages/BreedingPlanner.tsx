import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/AuthContext";
import { getUserSnakes } from "../services/snakeService";
import { getBreedingProjects, saveBreedingProject } from "../services/breedingService";
import type { Snake } from "../types/Snake";
import type { BreedingProject } from "../types/Breeding";

function makeId() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `breeding-${Date.now()}`; }

export default function BreedingPlanner() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [maleId, setMaleId] = useState("");
  const [femaleId, setFemaleId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    try {
      const [loadedSnakes, loadedProjects] = await Promise.all([getUserSnakes(user.uid), getBreedingProjects(user.uid)]);
      setSnakes(loadedSnakes.filter((snake) => snake?.id));
      setProjects(loadedProjects);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load breeding projects."); }
  }

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [user, loading, profileLoading]);

  const males = useMemo(() => snakes.filter((snake) => snake.sex === "Male"), [snakes]);
  const females = useMemo(() => snakes.filter((snake) => snake.sex === "Female"), [snakes]);

  async function createProject() {
    if (!user) return;
    const male = males.find((snake) => snake.id === maleId);
    const female = females.find((snake) => snake.id === femaleId);
    if (!male || !female) { setMessage("Select one male and one female first."); return; }
    if (male.id === female.id) { setMessage("A project needs two different snakes."); return; }
    setSaving(true); setMessage(""); setError("");
    const project: BreedingProject = { id: makeId(), ownerId: user.uid, name: name.trim() || `${male.name} × ${female.name}`, maleId: male.id, femaleId: female.id, status: "Planned", expectedTraits: [...new Set([...(male.morphs ?? []), ...(female.morphs ?? [])])], notes: notes.trim() || undefined };
    try { await saveBreedingProject(user.uid, project); setProjects((current) => [project, ...current]); setName(""); setNotes(""); setMessage("✅ Breeding project saved to Firebase."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save this breeding project."); }
    finally { setSaving(false); }
  }

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><h2>🧬 Breeding Planner</h2><p>Loading your breeding data…</p></div>;
  if (!user) return <div className="page-container"><BackHomeButton /><h2>🧬 Breeding Planner</h2><p>Sign in to create and manage breeding projects.</p><button type="button" onClick={() => navigate("/login")}>Sign In</button></div>;

  return <div className="page-container">
    <BackHomeButton />
    <h2>🧬 Breeding Planner</h2>
    <p>Create persistent breeding projects using your canonical Snake records.</p>
    {error && <div className="tracker-card" role="alert"><p>⚠️ {error}</p><button type="button" onClick={() => void load()}>Retry</button></div>}
    {message && <div className="tracker-card" role="status"><p>{message}</p></div>}
    <section className="tracker-card"><h3>➕ Start a Breeding Project</h3>
      {!males.length || !females.length ? <><p>You need at least one male and one female Snake.</p><button type="button" onClick={() => navigate("/snakes")}>🐍 Open My Snakes</button></> : <>
        <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Arctic × Lavender 2027" /></label>
        <label>Male<select value={maleId} onChange={(event) => setMaleId(event.target.value)}><option value="">Select male…</option>{males.map((snake) => <option key={snake.id} value={snake.id}>{snake.name} — {(snake.morphs ?? []).join(", ") || "Wild Type"}</option>)}</select></label>
        <label>Female<select value={femaleId} onChange={(event) => setFemaleId(event.target.value)}><option value="">Select female…</option>{females.map((snake) => <option key={snake.id} value={snake.id}>{snake.name} — {(snake.morphs ?? []).join(", ") || "Wild Type"}</option>)}</select></label>
        <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Goals, pairing notes, planned season…" /></label>
        <button type="button" disabled={saving} onClick={() => void createProject()}>{saving ? "💾 Saving…" : "💾 Save Breeding Project"}</button>
      </>}
    </section>
    <section className="tracker-card"><h3>📋 Your Breeding Projects</h3>
      {!projects.length ? <p>No breeding projects yet. Create the first one above.</p> : projects.map((project) => { const male = snakes.find((snake) => snake.id === project.maleId); const female = snakes.find((snake) => snake.id === project.femaleId); return <article key={project.id} className="weight-history-card"><h4>{project.name}</h4><p>🐍 {male?.name ?? "Unknown male"} × {female?.name ?? "Unknown female"}</p><p>Status: <strong>{project.status}</strong></p>{project.expectedTraits?.length ? <p>Potential traits: {project.expectedTraits.join(", ")}</p> : null}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => male && navigate(`/snakes/${male.id}/master-record`)}>View Male</button><button type="button" onClick={() => female && navigate(`/snakes/${female.id}/master-record`)}>View Female</button></div></article>; })}
    </section>
    <section className="tracker-card"><h3>🧬 Genetics</h3><p>The project now has a persistent home. The next stage is attaching canonical genetics outcomes and breeding events without creating a second genetics engine.</p><button type="button" onClick={() => navigate("/calculator")}>Open Genetics Calculator</button></section>
  </div>;
}
