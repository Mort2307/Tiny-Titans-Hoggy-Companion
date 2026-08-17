import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, saveUserSnake } from "../services/snakeService";
import { getBreedingProjects, getBreedingPairings, getEggClutches, getHatchlings, saveBreedingProject, saveBreedingPairing, saveEggClutch, saveHatchling } from "../services/breedingService";
import type { Snake } from "../types/Snake";
import type { BreedingProject, BreedingPairing, EggClutch, HatchlingRecord } from "../types/Breeding";
import { createBreedingGeneticsSnapshot, type BreedingGeneticsSnapshot } from "../utils/breedingGenetics";
import { migrateSnake } from "../utils/snakeMigration";

function makeId(prefix: string) { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}`; }

export default function BreedingPlanner() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [pairings, setPairings] = useState<BreedingPairing[]>([]);
  const [clutches, setClutches] = useState<EggClutch[]>([]);
  const [hatchlings, setHatchlings] = useState<HatchlingRecord[]>([]);
  const [maleId, setMaleId] = useState("");
  const [femaleId, setFemaleId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [pairingDate, setPairingDate] = useState(new Date().toISOString().slice(0, 10));
  const [clutchDate, setClutchDate] = useState(new Date().toISOString().slice(0, 10));
  const [eggCount, setEggCount] = useState(1);
  const [hatchDate, setHatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [hatchlingName, setHatchlingName] = useState("");
  const [hatchlingSex, setHatchlingSex] = useState<HatchlingRecord["sex"]>("Unknown");
  const [hatchlingMorph, setHatchlingMorph] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    try {
      const [loadedSnakes, loadedProjects] = await Promise.all([getUserSnakes(user.uid), getBreedingProjects(user.uid)]);
      setSnakes(loadedSnakes.filter((snake) => snake?.id));
      setProjects(loadedProjects);
      if (!selectedProjectId && loadedProjects[0]?.id) setSelectedProjectId(loadedProjects[0].id);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load breeding projects."); }
  }

  async function loadProjectData(projectId: string) {
    if (!user || !projectId) return;
    try {
      const [loadedPairings, loadedClutches, loadedHatchlings] = await Promise.all([getBreedingPairings(user.uid, projectId), getEggClutches(user.uid, projectId), getHatchlings(user.uid, projectId)]);
      setPairings(loadedPairings); setClutches(loadedClutches); setHatchlings(loadedHatchlings);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load this breeding project."); }
  }

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [user, loading, profileLoading]);
  useEffect(() => { if (selectedProjectId) void loadProjectData(selectedProjectId); }, [selectedProjectId, user]);

  const males = useMemo(() => snakes.filter((snake) => snake.sex === "Male"), [snakes]);
  const females = useMemo(() => snakes.filter((snake) => snake.sex === "Female"), [snakes]);
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedMale = selectedProject ? snakes.find((snake) => snake.id === selectedProject.maleId) : undefined;
  const selectedFemale = selectedProject ? snakes.find((snake) => snake.id === selectedProject.femaleId) : undefined;
  const geneticsSnapshot = useMemo<BreedingGeneticsSnapshot | null>(() => {
    if (!selectedMale || !selectedFemale) return null;
    try { return createBreedingGeneticsSnapshot(selectedFemale, selectedMale); }
    catch { return null; }
  }, [selectedMale, selectedFemale]);

  async function createProject() {
    if (!user) return;
    const male = males.find((snake) => snake.id === maleId); const female = females.find((snake) => snake.id === femaleId);
    if (!male || !female) { setMessage("Select one male and one female first."); return; }
    setSaving(true); setMessage(""); setError("");
    let expectedGenetics: BreedingGeneticsSnapshot | undefined;
    try { expectedGenetics = createBreedingGeneticsSnapshot(female, male); }
    catch { setError("The selected parents could not be resolved by the canonical genetics engine."); setSaving(false); return; }
    const project: BreedingProject = { id: makeId("breeding"), ownerId: user.uid, name: name.trim() || `${male.name} × ${female.name}`, maleId: male.id, femaleId: female.id, status: "Planned", expectedTraits: [...new Set([...(male.morphs ?? []), ...(female.morphs ?? [])])], expectedGenetics, notes: notes.trim() || undefined };
    try { await saveBreedingProject(user.uid, project); setProjects((current) => [project, ...current]); setSelectedProjectId(project.id); setName(""); setNotes(""); setMessage("✅ Breeding project saved with the canonical genetics calculation."); } catch (err) { setError(err instanceof Error ? err.message : "Unable to save this breeding project."); } finally { setSaving(false); }
  }

  async function addPairing() {
    if (!user || !selectedProject) return; setSaving(true); setError("");
    const pairing: BreedingPairing = { id: makeId("pairing"), projectId: selectedProject.id, maleId: selectedProject.maleId, femaleId: selectedProject.femaleId, pairingDate, status: "Paired", notes: notes.trim() || undefined, expectedTraits: selectedProject.expectedTraits, expectedGenetics: geneticsSnapshot ?? selectedProject.expectedGenetics };
    try { await saveBreedingPairing(user.uid, selectedProject.id, pairing); setPairings((current) => [pairing, ...current]); setMessage("✅ Pairing event saved with the canonical genetics snapshot."); setNotes(""); } catch (err) { setError(err instanceof Error ? err.message : "Unable to save pairing event."); } finally { setSaving(false); }
  }

  async function addClutch() {
    if (!user || !selectedProject || !pairings[0]) { setMessage("Record a pairing before adding a clutch."); return; } setSaving(true); setError("");
    const clutch: EggClutch = { id: makeId("clutch"), projectId: selectedProject.id, pairingId: pairings[0].id, laidDate: clutchDate, eggCount: Math.max(1, eggCount), notes: notes.trim() || undefined };
    try { await saveEggClutch(user.uid, selectedProject.id, clutch); setClutches((current) => [clutch, ...current]); setMessage("🥚 Clutch saved. You can now record hatchlings."); setNotes(""); } catch (err) { setError(err instanceof Error ? err.message : "Unable to save clutch."); } finally { setSaving(false); }
  }

  async function addHatchling() {
    if (!user || !selectedProject || !clutches[0]) { setMessage("Record a clutch before adding hatchlings."); return; } setSaving(true); setError("");
    const hatchling: HatchlingRecord = { id: makeId("hatchling"), projectId: selectedProject.id, clutchId: clutches[0].id, hatchDate, name: hatchlingName.trim() || undefined, sex: hatchlingSex, morph: hatchlingMorph.trim() || undefined };
    try { await saveHatchling(user.uid, selectedProject.id, hatchling); setHatchlings((current) => [hatchling, ...current]); setHatchlingName(""); setHatchlingMorph(""); setMessage("🐣 Hatchling saved. Next step: create its canonical Snake profile."); } catch (err) { setError(err instanceof Error ? err.message : "Unable to save hatchling."); } finally { setSaving(false); }
  }

  async function createSnakeFromHatchling(hatchling: HatchlingRecord) {
    if (!user || !selectedProject) return;
    if (hatchling.snakeId) {
      navigate(`/snakes/${hatchling.snakeId}`);
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const morphs = hatchling.morphId ? [hatchling.morphId] : [];
      const customMorph = !hatchling.morphId ? (hatchling.morph ?? "") : "";
      const customHets = hatchling.hets?.join(", ") ?? "";
      const weight = hatchling.weightAtHatch ?? null;

      const draft = migrateSnake({
        name: hatchling.name ?? "",
        species: "Western Hognose",
        photo: "",
        sex: hatchling.sex,
        morphs,
        customMorph,
        hets: [],
        customHets,
        startingWeight: weight,
        startingWeightDate: weight !== null ? hatchling.hatchDate : "",
        weight,
        lastWeighedDate: weight !== null ? hatchling.hatchDate : "",
        weightHistory: [],
        weightTracking: { enabled: true, frequency: "Monthly" },
        hatchDate: hatchling.hatchDate,
        arrivalDate: hatchling.hatchDate,
        notes: `Created from breeding project "${selectedProject.name}". Hatchling record: ${hatchling.id}.${customHets ? ` Genetics entered on hatchling record: ${customHets}` : ""}`,
      });

      delete (draft as Partial<Snake>).id;

      const savedSnake = await saveUserSnake(user.uid, draft as Snake);
      if (!savedSnake.id) throw new Error("The Snake was saved but no canonical Snake ID was returned.");

      const linkedHatchling: HatchlingRecord = {
        ...hatchling,
        snakeId: savedSnake.id,
      };
      await saveHatchling(user.uid, selectedProject.id, linkedHatchling);

      setHatchlings((current) => current.map((item) => item.id === hatchling.id ? linkedHatchling : item));
      setMessage(`🐍 ${savedSnake.name || "Snake"} created successfully. The hatchling is now linked to its canonical Snake record.`);
      navigate(`/snakes/${savedSnake.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the Snake profile from this hatchling.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><h2>🧬 Breeding Planner</h2><p>Loading your breeding data…</p></div>;
  if (!user) return <div className="page-container"><BackHomeButton /><h2>🧬 Breeding Planner</h2><p>Sign in to create and manage breeding projects.</p><button type="button" onClick={() => navigate("/login")}>Sign In</button></div>;

  return <div className="page-container"><BackHomeButton /><h2>🧬 Breeding Planner</h2><p>One persistent breeding journey from pairing to hatchlings.</p>
    {error && <div className="tracker-card" role="alert"><p>⚠️ {error}</p><button type="button" onClick={() => void load()}>Retry</button></div>}
    {message && <div className="tracker-card" role="status"><p>{message}</p></div>}
    <section className="tracker-card"><h3>➕ Start a Breeding Project</h3>{!males.length || !females.length ? <><p>You need at least one male and one female Snake.</p><button type="button" onClick={() => navigate("/snakes")}>🐍 Open My Snakes</button></> : <><label>Project name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Arctic × Lavender 2027" /></label><label>Male<select value={maleId} onChange={(event) => setMaleId(event.target.value)}><option value="">Select male…</option>{males.map((snake) => <option key={snake.id} value={snake.id}>{snake.name} — {(snake.morphs ?? []).join(", ") || "Wild Type"}</option>)}</select></label><label>Female<select value={femaleId} onChange={(event) => setFemaleId(event.target.value)}><option value="">Select female…</option>{females.map((snake) => <option key={snake.id} value={snake.id}>{snake.name} — {(snake.morphs ?? []).join(", ") || "Wild Type"}</option>)}</select></label><label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Goals, pairing notes, planned season…" /></label><button type="button" disabled={saving} onClick={() => void createProject()}>{saving ? "💾 Saving…" : "💾 Save Breeding Project"}</button></>}</section>
    <section className="tracker-card"><h3>📋 Projects</h3>{!projects.length ? <p>No breeding projects yet. Create the first one above.</p> : projects.map((project) => { const male = snakes.find((snake) => snake.id === project.maleId); const female = snakes.find((snake) => snake.id === project.femaleId); return <article key={project.id} className="weight-history-card"><h4>{project.name}</h4><p>🐍 {male?.name ?? "Unknown male"} × {female?.name ?? "Unknown female"}</p><p>Status: <strong>{project.status}</strong></p><button type="button" onClick={() => setSelectedProjectId(project.id)}>{selectedProjectId === project.id ? "✓ Project Open" : "Open Project"}</button></article>; })}</section>
    {selectedProject && <>
      <section className="tracker-card"><h3>🔗 {selectedProject.name} — Pairing</h3><p>Parents are locked to the canonical Snake records.</p>{geneticsSnapshot ? <div className="weight-history-card"><h4>🧬 Expected Genetics</h4><p>Calculated by the canonical genetics engine on {new Date(geneticsSnapshot.calculatedAt).toLocaleString()}.</p>{geneticsSnapshot.outcomes.map((outcome, index) => <p key={`${index}-${outcome.probability}`}>• {outcome.visualMorphs.length ? outcome.visualMorphs.join(" + ") : "Wild Type"}{outcome.hets.length ? ` — ${outcome.hets.join(", ")}` : ""} · <strong>{outcome.probability}%</strong></p>)}</div> : <p>Expected genetics will appear once both canonical parent records are available.</p>}<label>Pairing date<input type="date" value={pairingDate} onChange={(event) => setPairingDate(event.target.value)} /></label><button type="button" disabled={saving} onClick={() => void addPairing()}>{saving ? "Saving…" : "🤝 Record Pairing"}</button><button type="button" onClick={() => navigate(`/calculator?male=${selectedProject.maleId}&female=${selectedProject.femaleId}`)}>🧬 Open Genetics Calculator</button>{pairings.map((pairing) => <p key={pairing.id}>✓ {pairing.pairingDate} — {pairing.status}</p>)}</section>
      <section className="tracker-card"><h3>🥚 Clutch</h3><label>Laid date<input type="date" value={clutchDate} onChange={(event) => setClutchDate(event.target.value)} /></label><label>Egg count<input type="number" min={1} value={eggCount} onChange={(event) => setEggCount(Number(event.target.value) || 1)} /></label><button type="button" disabled={saving} onClick={() => void addClutch()}>{saving ? "Saving…" : "🥚 Record Clutch"}</button>{clutches.map((clutch) => <p key={clutch.id}>✓ {clutch.laidDate} — {clutch.eggCount} egg{clutch.eggCount === 1 ? "" : "s"}</p>)}</section>
      <section className="tracker-card"><h3>🐣 Hatchlings</h3><label>Hatch date<input type="date" value={hatchDate} onChange={(event) => setHatchDate(event.target.value)} /></label><label>Name<input value={hatchlingName} onChange={(event) => setHatchlingName(event.target.value)} placeholder="Optional hatchling name" /></label><label>Sex<select value={hatchlingSex} onChange={(event) => setHatchlingSex(event.target.value as HatchlingRecord["sex"])}><option>Unknown</option><option>Male</option><option>Female</option></select></label><label>Morph / phenotype<input value={hatchlingMorph} onChange={(event) => setHatchlingMorph(event.target.value)} placeholder="Only record what is actually known" /></label><button type="button" disabled={saving} onClick={() => void addHatchling()}>{saving ? "Saving…" : "🐣 Record Hatchling"}</button>{hatchlings.map((hatchling) => <article key={hatchling.id} className="weight-history-card"><strong>{hatchling.name || "Unnamed hatchling"}</strong><p>{hatchling.hatchDate} · {hatchling.sex} · {hatchling.morph || "Phenotype not recorded"}</p>{hatchling.snakeId ? <button type="button" onClick={() => navigate(`/snakes/${hatchling.snakeId}`)}>🐍 View Snake Profile</button> : <button type="button" disabled={saving} onClick={() => void createSnakeFromHatchling(hatchling)}>🐍 Create Snake Profile</button>}</article>)}</section>
    </>}
  </div>;
}