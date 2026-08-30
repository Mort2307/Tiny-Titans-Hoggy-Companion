import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { challengeTopics } from "../data/challengeTopics";
import { challengeTypeLabels, getLearningProgress, knowledgeLevel, knowledgeScore } from "../services/learningEngine";
import "../styles/TitansChallenge.css";

const challengeFormats = Object.entries(challengeTypeLabels) as Array<[keyof typeof challengeTypeLabels, { label: string; icon: string }>];

function getTopicBankCount(topic: typeof challengeTopics[number]): number {
  return new Set(topic.questions.map((question) => question.bank ?? question.difficulty)).size;
}

function getDisplayedMasteredBanks(topic: typeof challengeTopics[number], topicProgress: ReturnType<typeof getLearningProgress>["topics"][string] | undefined): number {
  const totalBanks = getTopicBankCount(topic);
  if (!topicProgress) return 0;
  if (topicProgress.completed) return totalBanks;
  const inferredFromCurrentBank = Math.max(0, Math.min(totalBanks, (topicProgress.currentBank ?? 1) - 1));
  return Math.max(topicProgress.masteredBanks.length, inferredFromCurrentBank);
}

export default function TitansChallenge() {
  const { user } = useAuth();
  const progress = getLearningProgress(user?.uid);
  const score = knowledgeScore(progress);
  const completed = challengeTopics.filter((topic) => progress.topics[topic.id]?.completed).length;
  const bankTotals = challengeTopics.reduce((totals, topic) => {
    totals.mastered += getDisplayedMasteredBanks(topic, progress.topics[topic.id]);
    totals.total += getTopicBankCount(topic);
    return totals;
  }, { mastered: 0, total: 0 });
  const overallCompletion = bankTotals.total ? Math.round((bankTotals.mastered / bankTotals.total) * 100) : 0;

  return <main className="page-container titans-challenge-page"><section className="titans-challenge-shell">
    <Link className="learn-back" to="/">← Back to Tiny Titans</Link>
    <header className="challenge-hero"><div><p className="adaptive-eyebrow">Tiny Titans Academy</p><h1>🐍 Titans Challenge</h1><p>Learn, practise and prove your hognose knowledge. Everyone starts with the foundations and earns their way to mastery.</p></div><div className="challenge-score-ring" aria-label={`Overall knowledge ${score}%`}><strong>{score}%</strong><span>Knowledge</span></div></header>
    <section className="challenge-dashboard"><div><strong>{knowledgeLevel(progress)}</strong><span>Current rank</span></div><div><strong>{progress.xp}</strong><span>Knowledge XP</span></div><div><strong>{progress.currentStreak}</strong><span>Day streak</span></div><div><strong>{overallCompletion}%</strong><span>Challenge complete</span></div></section>
    <section className="challenge-progress-card"><div className="challenge-section-heading"><div><p className="adaptive-eyebrow">Your journey</p><h2>Choose a topic</h2><p>{bankTotals.mastered}/{bankTotals.total} learning banks mastered across the full challenge.</p></div><Link to="/learn/achievements">🏆 Achievements & Badges</Link></div><div className="challenge-topic-list">{challengeTopics.map((topic) => { const tp = progress.topics[topic.id]; const count = getTopicBankCount(topic); const banks = getDisplayedMasteredBanks(topic, tp); const mastery = count ? Math.round((banks / count) * 100) : 0; return <Link className="challenge-topic-row" key={topic.id} to={`/challenge/topic/${topic.id}`}><span className="challenge-topic-icon">{topic.icon}</span><span className="challenge-topic-copy"><strong>{topic.title}</strong><small>{topic.category} · {tp?.completed || banks === count ? "Mastered" : mastery ? `${mastery}% demonstrated` : "Start at Foundation"} · {banks}/{count} banks</small></span><span className="challenge-topic-bar"><i style={{ width: `${mastery}%` }} /></span><b>{mastery}%</b><span aria-hidden="true">→</span></Link>; })}</div><div className="challenge-bank-summary"><span><strong>{bankTotals.mastered}</strong> banks mastered</span><span><strong>{bankTotals.total}</strong> total banks</span><span><strong>{overallCompletion}%</strong> overall completion</span></div></section>
    <section className="challenge-progress-card"><div className="challenge-section-heading"><div><p className="adaptive-eyebrow">Challenge formats</p><h2>How you'll prove what you know</h2></div></div><div className="challenge-format-grid">{challengeFormats.map(([id, format]) => <div className="challenge-format-card" key={id}><span>{format.icon}</span><strong>{format.label}</strong><small>{id === "knowledge" ? "Core concept checks." : "Interactive activity introduced as the topic bank reaches it."}</small></div>)}</div></section>
    <section className="challenge-how"><div><span>🌱</span><strong>Foundation</strong><p>Start with the husbandry and biology everyone should know.</p></div><div><span>🧠</span><strong>Understanding</strong><p>Go beyond facts and learn why things happen.</p></div><div><span>🎯</span><strong>Application</strong><p>Use your knowledge in realistic keeper scenarios.</p></div><div><span>🔬</span><strong>Reasoning</strong><p>Tackle harder problems without unnecessary jargon.</p></div><div><span>🏆</span><strong>Mastery</strong><p>Reach 100% across every learning bank to complete the challenge.</p></div></section>
    <section className="challenge-note"><strong>💡 No shortcuts</strong><p>Everyone follows the same learning path. Experience doesn't skip the foundations — it simply means you may master them faster. Missed concepts come back as targeted reinforcement, while new challenges avoid unnecessary repetition.</p></section>
  </section></main>;
}