import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import "./BreedingReadinessIntelligence.css";

type Status = "ready" | "review" | "hold";
type Check = { id: string; title: string; category: string; status: Status; detail: string; question: string };

const STATUS_META: Record<Status, { label: string; icon: string; description: string }> = {
  ready: { label: "Ready signal", icon: "🟢", description: "No concern recorded for this item." },
  review: { label: "Review", icon: "🟡", description: "More information or preparation would strengthen the decision." },
  hold: { label: "Hold", icon: "🔴", description: "Do not proceed until the underlying concern is resolved or professionally assessed." },
};

const makeChecks = (male?: Snake, female?: Snake): Check[] => {
  const both = Boolean(male && female);
  const same = Boolean(male?.id && female?.id && male.id === female.id);
  const healthFlags = [male?.notes, female?.notes].filter(Boolean).join(" ").toLowerCase();
  const concerningHealth = /(ill|sick|injur|vet|respirat|regurg|parasite|disease|unwell)/.test(healthFlags);
  const weightMissing = male?.weight == null || female?.weight == null;
  const sexReady = male?.sex === "Male" && female?.sex === "Female";
  const geneticInfo = Boolean((male?.morphs?.length ?? 0) || (female?.morphs?.length ?? 0) || male?.hets || female?.hets);
  return [
    { id: "selection", title: "A valid male × female pairing is selected", category: "Foundations", status: !both ? "review" : same ? "hold" : sexReady ? "ready" : "hold", detail: "The assessment is tied to the actual animals selected for this review.", question: "Are both animals correctly identified and sex-confirmed?" },
    { id: "health", title: "No recorded health concern", category: "Health", status: concerningHealth ? "hold" : "review", detail: concerningHealth ? "The current snake notes contain terms that deserve review before breeding." : "No obvious health concern was detected from the available notes. This is not a medical diagnosis.", question: "Is there any current illness, unexplained decline or unresolved veterinary concern?" },
    { id: "condition", title: "Current body condition can be assessed", category: "Conditioning", status: weightMissing ? "review" : "ready", detail: weightMissing ? "One or both selected snakes has no current recorded weight." : "Both selected snakes have a current weight record available to inform the keeper's assessment.", question: "Have you assessed body condition and recent weight trend rather than relying on one target weight?" },
    { id: "records", title: "Enough records exist to make an informed review", category: "Records", status: !both ? "review" : weightMissing ? "review" : "ready", detail: "Missing data is uncertainty, not an automatic breeding failure.", question: "Do you have enough recent records to understand each animal's current condition?" },
    { id: "genetics", title: "Genetics and pairing goal are understood", category: "Genetics", status: geneticInfo ? "ready" : "review", detail: geneticInfo ? "Recorded morph/het information is available; confirmed and possible genetics must still be distinguished." : "No recorded morph/het information was found for this pairing.", question: "Can you explain what the pairing is expected to produce and what remains uncertain?" },
    { id: "resources", title: "Equipment and space are ready", category: "Planning", status: "review", detail: "This cannot be inferred from snake records alone, so the keeper must confirm it manually.", question: "Do you have appropriate housing, food, incubation equipment and contingency capacity?" },
    { id: "vet", title: "Reptile-veterinary plan exists", category: "Safety", status: "review", detail: "This is intentionally a keeper confirmation rather than an automated claim.", question: "Do you know where to seek qualified reptile-veterinary help if needed?" },
    { id: "outcomes", title: "A realistic hatchling plan exists", category: "Responsibility", status: "review", detail: "Breeding creates welfare responsibilities for every animal produced.", question: "Do you have a realistic plan for every hatchling you may produce?" },
  ];
};

