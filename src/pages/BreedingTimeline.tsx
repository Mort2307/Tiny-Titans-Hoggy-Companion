import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getBreedingProjects, getBreedingPairings, getEggClutches, getHatchlings } from "../services/breedingService";
import type { Snake } from "../types/Snake";
import type { BreedingProject, BreedingPairing, EggClutch, HatchlingRecord } from "../types/Breeding";
import "./BreedingTimeline.css";

const dateValue = (value?: string) => value ? new Date(`${value}T12:00:00`).getTime() : 0;

type TimelineEvent = { id: string; date: string; title: string; detail: string; tone: "planned" | "pairing" | "clutch" | "hatch"; };

export default function BreedingTimeline() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [pairings, setPairings] = useState<BreedingPairing[]>([]);
  const [clutches, setClutches] = useState<EggClutch[]>([]);
  const [hatchlings, setHatchlings] = useState<HatchlingRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    void Promise.all([getUserSnakes(user.uid), getBreedingProjects(user.uid)])
      .then(([loadedSnakes, loadedProjects]) => {
        setSnakes(loadedSnakes.filter((snake) => snake?.id));
        setProjects(loadedProjects);
        setProjectId((current) => current || loadedProjects[0]?.id || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load breeding projects."));
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (!user || !projectId) return;
    void Promise.all([
      getBreedingPairings(user.uid, projectId),
      getEggClutches(user.uid, projectId),
      getHatchlings(user.uid, projectId),
    ]).then(([loadedPairings, loadedClutches, loadedHatchlings]) => {
      setPairings(loadedPairings);
      setClutches(loadedClutches);
      setHatchlings(loadedHatchlings);
      setError("");
    }).catch((err) => setError(err instanceof Error ? err.message : "Unable to load this breeding timeline."));
  }, [user, projectId]);

  const project = projects.find((item) => item.id === projectId);
  const male = snakes.find((snake) => snake.id === project?.maleId);
  const female = snakes.find((snake) => snake.id === project?.femaleId);

  const events = useMemo<TimelineEvent[]>(() => {
    if (!project) return [];
    const result: TimelineEvent[] = [];
    result.push({ id: `project-${project.id}`, date: String(project.createdAt ?? "").slice(0, 10), title: "Breeding project created", detail: `${male?.name ?? "Male"} × ${female?.name ?? "Female"}${project.goal ? ` · Goal: ${project.goal}` : ""}`, tone: "planned" });
    pairings.forEach((pairing) => result.push({ id: pairing.id, date: pairing.pairingDate, title: `Pairing · ${pairing.status}`, detail: pairing.notes || "Supervised pairing recorded.", tone: "pairing" }));
    clutches.forEach((clutch) => result.push({ id: clutch.id, date: clutch.laidDate, title: `Clutch · ${clutch.eggCount} egg${clutch.eggCount === 1 ? "" : "s"}`, detail: `${clutch.viableEggs ?? "?"} viable recorded${clutch.incubatorTemperature ? ` · ${clutch.incubatorTemperature}°C incubation` : ""}`, tone: "clutch" }));
    hatchlings.forEach((hatchling) => result.push({ id: hatchling.id, date: hatchling.hatchDate, title: `Hatchling · ${hatchling.name || "Unnamed"}`, detail: `${hatchling.sex} · ${hatchling.morph || "Phenotype not recorded"}${hatchling.holdback ? " · HOLD BACK" : ""}`, tone: "hatch" }));
    return result.sort((a, b) => dateValue(a.date) - dateValue(b.date));
  }, [project, male, female, pairings, clutches, hatchlings]);

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><h1>🧬 Breeding Timeline</h1><p>Loading your breeding records…</p></div>;
  if (!user) return <div className="page-container"><BackHomeButton /><h1>🧬 Breeding Timeline</h1><p>Sign in to view breeding timelines.</p></div>;

  return <main className="page-container breeding-timeline-page">
    <BackHomeButton />
    <header className="breeding-timeline-hero">
      <div><p className="breeding-timeline-eyebrow">Tiny Titans · Breeding Intelligence</p><h1>🧬 Breeding Timeline</h1><p>One chronological view from project creation through pairing, clutch and hatchling outcomes.</p></div>
      <button type="button" onClick={() => navigate("/breeding")}>Open Breeding Planner</button>
    </header>

    {error && <div className="breeding-timeline-alert" role="alert">⚠️ {error}</div>}

    {!projects.length ? <section className="breeding-timeline-card"><h2>No breeding projects yet</h2><p>Create a project first. The timeline will build itself from the records you add.</p><button type="button" onClick={() => navigate("/breeding")}>Create a breeding project</button></section> : <>
      <section className="breeding-timeline-card">
        <label htmlFor="timeline-project">Breeding project</label>
        <select id="timeline-project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {project && <div className="breeding-timeline-summary"><strong>{male?.name ?? "Male not found"} × {female?.name ?? "Female not found"}</strong><span>{project.status} · {pairings.length} pairings · {clutches.length} clutches · {hatchlings.length} hatchlings</span></div>}
      </section>

      <section className="breeding-timeline-card">
        <div className="breeding-timeline-heading"><div><h2>Lifecycle</h2><p>Recorded events are shown exactly as entered; missing dates are not invented.</p></div><div className="breeding-timeline-legend"><span>Plan</span><span>Pairing</span><span>Clutch</span><span>Hatch</span></div></div>
        {!events.length ? <p>No lifecycle events have been recorded yet.</p> : <div className="breeding-timeline-list">{events.map((event) => <article className={`breeding-timeline-event ${event.tone}`} key={event.id}><div className="breeding-timeline-dot" /><div className="breeding-timeline-event-body"><time>{event.date || "Date not recorded"}</time><h3>{event.title}</h3><p>{event.detail}</p></div></article>)}</div>}
      </section>

      <section className="breeding-timeline-card breeding-timeline-principles"><h2>🧠 What this timeline does — and doesn't — tell you</h2><ul><li>It preserves the keeper's actual recorded sequence of events.</li><li>It highlights gaps without pretending missing information is known.</li><li>It does not infer fertility, ovulation, health or causation from dates alone.</li><li>It is a record and decision-support view, not a veterinary diagnosis or a guarantee of breeding outcome.</li></ul></section>
    </>}
  </main>;
}
