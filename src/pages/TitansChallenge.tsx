import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { learningTopics } from "../data/learningTopics";
import { getLearningProgress, knowledgeLevel, knowledgeScore } from "../services/learningEngine";
import "../styles/TitansChallenge.css";

export default function TitansChallenge() {
  const { user } = useAuth();
  const progress = getLearningProgress(user?.uid);
  const score = knowledgeScore(progress);
  const completed = learningTopics.filter((topic) => progress.topics[topic.id]?.completed).length;

  return (
    <main className="page-container titans-challenge-page">
      <section className="titans-challenge-shell">
        <Link className="learn-back" to="/">← Back to Tiny Titans</Link>
        <header className="challenge-hero">
          <div>
            <p className="adaptive-eyebrow">Tiny Titans Academy</p>
            <h1>🐍 Titans Challenge</h1>
            <p>Learn, practise and prove your hognose knowledge. Everyone starts with the foundations and earns their way to mastery.</p>
          </div>
          <div className="challenge-score-ring" aria-label={`Overall knowledge ${score}%`}>
            <strong>{score}%</strong><span>Knowledge</span>
          </div>
        </header>

        <section className="challenge-dashboard">
          <div><strong>{knowledgeLevel(progress)}</strong><span>Current rank</span></div>
          <div><strong>{progress.xp}</strong><span>Knowledge XP</span></div>
          <div><strong>{progress.currentStreak}</strong><span>Day streak</span></div>
          <div><strong>{completed}/{learningTopics.length}</strong><span>Topics mastered</span></div>
        </section>

        <section className="challenge-progress-card">
          <div className="challenge-section-heading"><div><p className="adaptive-eyebrow">Your journey</p><h2>Progress across your topics</h2></div><Link to="/learn/achievements">🏆 Achievements & Badges</Link></div>
          <div className="challenge-topic-list">
            {learningTopics.map((topic) => {
              const topicProgress = progress.topics[topic.id];
              const mastery = topicProgress?.mastery ?? 0;
              return <Link className="challenge-topic-row" key={topic.id} to={`/learn/topic/${topic.id}`}>
                <span className="challenge-topic-icon">{topic.icon}</span>
                <span className="challenge-topic-copy"><strong>{topic.title}</strong><small>{topic.category} · {topicProgress?.completed ? "Mastered" : mastery ? `${mastery}% demonstrated` : "Start at Foundation"}</small></span>
                <span className="challenge-topic-bar"><i style={{ width: `${mastery}%` }} /></span><b>{mastery}%</b><span aria-hidden="true">→</span>
              </Link>;
            })}
          </div>
        </section>

        <section className="challenge-how">
          <div><span>🌱</span><strong>Foundation</strong><p>Start with the husbandry and biology everyone should know.</p></div>
          <div><span>🧠</span><strong>Understanding</strong><p>Go beyond facts and learn why things happen.</p></div>
          <div><span>🎯</span><strong>Application</strong><p>Use your knowledge in realistic keeper scenarios.</p></div>
          <div><span>🔬</span><strong>Reasoning</strong><p>Tackle harder problems without unnecessary jargon.</p></div>
          <div><span>🏆</span><strong>Mastery</strong><p>Reach 100% and prove you've genuinely learned the topic.</p></div>
        </section>

        <section className="challenge-note"><strong>💡 No shortcuts</strong><p>Everyone follows the same learning path. Experience doesn't skip the foundations — it simply means you may master them faster. Missed concepts come back as targeted reinforcement, while new challenges avoid unnecessary repetition.</p></section>
      </section>
    </main>
  );
}