export default function BreedingReadinessIntelligence() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [maleId, setMaleId] = useState("");
  const [femaleId, setFemaleId] = useState("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [showHow, setShowHow] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    void getUserSnakes(user.uid).then((items) => setSnakes(items.filter((snake) => snake?.id))).catch((err) => setError(err instanceof Error ? err.message : "Unable to load your snakes."));
  }, [user, loading, profileLoading]);

  const males = useMemo(() => snakes.filter((snake) => snake.sex === "Male"), [snakes]);
  const females = useMemo(() => snakes.filter((snake) => snake.sex === "Female"), [snakes]);
  const male = snakes.find((snake) => snake.id === maleId);
  const female = snakes.find((snake) => snake.id === femaleId);

  useEffect(() => {
    setChecks(makeChecks(male, female));
  }, [male, female]);

  const summary = useMemo(() => {
    const hold = checks.filter((item) => item.status === "hold").length;
    const review = checks.filter((item) => item.status === "review").length;
    const ready = checks.filter((item) => item.status === "ready").length;
    const status: Status = hold > 0 ? "hold" : review > 0 ? "review" : "ready";
    return { hold, review, ready, status };
  }, [checks]);

  const cycle = (id: string) => setChecks((current) => current.map((item) => {
    if (item.id !== id) return item;
    const next: Status = item.status === "ready" ? "review" : item.status === "review" ? "hold" : "ready";
    return { ...item, status: next };
  }));

  if (loading || profileLoading) return <main className="page-container readiness-page"><BackHomeButton /><h2>🧠 Breeding Readiness</h2><p>Loading your snakes…</p></main>;
  if (!user) return <main className="page-container readiness-page"><BackHomeButton /><h2>🧠 Breeding Readiness</h2><p>Sign in to review an actual pairing.</p><button type="button" onClick={() => navigate("/login")}>Sign In</button></main>;

  return <main className="page-container readiness-page">
    <BackHomeButton />
    <header className="readiness-hero">
      <div><span className="readiness-kicker">Tiny Titans · Breeding Intelligence</span><h1>🧠 Breeding Readiness</h1><p>Select the actual animals you are considering. Tiny Titans will use the records it has, expose missing information and leave keeper-only decisions clearly marked.</p></div>
      <div className={`readiness-result result-${summary.status}`}><span>{STATUS_META[summary.status].icon}</span><strong>{summary.status === "ready" ? "Ready to review pairing" : summary.status === "review" ? "Review before proceeding" : "Hold and investigate"}</strong><small>{summary.ready} ready · {summary.review} review · {summary.hold} hold</small></div>
    </header>

    {error && <section className="readiness-principle"><strong>⚠️ Unable to load records</strong><p>{error}</p></section>}

    <section className="readiness-card">
      <div className="readiness-section-title"><div><span className="readiness-kicker">Actual animals</span><h2>Select your pairing</h2></div></div>
      <div className="readiness-two-col">
        <div><label htmlFor="readiness-male"><strong>♂ Male</strong></label><select id="readiness-male" value={maleId} onChange={(event) => setMaleId(event.target.value)}><option value="">Select a male…</option>{males.map((snake) => <option key={snake.id} value={snake.id}>{snake.name || "Unnamed snake"}</option>)}</select>{male && <p><strong>{male.name}</strong> · {male.morphs?.join(" + ") || "Morph not recorded"}</p>}</div>
        <div><label htmlFor="readiness-female"><strong>♀ Female</strong></label><select id="readiness-female" value={femaleId} onChange={(event) => setFemaleId(event.target.value)}><option value="">Select a female…</option>{females.map((snake) => <option key={snake.id} value={snake.id}>{snake.name || "Unnamed snake"}</option>)}</select>{female && <p><strong>{female.name}</strong> · {female.morphs?.join(" + ") || "Morph not recorded"}</p>}</div>
      </div>
    </section>

    <section className="readiness-principle"><strong>⚖️ Decision-support rule</strong><p>A green result does not guarantee fertility or a successful breeding season. Yellow means information or preparation should be improved. Red is a deliberate stop signal. The app does not diagnose illness or replace a reptile veterinarian.</p></section>

    <section className="readiness-card">
      <div className="readiness-section-title"><div><span className="readiness-kicker">Pre-breeding gate</span><h2>Review the whole picture</h2></div><button type="button" onClick={() => setShowHow((value) => !value)}>{showHow ? "Hide" : "How is this scored?"}</button></div>
      {showHow && <div className="readiness-how"><p><strong>Ready</strong> means no concern was detected or recorded for that factor.</p><p><strong>Review</strong> means the keeper should gather information or confirm a manual requirement.</p><p><strong>Hold</strong> is reserved for an explicit stop condition; Tiny Titans does not invent medical diagnoses.</p></div>}
      <div className="readiness-list">{checks.map((item) => <article key={item.id} className={`readiness-item item-${item.status}`}><div className="readiness-item-main"><span className="readiness-icon">{STATUS_META[item.status].icon}</span><div><span className="readiness-category">{item.category}</span><h3>{item.title}</h3><p>{item.detail}</p></div></div><div className="readiness-item-action"><span title={STATUS_META[item.status].description}>{STATUS_META[item.status].label}</span><button type="button" onClick={() => cycle(item.id)}>Change</button></div><div className="readiness-question"><strong>Ask yourself</strong><span>{item.question}</span></div></article>)}</div>
    </section>

    <section className="readiness-card readiness-two-col"><div><span className="readiness-kicker">Before introduction</span><h2>🛑 Stop conditions</h2><ul><li>Unresolved illness or significant unexplained decline</li><li>Suspected reproductive emergency</li><li>Unsafe or unstable environmental control</li><li>No practical separation or contingency plan</li><li>Breeding depends on an assumption presented as confirmed genetics</li></ul></div><div><span className="readiness-kicker">Next step</span><h2>🧬 Continue into the planner</h2><p>Once you've reviewed the animals, the Breeding Planner can create the project, preserve the pairing's genetic snapshot and carry the record through clutches and hatchlings.</p><button type="button" onClick={() => navigate("/breeding")}>Open Breeding Planner</button></div></section>
  </main>;
}
