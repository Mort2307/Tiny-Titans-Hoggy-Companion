import { useMemo, useState } from "react";
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
  const [selfAssessment, setSelfAssessment] = useState({ records: false, learning: false, experience: false, enclosure: false });
  const milestones = mentorshipMilestones[goal];
  const completed = Object.values(selfAssessment).filter(Boolean).length;
  const assessment = useMemo(() => ({
    records: selfAssessment.records,
    learning: selfAssessment.learning,
    experience: selfAssessment.experience,
    enclosure: selfAssessment.enclosure,
  }), [selfAssessment]);
  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">🧠</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">TINY TITANS HOGNOSE COMPANION</span><h1>Mentorship Intelligence</h1><p>Understand where you are, what you should work on next and why TTHC recommends a particular learning pathway.</p></div><span className="kmb-status">🧭 Adaptive guidance</span></header>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">YOUR CURRENT GOAL</span><h2>What are you working towards?</h2><p>The intelligence layer changes its recommendations when your goal changes.</p></div><span className="kmb-profile-chip">🐍 {profile?.isTester ? "Contributor" : "Keeper"}</span></div><div className="kmb-goal-grid">{goals.map((item) => <button type="button" key={item.id} className={`kmb-goal ${goal === item.id ? "selected" : ""}`} onClick={() => setGoal(item.id)}><span className="kmb-goal-icon">{item.id === "genetics" ? "🧬" : item.id === "breeding" || item.id === "first-clutch" ? "🥚" : item.id === "hatchlings" ? "🐣" : item.id === "mentor" ? "🤝" : "🌡️"}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div></section>
    <MentorshipIntelligencePanel goal={goal} learningProgress={completed * 20} experienceYears={selfAssessment.experience ? 2 : 0} recordCount={selfAssessment.records ? 12 : 0} hasEnclosureData={selfAssessment.enclosure} onNextStep={() => document.getElementById("mentorship-self-assessment")?.scrollIntoView({ behavior: "smooth" })} />
    <section className="kmb-section" id="mentorship-self-assessment"><div className="kmb-section-heading"><div><span className="kmb-label">TEMPORARY INPUT LAYER</span><h2>Tell TTHC what you've already demonstrated</h2><p>These switches are deliberately temporary. Once connected, TTHC will calculate these signals from your existing tracker and learning data.</p></div></div><div className="kmb-sharing"><div className="kmb-record-grid">{([['records','I keep useful records'],['learning','I have completed relevant learning'],['experience','I have practical experience'],['enclosure','My enclosure data is recorded']] as const).map(([key,label]) => <label className={`kmb-record ${selfAssessment[key] ? "selected" : ""}`} key={key}><input type="checkbox" checked={selfAssessment[key]} onChange={() => setSelfAssessment((current) => ({ ...current, [key]: !current[key] }))} /><span>{label}</span></label>)}</div></div></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">NEXT STAGE</span><h2>Your suggested progression</h2><p>TTHC should help you progress through knowledge gaps rather than simply collecting completion badges.</p></div></div><div className="kmb-milestones">{milestones.map((milestone, index) => <article className="kmb-milestone" key={milestone.id}><span>{index + 1}</span><div><strong>{milestone.title}</strong><p>{milestone.description}</p></div><em>{index === 0 ? "Start here" : "Next"}</em></article>)}</div></section>
  </main>;
}
