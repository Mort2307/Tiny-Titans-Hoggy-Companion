import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { ACADEMY_CHAPTERS, ACADEMY_PRINCIPLE, BREEDING_CHECKLIST, BRUMATION_METHODS, EVIDENCE_LABELS, INCUBATION_METHODS, SOURCES, type AcademySection, type EvidenceLevel } from "../data/breedingAcademy";
import "./BreedingAcademy.css";

const levelOrder: EvidenceLevel[] = ["established", "practice", "limited", "avoid"];

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const meta = EVIDENCE_LABELS[level];
  return <span className={`academy-evidence academy-evidence-${level}`} title={meta.description}>{meta.label}</span>;
}

function MethodCard({ method }: { method: typeof BRUMATION_METHODS[number] }) {
  return <article className="academy-method-card">
    <div className="academy-method-head"><div><EvidenceBadge level={method.level} /><h3>{method.title}</h3></div></div>
    <p>{method.summary}</p>
    <div className="academy-method-columns">
      <div><h4>✅ Potential advantages</h4><ul>{method.advantages.map((item) => <li key={item}>{item}</li>)}</ul></div>
      <div><h4>⚠️ Limitations</h4><ul>{method.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
    </div>
    <div className="academy-monitor"><strong>What needs monitoring?</strong><ul>{method.monitor.map((item) => <li key={item}>{item}</li>)}</ul></div>
    <div className="academy-decision"><strong>🧭 Decision lens</strong><p>{method.decision}</p></div>
  </article>;
}

export default function BreedingAcademy() {
  const navigate = useNavigate();
  const [active, setActive] = useState<AcademySection>("foundations");
  const [completed, setCompleted] = useState<AcademySection[]>([]);
  const [checklist, setChecklist] = useState<boolean[]>(() => BREEDING_CHECKLIST.map(() => false));
  const [showSources, setShowSources] = useState(false);
  const [search, setSearch] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | EvidenceLevel>("all");

  const chapter = ACADEMY_CHAPTERS.find((item) => item.id === active) ?? ACADEMY_CHAPTERS[0];
  const chapterIndex = ACADEMY_CHAPTERS.findIndex((item) => item.id === active);
  const progress = Math.round((completed.length / ACADEMY_CHAPTERS.length) * 100);
  const checklistDone = checklist.filter(Boolean).length;

  const filteredMethods = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...BRUMATION_METHODS, ...INCUBATION_METHODS].filter((method) => {
      const matchesEvidence = evidenceFilter === "all" || method.level === evidenceFilter;
      const haystack = `${method.title} ${method.summary} ${method.advantages.join(" ")} ${method.limitations.join(" ")}`.toLowerCase();
      return matchesEvidence && (!query || haystack.includes(query));
    });
  }, [search, evidenceFilter]);

  const markComplete = () => setCompleted((current) => current.includes(active) ? current : [...current, active]);
  const jumpTo = (id: AcademySection) => { setActive(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const toggleChecklist = (index: number) => setChecklist((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));

  return <main className="page-container academy-page">
    <BackHomeButton />
    <header className="academy-hero">
      <div className="academy-hero-copy">
        <p className="academy-eyebrow">Tiny Titans · Keeper Education</p>
        <h1>🐍 Breeding Academy</h1>
        <p className="academy-lead">A Western Hognose breeding guide built to teach the <strong>why</strong>, compare legitimate approaches, expose uncertainty and help keepers make responsible decisions.</p>
        <div className="academy-hero-actions"><button type="button" onClick={() => jumpTo("foundations")}>Start the Academy</button><button type="button" className="academy-secondary" onClick={() => navigate("/breeding")}>Open Breeding Planner</button></div>
      </div>
      <div className="academy-progress-card"><span>Your learning progress</span><strong>{progress}%</strong><div className="academy-progress-track"><div style={{ width: `${progress}%` }} /></div><small>{completed.length} of {ACADEMY_CHAPTERS.length} chapters completed</small></div>
    </header>

    <section className="academy-principle" aria-label="Tiny Titans breeding philosophy"><div className="academy-principle-icon">🧠</div><div><strong>Our rule: teach the decision, not just the recipe.</strong><p>{ACADEMY_PRINCIPLE}</p></div></section>

    <div className="academy-layout">
      <aside className="academy-sidebar">
        <div className="academy-sidebar-inner"><h2>Course map</h2>{ACADEMY_CHAPTERS.map((item, index) => <button key={item.id} type="button" className={`academy-nav-item ${active === item.id ? "is-active" : ""}`} onClick={() => jumpTo(item.id)}><span>{item.icon}</span><span><strong>{index + 1}. {item.title}</strong><small>{completed.includes(item.id) ? "✓ Complete" : item.subtitle}</small></span></button>)}</div>
      </aside>

      <section className="academy-content">
        <div className="academy-chapter-heading"><div><p className="academy-eyebrow">Chapter {chapterIndex + 1} of {ACADEMY_CHAPTERS.length}</p><h2>{chapter.icon} {chapter.title}</h2><p>{chapter.subtitle}</p></div><button type="button" className={completed.includes(active) ? "academy-complete completed" : "academy-complete"} onClick={markComplete}>{completed.includes(active) ? "✓ Chapter complete" : "Mark chapter complete"}</button></div>
        <div className="academy-why"><strong>Why this matters</strong><p>{chapter.why}</p></div>
        <div className="academy-card"><h3>Core learning points</h3><ul className="academy-learning-list">{chapter.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></div>

        {active === "foundations" && <section className="academy-card"><h3>Before you breed: readiness gate</h3><p>Tick through this before a planned pairing. It is deliberately broader than an age or weight threshold.</p><div className="academy-checklist">{BREEDING_CHECKLIST.map((item, index) => <label key={item}><input type="checkbox" checked={checklist[index]} onChange={() => toggleChecklist(index)} /><span>{item}</span></label>)}</div><div className="academy-checklist-footer"><strong>{checklistDone}/{BREEDING_CHECKLIST.length}</strong><span>{checklistDone === BREEDING_CHECKLIST.length ? "Readiness checklist complete." : "A missing box is a prompt to investigate, not an automatic failure."}</span></div></section>}

        {active === "conditioning" && <section className="academy-card"><h3>Conditioning is a trend, not a magic number</h3><div className="academy-three"><div><span>01</span><strong>Body condition</strong><p>Look at the whole animal, not just the scale.</p></div><div><span>02</span><strong>History</strong><p>Use feeding, health and previous reproductive data.</p></div><div><span>03</span><strong>Readiness</strong><p>Make a decision from multiple signals.</p></div></div><div className="academy-warning"><strong>🚫 Don't power-feed to a target.</strong><p>Breeding animals should be conditioned responsibly. A larger number on the scale is not automatically a healthier breeding animal.</p></div></section>}

        {active === "brumation" && <section className="academy-card"><div className="academy-section-title"><div><h3>🥶 Brumation: compare the approaches</h3><p>Current husbandry references differ in their protocols, and experienced breeders also vary. That disagreement is information—not something we should hide.</p></div><EvidenceBadge level="practice" /></div><div className="academy-method-list">{BRUMATION_METHODS.map((method) => <MethodCard key={method.title} method={method} />)}</div><div className="academy-fact-box"><strong>📌 What the references tell us</strong><p>Institutional and species-level sources establish seasonal reproduction and provide observed reproductive timing, while captive husbandry sources describe deliberate cooling protocols. Some breeder guidance also explicitly reports that some snakes may breed without brumation. Tiny Titans therefore presents brumation as a protocol choice requiring informed risk assessment, not as a universal badge of good breeding.</p></div></section>}

        {active === "pairing" && <section className="academy-card"><h3>🤝 Pairing protocol</h3><div className="academy-timeline"><div><span>01</span><div><strong>Prepare</strong><p>Confirm both animals are appropriate for introduction and that separation is immediately available.</p></div></div><div><span>02</span><div><strong>Introduce</strong><p>Use a controlled introduction and observe behaviour rather than assuming a lock will happen.</p></div></div><div><span>03</span><div><strong>Record</strong><p>Log date, time, courtship, observed copulation/lock, separation and any unusual behaviour.</p></div></div><div><span>04</span><div><strong>Review</strong><p>Decide whether another introduction is appropriate from the individual animals and your programme records.</p></div></div></div><div className="academy-note"><strong>Hognose-specific reminder:</strong> defensive displays, bluffing and thanatosis can complicate visual interpretation. Don't turn one behaviour into a guaranteed diagnosis of receptivity or rejection.</div></section>}

        {active === "ovulation" && <section className="academy-card"><h3>🥚 Think in stages</h3><div className="academy-stage-grid">{["Follicular development", "Ovulation", "Post-ovulation changes", "Gravidity", "Pre-lay behaviour", "Oviposition"].map((stage, index) => <div key={stage}><span>{index + 1}</span><strong>{stage}</strong><p>Record observations and trends rather than relying on one visual sign.</p></div>)}</div><div className="academy-warning"><strong>⚠️ Veterinary boundary</strong><p>Persistent straining, distress, prolonged reproductive difficulty or suspected dystocia belongs with a qualified reptile veterinarian. The Academy is educational; it is not a DIY treatment manual.</p></div></section>}

        {active === "laying" && <section className="academy-card"><h3>🪹 Lay box & clutch record</h3><div className="academy-grid-two"><div><h4>Prepare</h4><ul><li>Secure and appropriately sized nesting area</li><li>Diggable substrate suitable for the setup</li><li>Easy access without exposing the female unnecessarily</li><li>Separate recovery space ready after laying</li></ul></div><div><h4>Record</h4><ul><li>First searching/digging observation</li><li>Lay date</li><li>Egg count</li><li>Egg condition and unusual observations</li><li>Post-lay female weight and recovery</li></ul></div></div><div className="academy-note"><strong>Don't improvise invasive interventions.</strong> Suspected egg-binding is a veterinary issue. A breeding guide should tell you when to stop experimenting, not teach you risky home procedures.</div></section>}

        {active === "incubation" && <section className="academy-card"><div className="academy-section-title"><div><h3>🌡️ Incubation systems</h3><p>Different media and container strategies can work. The common denominator is controlled, monitored environmental conditions.</p></div><EvidenceBadge level="established" /></div><div className="academy-method-list">{INCUBATION_METHODS.map((method) => <MethodCard key={method.title} method={method} />)}</div><div className="academy-emergency"><h3>🚨 Build the failure plan before the eggs arrive</h3><div className="academy-three"><div><strong>Primary</strong><p>Thermostat + primary probe.</p></div><div><strong>Independent</strong><p>Separate thermometer/data logger.</p></div><div><strong>Emergency</strong><p>Backup heat/cooling and a transfer procedure.</p></div></div></div></section>}

        {active === "hatching" && <section className="academy-card"><h3>🐣 Pipping does not automatically mean “help me”</h3><div className="academy-pip"><div><strong>First pip</strong><span>Record the date/time.</span></div><div><strong>Observation</strong><span>Maintain stable incubation conditions and observe.</span></div><div><strong>Emergence</strong><span>Record the hatch separately from the pip.</span></div><div><strong>Assessment</strong><span>Move to neonatal care when appropriately emerged.</span></div></div><div className="academy-warning"><strong>Patience is part of the protocol.</strong><p>Do not use a timer as an automatic trigger for invasive assistance. If a hatchling appears genuinely compromised, seek appropriate expert/veterinary guidance.</p></div></section>}

        {active === "neonates" && <section className="academy-card"><h3>🐍 From egg to permanent lineage record</h3><div className="academy-lineage"><div><span>PAIRING</span><strong>♂ × ♀</strong></div><b>→</b><div><span>CLUTCH</span><strong>Egg #01</strong></div><b>→</b><div><span>HATCHLING</span><strong>TT-2026-01</strong></div><b>→</b><div><span>ADULT RECORD</span><strong>Future breeder</strong></div></div><p className="academy-muted">Keep observed phenotype separate from genetic probability. A hatchling can be visually identified without every hidden allele being “confirmed”.</p><div className="academy-grid-two"><div><h4>Record</h4><ul><li>Unique hatchling ID</li><li>Sex</li><li>Observed phenotype</li><li>Weight at hatch</li><li>First shed and feeding</li></ul></div><div><h4>Genetics</h4><ul><li>Parentage</li><li>Expected probabilities</li><li>Confirmed visuals</li><li>Proven hets when appropriate</li><li>Unknown/unproven traits clearly labelled</li></ul></div></div></section>}

        {active === "ethics" && <section className="academy-card"><h3>⚖️ Responsible breeding framework</h3><div className="academy-ethics">{["Animal first", "Evidence over certainty", "Transparent genetics", "Every offspring planned", "No avoidable hereditary harm", "Honest sales and records"].map((item) => <div key={item}><span>✓</span><strong>{item}</strong></div>)}</div><div className="academy-principle academy-principle-small"><div className="academy-principle-icon">💡</div><div><strong>Fact · Practice · Opinion</strong><p><b>Fact:</b> reasonably established information. <b>Practice:</b> something experienced keepers commonly do. <b>Opinion:</b> an individual preference or interpretation. All three can be useful—but they are not interchangeable.</p></div></div></section>}

        <section className="academy-card academy-method-lab"><div className="academy-section-title"><div><h3>🔎 Method Finder</h3><p>Search across the brumation and incubation approaches without pretending they have equal evidence.</p></div><select value={evidenceFilter} onChange={(event) => setEvidenceFilter(event.target.value as "all" | EvidenceLevel)} aria-label="Filter methods by evidence"><option value="all">All evidence levels</option>{levelOrder.map((level) => <option key={level} value={level}>{EVIDENCE_LABELS[level].label}</option>)}</select></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search methods, risks, monitoring…" aria-label="Search breeding methods" /><div className="academy-method-results">{filteredMethods.length ? filteredMethods.map((method) => <div key={`${method.title}-${method.level}`} className="academy-result-row"><EvidenceBadge level={method.level} /><strong>{method.title}</strong><span>{method.summary}</span></div>) : <p>No methods match that filter.</p>}</div></section>

        <section className="academy-sources"><button type="button" onClick={() => setShowSources((value) => !value)}>{showSources ? "Hide" : "Show"} sources & methodology</button>{showSources && <div className="academy-source-list"><p>Sources are intentionally mixed: institutional and government material establishes species-level context; academic material provides natural-history evidence; husbandry sources describe captive protocols; breeder sources demonstrate real-world practice. Where they disagree, Tiny Titans preserves the disagreement rather than manufacturing certainty.</p>{SOURCES.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><div><strong>{source.title}</strong><span>{source.publisher} · {source.type}</span><p>{source.note}</p></div><span aria-hidden="true">↗</span></a>)}</div>}</section>

        <div className="academy-footer-nav"><button type="button" disabled={chapterIndex <= 0} onClick={() => jumpTo(ACADEMY_CHAPTERS[chapterIndex - 1].id)}>← Previous</button><button type="button" onClick={markComplete}>{completed.includes(active) ? "Chapter complete ✓" : "Complete chapter"}</button><button type="button" disabled={chapterIndex >= ACADEMY_CHAPTERS.length - 1} onClick={() => jumpTo(ACADEMY_CHAPTERS[chapterIndex + 1].id)}>Next →</button></div>
      </section>
    </div>
  </main>;
}
