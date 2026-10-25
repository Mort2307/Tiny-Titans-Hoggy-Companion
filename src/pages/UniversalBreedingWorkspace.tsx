import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useAuth } from "../context/useAuth";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getUserAnimals } from "../services/universalAnimalService";
import { getUserSnakes } from "../services/snakeService";
import { deleteBreedingProject, getBreedingProjects, saveBreedingProject } from "../services/breedingService";
import { getUniversalBreedingEvents, saveUniversalBreedingEvent } from "../services/universalBreedingService";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import { getSpeciesGeneticsStatus } from "../data/species/speciesGenetics";
import { UNIVERSAL_SPECIES_SOURCES } from "../data/species/universalSpeciesSources";
import { UNIVERSAL_BREEDING_EVENTS, type UniversalBreedingEvent, type UniversalBreedingEventKind } from "../types/UniversalBreeding";
import type { BreedingProject, BreedingStatus } from "../types/Breeding";
import "./UniversalBreedingWorkspace.css";

type Candidate = { id: string; name: string; sex: string; variation: string; source: "animal" | "snake" };
type ReproductiveMode = NonNullable<BreedingProject["reproductiveMode"]>;
const modes: Array<{ id: ReproductiveMode; label: string }> = [
  { id: "unknown", label: "Unknown / not established" },
  { id: "eggs", label: "Eggs / egg mass / egg case" },
  { id: "live-birth", label: "Live birth" },
  { id: "brood", label: "Brood / offspring released" },
  { id: "other", label: "Other / mixed reproductive process" },
];
const activityStatuses: BreedingStatus[] = ["Planned", "Paired", "Complete", "Failed"];
const today = () => new Date().toISOString().slice(0, 10);
const id = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "tt-" + Date.now() + "-" + Math.random().toString(36).slice(2);
const labelForKind = (kind: UniversalBreedingEventKind) => UNIVERSAL_BREEDING_EVENTS.find((entry) => entry.kind === kind)?.label ?? kind;

