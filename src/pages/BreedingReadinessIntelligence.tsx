import { useMemo, useState } from "react";
import BackHomeButton from "../components/BackHomeButton";
import "./BreedingReadinessIntelligence.css";

type Status = "ready" | "review" | "hold";

type Check = {
  id: string;
  title: string;
  category: string;
  status: Status;
  detail: string;
  question: string;
};

const INITIAL_CHECKS: Check[] = [
  { id: "identity", title: "Identity and sex are confirmed", category: "Foundations", status: "ready", detail: "Parentage and sex should be established before a pairing is planned.", question: "Are both animals correctly identified and sex-confirmed?" },
  { id: "health", title: "No active health concern", category: "Health", status: "ready", detail: "Breeding should never be used as a reason to ignore an unresolved health problem.", question: "Is there any current illness, unexplained decline or unresolved veterinary concern?" },
  { id: "condition", title: "Body condition is appropriate", category: "Conditioning", status: "review", detail: "Use the whole animal and its trend rather than a single target weight.", question: "Have you assessed body condition and recent weight trend?" },
  { id: "feeding", title: "Feeding history is stable", category: "Conditioning", status: "ready", detail: "A stable feeding history provides useful context for conditioning and seasonal cycling.", question: "Has feeding been consistent without recent unexplained refusal or regurgitation?" },
  { id: "records", title: "Records are sufficient to make the decision", category: "Records", status: "review", detail: "Missing information is not automatically a stop, but it should be recognised as uncertainty.", question: "Do you have enough recent records to understand each animal's current condition?" },
  { id: "genetics", title: "Genetics and pairing goal are understood", category: "Genetics", status: "ready", detail: "Separate confirmed genetics from possible hets, assumptions and phenotype guesses.", question: "Can you explain what the pairing is expected to produce and what remains uncertain?" },
  { id: "resources", title: "Equipment and space are ready", category: "Planning", status: "review", detail: "Breeding creates more animals, records and welfare responsibilities than the pairing itself.", question: "Do you have appropriate housing, food, incubation equipment and contingency capacity?" },
  { id: "vet", title: "Reptile-veterinary plan exists", category: "Safety", status: "review", detail: "Know who you would contact before a reproductive emergency occurs.", question: "Do you know where to seek qualified reptile-veterinary help if needed?" },
  { id: "outcomes", title: "A realistic hatchling plan exists", category: "Responsibility", status: "ready", detail: "Responsible breeding includes the animals produced, not just the genetics desired.", question: "Do you have a realistic plan for every hatchling you may produce?" },
];

const STATUS_META: Record<Status, { label: string; icon: string; description: string }> = {
  ready: { label: "Ready signal", icon: "🟢", description: "No concern recorded for this item." },
  review: { label: "Review", icon: "🟡", description: "More information or preparation would strengthen the decision." },
  hold: { label: "Hold", icon: "🔴", description: "Do not proceed until the underlying concern is resolved or professionally assessed." },
};

export default function BreedingReadinessIntelligence() {
  const [checks, setChecks] = useState(INITIAL_CHECKS);
  const [showHow, setShowHow] = useState(false);

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

  return <main className="page-container readiness-page">
    <BackHomeButton />
    <header className="readiness-hero">
      <div>
        <span className="readiness-kicker">Tiny Titans · Breeding Academy</span>
        <h1>🧠 Breeding Readiness Intelligence</h1>
        <p>Turn your records into a structured pre-breeding review. This is decision support, not a biological autopilot.</p>
      </div>
      <div className={`readiness-result result-${summary.status}`}>
        <span>{STATUS_META[summary.status].icon}</span>
        <strong>{summary.status === "ready" ? "Ready to review pairing" : summary.status === "review" ? "Review before proceeding" : "Hold and investigate"}</strong>
        <small>{summary.ready} ready · {summary.review} review · {summary.hold} hold</small>
      </div>
    </header>

    <section className="readiness-principle"><strong>⚖️ How Tiny Titans thinks</strong><p>A missing record is uncertainty, not automatically a failure. A concern is not diagnosed by an app. Where professional assessment is needed, the app tells you what to investigate rather than pretending it can replace a reptile veterinarian.</p></section>

    <section className="readiness-card">
      <div className="readiness-section-title"><div><span className="readiness-kicker">Pre-breeding gate</span><h2>Review the whole picture</h2></div><button onClick={() => setShowHow((value) => !value)}>{showHow ? "Hide" : "How is this scored?"}</button></div>
      {showHow && <div className="readiness-how"><p><strong>Ready</strong> means no concern has been recorded for that factor.</p><p><strong>Review</strong> means the keeper should gather more information or improve preparation.</p><p><strong>Hold</strong> is reserved for an explicit stop condition entered by the keeper; Tiny Titans does not invent medical diagnoses.</p></div>}
      <div className="readiness-list">{checks.map((item) => <article key={item.id} className={`readiness-item item-${item.status}`}>
        <div className="readiness-item-main"><span className="readiness-icon">{STATUS_META[item.status].icon}</span><div><span className="readiness-category">{item.category}</span><h3>{item.title}</h3><p>{item.detail}</p></div></div>
        <div className="readiness-item-action"><span title={STATUS_META[item.status].description}>{STATUS_META[item.status].label}</span><button onClick={() => cycle(item.id)} aria-label={`Change status for ${item.title}`}>Change</button></div>
        <div className="readiness-question"><strong>Ask yourself</strong><span>{item.question}</span></div>
      </article>)}</div>
    </section>

    <section className="readiness-card readiness-two-col">
      <div><span className="readiness-kicker">Before introduction</span><h2>🛑 Stop conditions</h2><ul><li>Unresolved illness or significant unexplained decline</li><li>Suspected reproductive emergency</li><li>Unsafe or unstable environmental control</li><li>No practical separation or contingency plan</li><li>Breeding decision depends on an assumption presented as confirmed genetics</li></ul></div>
      <div><span className="readiness-kicker">Remember</span><h2>🧭 The result is a prompt</h2><p>A green result does not guarantee fertility, successful copulation, healthy eggs or viable hatchlings. A yellow result does not mean breeding is impossible. A red result means the recorded concern deserves resolution before proceeding.</p><p><strong>Biology remains biology.</strong> The app can organise information, expose uncertainty and improve preparation; it cannot guarantee an outcome.</p></div>
    </section>
  </main>;
}
