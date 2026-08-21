import { useAuth } from "../context/useAuth";
import MentorshipIntelligencePanel from "../components/KeeperMeetsBreeder/MentorshipIntelligencePanel";
import { mentorshipMilestones } from "../services/mentorshipProfiles";
import type { MentorshipGoal } from "../services/mentorshipIntelligence";
import "../styles/KeeperMeetsBreeder.css";

const goals: { id: MentorshipGoal; title: string; description: string }[] = [
  { id: "husbandry", title: "Improve my husbandry", description: "Build stronger observation, enclosure and routine skills." },
  { id: "genetics", title: "Understand genetics", description: "Build confidence with inheritance, hets and responsible records." },
  { id: "breeding", title: "Prepare for breeding", description: "Understand conditioning, pairing decisions and reproductive planning." },
  { id: "first-clutch", title: "Work towards my first clutch", description: "Build the knowledge and preparation needed before pairing." },
  { id: "hatchlings", title: "Get better with hatchlings", description: "Develop repeatable hatchling care and placement systems." },
  { id: "mentor", title: "Eventually become a mentor", description: "Turn practical experience into useful community contribution." },
];

export default function MentorshipIntelligence() {
  const { profile } = useAuth();
  const [goal, setGoal] = useState<MentorshipGoal>("breeding");
  const milestones = mentorshipMilestones[goal];
  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">🧠</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">TINY TITANS HOGNOSE COMPANION</span><h1>Mentorship Intelligence</h1><p>Understand where you are, what you should work on next and why TTHC recommends a particular learning pathway.</p></div><span className="kmb-status">🧭 Adaptive guidance</span></header>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">YOUR CURRENT GOAL</span><h2>What are you working towards?</h2><p>The intelligence layer changes its recommendations when your goal changes.</p></div><span className="kmb-profile-chip">🐍 {profile?.isTester ? "Contributor" : "Keeper"}</span></div><div className="kmb-goal-grid">{goals.map((item) => <button type="button" key={item.id} className={`kmb-goal ${goal === item.id ? "selected" : ""}`} onClick={() => setGoal(item.id)}><span className="kmb-goal-icon">{item.id === "genetics" ? "🧬" : item.id === "breeding" || item.id === "first-clutch" ? "🥚" : item.id === "hatchlings" ? "🐣" : item.id === "mentor" ? "🤝" : "🌡️"}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div></section>
    <MentorshipIntelligencePanel goal={goal} onNextStep={() => document.getElementById("mentorship-progression")?.scrollIntoView({ behavior: "smooth" })} />
    <section className="kmb-section" id="mentorship-progression"><div className="kmb-section-heading"><div><span className="kmb-label">NEXT STAGE</span><h2>Your suggested progression</h2><p>TTHC should help you progress through knowledge gaps rather than simply collecting completion badges.</p></div></div><div className="kmb-milestones">{milestones.map((milestone, index) => <article className="kmb-milestone" key={milestone.id}><span>{index + 1}</span><div><strong>{milestone.title}</strong><p>{milestone.description}</p></div><em>{index === 0 ? "Start here" : "Next"}</em></article>)}</div></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">HOW IT EVOLVES</span><h2>From self-assessment to real TTHC evidence</h2><p>The current evidence picker is a transparent bridge. The production intelligence layer will progressively replace manual inputs with signals already present in your account.</p></div></div><div className="kmb-track-grid"><article className="kmb-track"><div className="kmb-track-top"><span>📊</span><span className="kmb-track-score">Phase 1</span></div><h3>Evidence collection</h3><p>Use explicit tracker signals to understand what evidence exists and what is missing.</p></article><article className="kmb-track"><div className="kmb-track-top"><span>🧠</span><span className="kmb-track-score">Phase 2</span></div><h3>Gap analysis</h3><p>Compare the keeper's current evidence against the knowledge required for the selected goal.</p></article><article className="kmb-track"><div className="kmb-track-top"><span>🧭</span><span className="kmb-track-score">Phase 3</span></div><h3>Adaptive pathway</h3><p>Recommend the most useful next action, learning topic or mentor rather than repeating material already demonstrated.</p></article></div></section>
  </main>;
}
