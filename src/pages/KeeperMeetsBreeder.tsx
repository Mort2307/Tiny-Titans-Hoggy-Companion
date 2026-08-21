import { useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import "../styles/KeeperMeetsBreeder.css";

type Goal = { id: string; icon: string; title: string; description: string; tags: string[] };
type MentorTrack = { title: string; icon: string; description: string; fit: string; focus: string[] };

const goals: Goal[] = [
  { id: "husbandry", icon: "🌡️", title: "Improve my husbandry", description: "Build confidence reading your snake rather than following generic rules.", tags: ["Husbandry", "Behaviour", "Enclosures"] },
  { id: "genetics", icon: "🧬", title: "Understand genetics", description: "Learn morph inheritance, hets, combinations and responsible genetic records.", tags: ["Genetics", "Morphs", "Records"] },
  { id: "breeding", icon: "🥚", title: "Prepare for breeding", description: "Understand conditioning, pairing decisions, reproductive planning and records.", tags: ["Breeding", "Conditioning", "Genetics"] },
  { id: "first-clutch", icon: "🐣", title: "Work towards my first clutch", description: "Learn the practical realities before moving from keeper to breeder.", tags: ["Breeding", "Incubation", "Hatchlings"] },
  { id: "hatchlings", icon: "🐍", title: "Get better with hatchlings", description: "Develop repeatable systems for feeding, growth, sheds and placement.", tags: ["Hatchlings", "Feeding", "Growth"] },
  { id: "mentor", icon: "🤝", title: "Eventually become a mentor", description: "Build knowledge and community experience so you can help the next keeper.", tags: ["Learning", "Community", "Mentoring"] },
];

const tracks: MentorTrack[] = [
  { title: "Keeper Foundations", icon: "🌱", description: "For keepers who want stronger observation, husbandry and record-keeping skills.", fit: "Best when your priority is becoming more confident with day-to-day keeping.", focus: ["Observation", "Husbandry", "Behaviour", "Record keeping"] },
  { title: "Genetics & Morphs", icon: "🧬", description: "For keepers who want to understand what their animals actually carry before planning pairings.", fit: "Best when genetics is the knowledge gap holding back your next step.", focus: ["Recessives", "Incomplete dominance", "Hets", "Line traits"] },
  { title: "Breeder Preparation", icon: "🥚", description: "For experienced keepers moving carefully toward responsible breeding.", fit: "Best when you already have solid husbandry and want practical breeding guidance.", focus: ["Conditioning", "Pairing", "Reproductive cycle", "Records"] },
  { title: "Hatchling to Breeder", icon: "🐣", description: "A practical route through incubation, hatchlings, feeding, growth and responsible placement.", fit: "Best for keepers preparing for the messy, brilliant bit after the eggs hatch.", focus: ["Incubation", "Hatchlings", "Feeding", "Placement"] },
];

function scoreTrack(goal: string, track: MentorTrack) {
  const map: Record<string, string[]> = {
    husbandry: ["Keeper Foundations"], genetics: ["Genetics & Morphs"], breeding: ["Breeder Preparation", "Genetics & Morphs"], "first-clutch": ["Breeder Preparation", "Hatchling to Breeder"], hatchlings: ["Hatchling to Breeder"], mentor: ["Keeper Foundations", "Breeder Preparation"],
  };
  return map[goal]?.includes(track.title) ? 94 : 67;
}

export default function KeeperMeetsBreeder() {
  const { profile } = useAuth();
  const [goal, setGoal] = useState("breeding");
  const [showAllTracks, setShowAllTracks] = useState(false);
  const selectedGoal = goals.find((item) => item.id === goal) ?? goals[0];
  const recommendations = useMemo(() => tracks.map((track) => ({ ...track, score: scoreTrack(goal, track) })).sort((a, b) => b.score - a.score), [goal]);
  const experienceLabel = profile?.isTester ? "Community contributor" : "Keeper";

  return <main className="kmb-page">
    <header className="kmb-hero">
      <div className="kmb-hero-mark">🤝</div>
      <div className="kmb-hero-copy"><span className="kmb-eyebrow">TINY TITANS HOGNOSE COMPANION</span><h1>Keeper Meets Breeder</h1><p>Real experience, shared properly. Find guidance that fits what you are actually trying to learn.</p></div>
      <span className="kmb-status">🧠 Intelligent matching</span>
    </header>

    <section className="kmb-intelligence-card">
      <div className="kmb-intelligence-icon">🧠</div>
      <div><span className="kmb-label">TTHC INTELLIGENCE</span><h2>Start with your goal, not a random mentor.</h2><p>TTHC uses your selected goal to identify the most relevant mentorship track. As the feature grows, this can incorporate learning progress, experience, interests and explicitly shared records.</p></div>
    </section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">STEP 1</span><h2>What are you trying to achieve?</h2></div><span className="kmb-profile-chip">🐍 {experienceLabel}</span></div>
      <div className="kmb-goal-grid">{goals.map((item) => <button type="button" key={item.id} className={`kmb-goal ${goal === item.id ? "selected" : ""}`} onClick={() => setGoal(item.id)}><span className="kmb-goal-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small><em>{item.tags.join(" · ")}</em></span></button>)}</div>
    </section>

    <section className="kmb-recommendation">
      <div className="kmb-recommendation-head"><div><span className="kmb-label">TTHC RECOMMENDATION</span><h2>Your strongest starting point</h2></div><span className="kmb-match">{recommendations[0].score}% match</span></div>
      <div className="kmb-primary-track"><span className="kmb-track-icon">{recommendations[0].icon}</span><div><h3>{recommendations[0].title}</h3><p>{recommendations[0].description}</p><strong>Why TTHC picked it</strong><p className="kmb-fit">{recommendations[0].fit}</p><div className="kmb-focus-list">{recommendations[0].focus.map((item) => <span key={item}>✓ {item}</span>)}</div></div></div>
    </section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">STEP 2</span><h2>Choose how you want to learn</h2><p>Mentorship will eventually connect these tracks to real breeders and experienced keepers.</p></div></div>
      <div className="kmb-track-grid">{recommendations.slice(0, showAllTracks ? recommendations.length : 3).map((track) => <article className="kmb-track" key={track.title}><div className="kmb-track-top"><span>{track.icon}</span><span className="kmb-track-score">{track.score}% fit</span></div><h3>{track.title}</h3><p>{track.description}</p><div className="kmb-focus-list">{track.focus.map((item) => <span key={item}>• {item}</span>)}</div><button type="button" className="kmb-secondary">View pathway →</button></article>)}</div>
      <button type="button" className="kmb-show-more" onClick={() => setShowAllTracks((value) => !value)}>{showAllTracks ? "Show fewer pathways" : "Show all pathways"}</button>
    </section>

    <section className="kmb-safety"><div><span className="kmb-label">HOW TTHC WILL KEEP THIS CREDIBLE</span><h2>Experience is demonstrated, not simply claimed.</h2><p>Mentor status will be based on transparent experience and contribution. TTHC will distinguish community experience from veterinary qualification and will never present a mentor as a substitute for professional veterinary care.</p></div><div className="kmb-badges"><span>🟢 Community experience</span><span>🔵 Mentor verified</span><span>⚕️ Veterinary boundary</span></div></section>

    <section className="kmb-coming"><span>🚧</span><div><strong>The mentor network is the next layer.</strong><p>This first build establishes the intelligent matching experience without inventing fake breeders or fake credentials. Real mentor profiles, applications, permissions, messaging and mentorship journeys can plug into this foundation.</p></div></section>
  </main>;
}