export default function UniversalBreedingWorkspace() {
  const { selectedSpeciesId, selectedUniversalSpecies: species } = useSpeciesContext();
  const { user, loading: authLoading, profileLoading } = useAuth();
  const [animals, setAnimals] = useState<Candidate[]>([]);
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [deleteRequestedId, setDeleteRequestedId] = useState("");
  const [events, setEvents] = useState<UniversalBreedingEvent[]>([]);
  const [parentAId, setParentAId] = useState("");
  const [parentBId, setParentBId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<ReproductiveMode>("unknown");
  const [eventKind, setEventKind] = useState<UniversalBreedingEventKind>("courtship");
  const [eventDate, setEventDate] = useState(today);
  const [eventQuantity, setEventQuantity] = useState("");
  const [observedVariation, setObservedVariation] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"projects" | "observations" | "evidence">("projects");

  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const selectedProject = projects.find((project) => project.id === projectId);
  const sourceRecords = useMemo(() => species?.sourceIds
    .map((sourceId) => UNIVERSAL_SPECIES_SOURCES[sourceId]).filter(Boolean) ?? [], [species]);

  useEffect(() => {
    setProjectId("");
    setDeleteRequestedId("");
    setProjects([]);
    setAnimals([]);
    setEvents([]);
    setMessage("");
    if (!user || !selectedSpeciesId) return;
    let active = true;
    setFetching(true);
    void Promise.all([getUserAnimals(user.uid), getUserSnakes(user.uid).catch(() => []), getBreedingProjects(user.uid)])
      .then(([individuals, snakes, allProjects]) => {
        if (!active) return;
        const universal: Candidate[] = individuals
          .filter((animal) => animal.speciesId === selectedSpeciesId && animal.status === "active")
          .map((animal) => ({
            id: "animal:" + animal.id, name: animal.name, sex: animal.sex,
            variation: animal.morphOrColour ?? "Genetics unrecorded", source: "animal" as const,
          }));
        const legacy: Candidate[] = snakes
          .filter((snake) => (snake.universalSpeciesId || findUniversalSpecies(snake.species)?.id) === selectedSpeciesId && snake.status === "Active")
          .map((snake) => ({
            id: "snake:" + snake.id, name: snake.name, sex: snake.sex,
            variation: snake.morphs?.join(" + ") || "Genetics unrecorded", source: "snake" as const,
          }));
        const relevant = allProjects.filter((project) => project.speciesId === selectedSpeciesId);
        setAnimals([...universal, ...legacy]);
        setProjects(relevant);
        setProjectId(relevant[0]?.id ?? "");
        setError("");
      })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load breeding records."); })
      .finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [user, selectedSpeciesId]);

  useEffect(() => {
    setEvents([]);
    if (!user || !projectId) return;
    let active = true;
    void getUniversalBreedingEvents(user.uid, projectId)
      .then((records) => { if (active) setEvents(records); })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load breeding observations."); });
    return () => { active = false; };
  }, [user, projectId]);

  async function createProject() {
    setError(""); setMessage("");
    if (!user || !species) return;
    const first = animals.find((animal) => animal.id === parentAId);
    const second = animals.find((animal) => animal.id === parentBId);
    if (!first) { setError("Choose at least one recorded animal from this species."); return; }
    if (parentBId && (!second || first.id === second.id)) { setError("The optional second animal must be a different recorded individual."); return; }
    const project: BreedingProject = {
      id: id(), ownerId: user.uid, speciesId: species.id,
      parentAId: first.id, parentBId: second?.id, reproductiveMode: mode,
      // Legacy male/female fields remain for compatibility. Universal roles are stored separately.
      maleId: first.sex.toLowerCase() === "male" ? first.id : second?.sex.toLowerCase() === "male" ? second.id : "",
      femaleId: first.sex.toLowerCase() === "female" ? first.id : second?.sex.toLowerCase() === "female" ? second.id : "",
      name: projectName.trim() || first.name + (second ? " × " + second.name : " — observation project"),
      goal: goal.trim() || undefined, status: "Planned",
    };
    setBusy(true);
    try {
      await saveBreedingProject(user.uid, project);
      setProjects((existing) => [project, ...existing]);
      setProjectId(project.id);
      setProjectName(""); setGoal("");
      setMessage("Species-specific breeding project saved. No genetic or reproductive assumptions were made.");
      setTab("observations");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save this project.");
    } finally { setBusy(false); }
  }

  async function recordEvent() {
    setError(""); setMessage("");
    if (!user || !species || !selectedProject) return;
    const count = eventQuantity.trim() === "" ? undefined : Number(eventQuantity);
    if (count !== undefined && (!Number.isSafeInteger(count) || count < 0)) {
      setError("Enter an observed whole-number quantity, or leave it blank when unknown."); return;
    }
    const event: UniversalBreedingEvent = {
      id: id(), projectId: selectedProject.id, speciesId: species.id,
      kind: eventKind, recordedAt: eventDate, createdAt: new Date().toISOString(),
      ...(count === undefined ? {} : { quantity: count }),
      ...(observedVariation.trim() ? { observedVariation: observedVariation.trim() } : {}),
      ...(eventNotes.trim() ? { notes: eventNotes.trim() } : {}),
    };
    setBusy(true);
    try {
      await saveUniversalBreedingEvent(user.uid, event);
      setEvents((existing) => [event, ...existing].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
      setEventNotes(""); setEventQuantity(""); setObservedVariation("");
      setMessage("Observation recorded. This does not establish a genetic inheritance pattern.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save this observation.");
    } finally { setBusy(false); }
  }

  async function changeStatus(next: BreedingStatus) {
    setError(""); setMessage("");
    if (!user || !selectedProject) return;
    setBusy(true);
    try {
      const updated = { ...selectedProject, status: next };
      await saveBreedingProject(user.uid, updated);
      setProjects((existing) => existing.map((item) => item.id === updated.id ? updated : item));
      setMessage("Project status updated.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to update the status.");
    } finally { setBusy(false); }
  }

  async function confirmProjectDeletion() {
    setError(""); setMessage("");
    if (!user || !selectedProject || deleteRequestedId !== selectedProject.id || busy) return;
    setBusy(true);
    try {
      const deletedId = selectedProject.id;
      await deleteBreedingProject(user.uid, deletedId);
      const remaining = projects.filter((project) => project.id !== deletedId);
      setProjects(remaining);
      setProjectId(remaining[0]?.id ?? "");
      setDeleteRequestedId("");
      setEvents([]);
      setMessage("Breeding project and its recorded history were deleted.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to delete this project.");
      setDeleteRequestedId("");
    } finally { setBusy(false); }
  }

  if (authLoading || profileLoading) return <main className="page-container"><p>Loading breeding workspace…</p></main>;
  if (!user) return <main className="page-container"><BackHomeButton /><p>Sign in to save your animal breeding projects.</p></main>;
  if (!species) return <main className="page-container"><BackHomeButton /><h1>Breeding workspace</h1><p>Select an animal species in Species Explorer first.</p><Link to="/species">Browse species</Link></main>;

  const offspringRecordCount = events.filter((event) => event.kind === "offspring").length;

  return <main className="page-container breeding-page universal-breeding">
    <BackHomeButton />
    <header className="breeding-hero">
      <div><p className="breeding-eyebrow">Tiny Titans · Universal Breeding Intelligence</p>
        <h1><TinyTitansIcon name="breeding" size={26} /> {species.commonNames[0] ?? species.acceptedScientificName}</h1>
        <p><i>{species.acceptedScientificName}</i> · Plan and document actual reproduction without borrowing another species' biology.</p>
      </div>
      <div className="breeding-callout"><strong>Genetics</strong><div>{geneticsStatus === "baseline-only" ? "Inheritance not mapped" : geneticsStatus === "partial" ? "Partially documented" : "Catalogued traits available"}</div></div>
    </header>

    {error && <div className="universal-breeding-message" role="alert">{error}</div>}
    {message && <div className="universal-breeding-message" role="status">{message}</div>}
    <nav className="universal-breeding-tabs" aria-label="Breeding workspace">
      {(["projects", "observations", "evidence"] as const).map((item) => <button type="button" aria-current={tab === item ? "page" : undefined} className={tab === item ? "is-current" : ""} onClick={() => setTab(item)} key={item}>{item === "projects" ? "Projects" : item === "observations" ? "Observations & offspring" : "Genetics & evidence"}</button>)}
    </nav>

    {tab === "projects" && <div className="universal-breeding-columns">
      <section className="breeding-card">
        <h2>Create a species-specific project</h2>
        <p className="breeding-muted">Select recorded active individuals. Parentage, sex, reproductive strategy and genetics stay unknown unless documented. A project is not certification that an animal is healthy, mature or suitable for breeding.</p>
        <div className="breeding-form">
          <label>Individual A<select value={parentAId} onChange={(event) => { setParentAId(event.target.value); if (event.target.value === parentBId) setParentBId(""); }}>
            <option value="">Choose animal…</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.sex} · {animal.variation}</option>)}
          </select></label>
          <label>Individual B (optional)<select value={parentBId} onChange={(event) => setParentBId(event.target.value)}>
            <option value="">Unknown / not applicable / unrecorded</option>{animals.filter((animal) => animal.id !== parentAId).map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.sex}</option>)}
          </select></label>
          <label>Reproduction as documented<select value={mode} onChange={(event) => setMode(event.target.value as ReproductiveMode)}>
            {modes.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select></label>
          <label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Optional project title" /></label>
          <label>Breeding goal / keeper notes<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Record what you are trying to study or achieve" /></label>
          <button type="button" disabled={busy || fetching || !parentAId} onClick={() => void createProject()}>{busy ? "Saving…" : "Create project"}</button>
          {animals.length === 0 && <p className="breeding-muted">No active individuals for this species yet. <Link to="/animals">Add an animal</Link> to start a project.</p>}
        </div>
      </section>
      <section className="breeding-card">
        <h2>Your {species.commonNames[0] ?? "species"} projects</h2>
        {fetching ? <p>Loading records…</p> : projects.length === 0 ? <p className="breeding-muted">No projects recorded for this species.</p> :
          <div className="universal-breeding-project-list">{projects.map((project) => <button type="button" className={project.id === projectId ? "is-current" : ""} key={project.id} onClick={() => { setProjectId(project.id); setTab("observations"); }}>
            <strong>{project.name}</strong><small>{project.status} · {modes.find((option) => option.id === project.reproductiveMode)?.label ?? "Reproduction unknown"}</small>
            {project.goal && <small>{project.goal}</small>}
          </button>)}</div>}
      </section>
    </div>}

    {tab === "observations" && <>
      <section className="universal-breeding-overview" aria-label="Recorded breeding progress">
        <div><span>Projects</span><strong>{projects.length}</strong></div>
        <div><span>Recorded events</span><strong>{events.length}</strong></div>
        <div><span>Offspring records</span><strong>{offspringRecordCount}</strong><small>Observation entries; not unique animals</small></div>
      </section>
      <section className="breeding-card">
        <h2>Selected project</h2>
        <label className="universal-breeding-project-picker">Project<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setDeleteRequestedId(""); }}><option value="">Choose project…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        {selectedProject && <div className="universal-breeding-status"><span>Status: <strong>{selectedProject.status}</strong></span><label>Update project status<select value={selectedProject.status} disabled={busy} onChange={(event) => void changeStatus(event.target.value as BreedingStatus)}>{activityStatuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div>}
        {selectedProject && <div className="universal-breeding-delete">
          {deleteRequestedId !== selectedProject.id ? <button type="button" disabled={busy} onClick={() => setDeleteRequestedId(selectedProject.id)}>Delete this project</button> : <div className="universal-breeding-delete-confirm" role="group" aria-label="Confirm permanent project deletion">
            <strong>Delete {selectedProject.name}?</strong>
            <p>This permanently deletes the project, observations, offspring and recorded lifecycle history. This cannot be undone.</p>
            <div><button type="button" disabled={busy} onClick={() => setDeleteRequestedId("")}>Cancel</button><button type="button" disabled={busy} onClick={() => void confirmProjectDeletion()}>{busy ? "Deleting…" : "Confirm permanent deletion"}</button></div>
          </div>}
        </div>}
      </section>
      {selectedProject && <div className="universal-breeding-columns">
        <section className="breeding-card"><h2>Log observed event</h2><p className="breeding-muted">Only record what happened. A submitted colour or morph name is not a verified genetic claim.</p>
          <div className="breeding-form">
            <label>Observation<select value={eventKind} onChange={(event) => setEventKind(event.target.value as UniversalBreedingEventKind)}>{UNIVERSAL_BREEDING_EVENTS.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select></label>
            <label>Date<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
            <label>Observed quantity (optional)<input type="number" min="0" step="1" value={eventQuantity} onChange={(event) => setEventQuantity(event.target.value)} placeholder="Leave blank if unknown" /></label>
            <label>Observed colour / variation (optional)<input value={observedVariation} onChange={(event) => setObservedVariation(event.target.value)} placeholder="Keeper-observed, not assumed genetics" /></label>
            <label>Notes<textarea value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} rows={3} placeholder="Behaviour, conditions, confidence, dates, evidence..." /></label>
            <button type="button" disabled={busy || !eventDate} onClick={() => void recordEvent()}>{busy ? "Saving…" : "Save observation"}</button>
          </div>
        </section>
        <section className="breeding-card"><h2>Breeding history</h2>{events.length === 0 ? <p className="breeding-muted">No observations yet. The timeline will build from actual recorded events.</p> :
          <ol className="universal-breeding-timeline">{events.map((entry) => <li key={entry.id}><span>{entry.recordedAt}</span><strong>{labelForKind(entry.kind)}{entry.quantity === undefined ? "" : " · " + entry.quantity}</strong>{entry.observedVariation && <small>Keeper-observed variation: {entry.observedVariation}</small>}{entry.notes && <p>{entry.notes}</p>}</li>)}</ol>}
        </section>
      </div>}
    </>}

    {tab === "evidence" && <div className="universal-breeding-columns">
      <section className="breeding-card"><h2>Genetics and named combinations</h2>
        <p>The <Link to={"/morph-library?species=" + encodeURIComponent(species.id)}>Morph &amp; Variation Library</Link> is available for every species. Keeper-contributed variations are not automatically treated as inheritable genes.</p>
        {geneticsStatus === "baseline-only" ? <p className="breeding-muted">No reviewed breeding loci are mapped. Offspring probabilities and named genetic combinations are withheld, rather than borrowed from other animals.</p> :
          <div><p>Documented traits are catalogued for this species. The genetics calculator requires supported parental genotypes to display numerical forecasts.</p><Link to="/calculator">Open species genetics calculator</Link></div>}
      </section>
      <section className="breeding-card"><h2>Husbandry and legal evidence</h2>
        <p className="breeding-muted">Reproductive timing, parameters and maturity are not inferred from the animal group. Check species-specific supporting literature before breeding.</p>
        <p>Care evidence: <strong>{species.care?.husbandry.coverage ?? "not verified"}</strong> · Regulatory status: <strong>Location-dependent checks required</strong></p>
        <Link to={"/species/" + encodeURIComponent(species.id)}>Open species evidence</Link>
        {sourceRecords.length > 0 && <ul className="universal-breeding-sources">{sourceRecords.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>}
      </section>
    </div>}
  </main>;
}
