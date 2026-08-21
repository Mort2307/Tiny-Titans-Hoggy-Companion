import { useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { scoreMentor, type MentorshipGoal, type MentorSpeciality } from "../services/mentorshipIntelligence";
import "../styles/KeeperMeetsBreeder.css";

type Goal = { id: MentorshipGoal; icon: string; title: string; description: string; tags: string[] };
type MentorTrack = { title: string; icon: string; description: string; fit: string; focus: string[]; specialities: MentorSpeciality[] };

const goals: Goal[] = [
  { id: "husbandry", icon: "🌡️", title: "Improve my husbandry", description: "Build confidence reading your snake rather than following generic rules.", tags: ["Husbandry", "Behaviour", "Enclosures"] },
  { id: "genetics", icon: "🧬", title: "Understand genetics", description: "Learn morph inheritance, hets, combinations and responsible genetic records.", tags: ["Genetics", "Morphs", "Records"] },
  { id: "breeding", icon: "🥚", title: "Prepare for breeding", description: "Understand conditioning, pairing decisions, reproductive planning and records.", tags: ["Breeding", "Conditioning", "Genetics"] },
  { id: "first-clutch", icon: "🐣", title: "Work towards my first clutch", description: "Learn the practical realities before moving from keeper to breeder.", tags: ["Breeding", "Incubation", "Hatchlings"] },
  { id: "hatchlings", icon: "🐍", title: "Get better with hatchlings", description: "Develop repeatable systems for feeding, growth, sheds and placement.", tags: ["Hatchlings", "Feeding", "Growth"] },
  { id: "mentor", icon: "🤝", title: "Eventually become a mentor", description: "Build knowledge and community experience so you can help the next keeper.", tags: ["Learning", "Community", "Mentoring"] },
];

const tracks: MentorTrack[] = [
  { title: "Keeper Foundations", icon: "🌱", description: "For keepers who want stronger observation, husbandry and record-keeping skills.", fit: "Best when your priority is becoming more confident with day-to-day keeping.", focus: ["Observation", "Husbandry", "Behaviour", "Record keeping"], specialities: ["husbandry", "behaviour", "enclosures", "records"] },
  { title: "Genetics & Morphs", icon: "🧬", description: "For keepers who want to understand what their animals actually carry before planning pairings.", fit: "Best when genetics is the knowledge gap holding back your next step.", focus: ["Recessives", "Incomplete dominance", "Hets", "Line traits"], specialities: ["genetics", "records"] },
  { title: "Breeder Preparation", icon: "🥚", description: "For experienced keepers moving carefully toward responsible breeding.", fit: "Best when you already have solid husbandry and want practical breeding guidance.", focus: ["Conditioning", "Pairing", "Reproductive cycle", "Records"], specialities: ["breeding", "genetics", "records"] },
  { title: "Hatchling to Breeder", icon: "🐣", description: "A practical route through incubation, hatchlings, feeding, growth and responsible placement.", fit: "Best for keepers preparing for the messy, brilliant bit after the eggs hatch.", focus: ["Incubation", "Hatchlings", "Feeding", "Placement"], specialities: ["hatchlings", "breeding", "husbandry"] },
];

export default function KeeperMeetsBreeder() {
  const { profile } = useAuth();
  const [goal, setGoal] = useState<MentorshipGoal>("breeding");
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const selectedGoal = goals.find((item) => item.id === goal) ?? goals[0];
  const recommendations = useMemo(() => tracks.map((track) => {
    const result = scoreMentor(goal, { goals: [goal], specialities: track.specialities });
    return { ...track, score: Math.min(99, result.score), signals: result.signals };
  }).sort((a, b) => b.score - a.score), [goal]);
  const experienceLabel = profile?.isTester ? "Community contributor" : "Keeper";
  const primary = recommendations[0];

  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">🤝</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">TINY TITANS HOGNOSE COMPANION</span><h1>Keeper Meets Breeder</h1><p>Real experience, shared properly. Find guidance that fits what you are actually trying to learn.</p></div><span className="kmb-status">🧠 Intelligent matching</span></header>

    <section className="kmb-intelligence-card"><div className="kmb-intelligence-icon">🧠</div><div><span className="kmb-label">TTHC INTELLIGENCE</span><h2>Start with your goal, not a random mentor.</h2><p>TTHC explains why a pathway is recommended. Later, the same engine can incorporate learning progress, experience, interests and records you explicitly choose to share.</p><button type="button" className="kmb-secondary" onClick={() => setShowHowItWorks((value) => !value)}>{showHowItWorks ? "Hide how matching works" : "How does matching work?"}</button>{showHowItWorks && <div className="kmb-how"><span>1</span><p><strong>Goal alignment</strong> — your chosen goal defines the knowledge areas that matter.</p><span>2</span><p><strong>Experience relevance</strong> — practical experience can strengthen a match where appropriate.</p><span>3</span><p><strong>Verification</strong> — verified mentor status is a trust signal, not proof of universal expertise.</p></div>}</div></section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">STEP 1</span><h2>What are you trying to achieve?</h2></div><span className="kmb-profile-chip">🐍 {experienceLabel}</span></div><div className="kmb-goal-grid">{goals.map((item) => <button type="button" key={item.id} className={`kmb-goal ${goal === item.id ? "selected" : ""}`} onClick={() => setGoal(item.id)}><span className="kmb-goal-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small><em>{item.tags.join(" · ")}</em></span></button>)}</div></section>

    <section className="kmb-recommendation"><div className="kmb-recommendation-head"><div><span className="kmb-label">TTHC RECOMMENDATION</span><h2>Your strongest starting point</h2><p className="kmb-selected-goal">Because you selected <strong>{selectedGoal.title.toLowerCase()}</strong>.</p></div><span className="kmb-match">{primary.score}% match</span></div><div className="kmb-primary-track"><span className="kmb-track-icon">{primary.icon}</span><div><h3>{primary.title}</h3><p>{primary.description}</p><strong>Why TTHC picked it</strong><div className="kmb-reason-list">{primary.signals.length ? primary.signals.slice(0, 3).map((signal) => <span key={signal.label}>✓ <strong>{signal.label}</strong> — {signal.reason}</span>) : <span>✓ This pathway covers the core knowledge areas associated with your goal.</span>}</div><div className="kmb-focus-list">{primary.focus.map((item) => <span key={item}>✓ {item}</span>)}</div></div></div><p className="kmb-score-caveat">Match score indicates relevance, not mentor quality or veterinary authority.</p></section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">STEP 2</span><h2>Choose how you want to learn</h2><p>Pathways will eventually connect to real breeders and experienced keepers, with transparent mentor profiles and permissions.</p></div></div><div className="kmb-track-grid">{recommendations.slice(0, showAllTracks ? recommendations.length : 3).map((track) => <article className="kmb-track" key={track.title}><div className="kmb-track-top"><span>{track.icon}</span><span className="kmb-track-score">{track.score}% fit</span></div><h3>{track.title}</h3><p>{track.description}</p><div className="kmb-focus-list">{track.focus.map((item) => <span key={item}>• {item}</span>)}</div><button type="button" className="kmb-secondary" onClick={() => setGoal(goal)}>View pathway →</button></article>)}</div><button type="button" className="kmb-show-more" onClick={() => setShowAllTracks((value) => !value)}>{showAllTracks ? "Show fewer pathways" : "Show all pathways"}</button></section>

    <section className="kmb-safety"><div><span className="kmb-label">HOW TTHC WILL KEEP THIS CREDIBLE</span><h2>Experience is demonstrated, not simply claimed.</h2><p>Mentor status will be based on transparent experience and contribution. TTHC will distinguish community experience from veterinary qualification and will never present a mentor as a substitute for professional veterinary care.</p></div><div className="kmb-badges"><span>🟢 Community experience</span><span>🔵 Mentor verified</span><span>⚕️ Veterinary boundary</span></div></section>
    <section className="kmb-coming"><span>🚧</span><div><strong>The mentor network is the next layer.</strong><p>This foundation is ready for real mentor applications, profile verification, permissions, messaging, mentorship journeys and community contribution without inventing credentials today.</p></div></section>
  </main>;
}
