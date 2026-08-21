import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import MentorshipIntelligencePanel from "../components/KeeperMeetsBreeder/MentorshipIntelligencePanel";
import { mentorshipMilestones } from "../services/mentorshipProfiles";
import { getMentorshipTrackerEvidence, type MentorshipTrackerEvidence } from "../services/mentorshipTrackerEvidence";
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
  const { user, profile } = useAuth();
  const [goal, setGoal] = useState<MentorshipGoal>("breeding");
  const [evidence, setEvidence] = useState<MentorshipTrackerEvidence | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const milestones = mentorshipMilestones[goal];

  useEffect(() => {
    if (!user) { setEvidence(null); return; }
    let cancelled = false;
    setLoadingEvidence(true);
    setError(null);
    void getMentorshipTrackerEvidence(user.uid).then((result) => { if (!cancelled) setEvidence(result); }).catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "TTHC could not analyse your tracker evidence yet."); }).finally(() => { if (!cancelled) setLoadingEvidence(false); });
    return () => { cancelled = true; };
  }, [user]);

  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">🧠</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">TINY TITANS HOGNOSE COMPANION</span><h1>Mentorship Intelligence</h1><p>Understand where you are, what you should work on next and why TTHC recommends a particular learning pathway.</p></div><span className="kmb-status">🧭 Adaptive guidance</span></header>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">YOUR CURRENT GOAL</span><h2>What are you working towards?</h2><p>The intelligence layer changes its recommendations when your goal changes.</p></div><span className="kmb-profile-chip">🐍 {profile?.isTester ? "Contributor" : "Keeper"}</span></div><div className="kmb-goal-grid">{goals.map((item) => <button type="button" key={item.id} className={`kmb-goal ${goal === item.id ? "selected" : ""}`} onClick={() => setGoal(item.id)}><span className="kmb-goal-icon">{item.id === "genetics" ? "🧬" : item.id === "breeding" || item.id === "first-clutch" ? "🥚" : item.id === "hatchlings" ? "🐣" : item.id === "mentor" ? "🤝" : "🌡️"}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div></section>
    {error && <div className="kmb-network-error">⚠️ {error}</div>}
    <MentorshipIntelligencePanel goal={goal} evidence={evidence ?? undefined} loading={loadingEvidence} onNextStep={() => document.getElementById("mentorship-progression")?.scrollIntoView({ behavior: "smooth" })} />
    {evidence && <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">EVIDENCE SNAPSHOT</span><h2>What TTHC is actually seeing</h2><p>This is derived from your existing tracker records. Nothing is copied into a second tracker.</p></div></div><div className="kmb-readiness-grid"><div className="kmb-readiness-item strong"><strong>🐍 {evidence.snakeCount} snake{evidence.snakeCount === 1 ? "" : "s"}</strong><small>Included in the current evidence analysis.</small></div><div className="kmb-readiness-item strong"><strong>⚖️ {evidence.weightRecordCount} weight records</strong><small>Used as evidence of consistent monitoring.</small></div><div className="kmb-readiness-item strong"><strong>🍽️ {evidence.feedingRecordCount} feeding records</strong><small>Used for husbandry and routine evidence.</small></div><div className="kmb-readiness-item strong"><strong>🐍 {evidence.shedRecordCount} shed records</strong><small>Used as an observation signal.</small></div><div className="kmb-readiness-item strong"><strong>🧬 {evidence.snakesWithGenetics} genetics profiles</strong><small>Used when genetics is relevant to the goal.</small></div><div className="kmb-readiness-item strong"><strong>🏠 {evidence.snakesWithEnclosures} enclosure records</strong><small>Used as husbandry evidence where relevant.</small></div></div></section>}
    <section className="kmb-section" id="mentorship-progression"><div className="kmb-section-heading"><div><span className="kmb-label">NEXT STAGE</span><h2>Your suggested progression</h2><p>TTHC should help you progress through knowledge gaps rather than simply collecting completion badges.</p></div></div><div className="kmb-milestones">{milestones.map((milestone, index) => <article className="kmb-milestone" key={milestone.id}><span>{index + 1}</span><div><strong>{milestone.title}</strong><p>{milestone.description}</p></div><em>{index === 0 ? "Start here" : "Next"}</em></article>)}</div></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">HOW IT EVOLVES</span><h2>From tracker evidence to adaptive guidance</h2><p>TTHC now reads the existing tracker data directly. Future phases can add learning completion and deeper behavioural evidence without creating duplicate records.</p></div></div></section>
  </main>;
}
