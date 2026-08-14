import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { badges, getLearningProgress, knowledgeLevel, knowledgeScore } from "../services/learningEngine";
import "../styles/LearnAchievements.css";

export default function LearnAchievements() {
  const { user } = useAuth();
  const progress = getLearningProgress(user?.uid);
  const score = knowledgeScore(progress);

  return (
    <main className="page-container learn-achievements-page">
      <section className="learn-achievements-shell">
        <Link className="learn-back" to="/learn">← Back to Learn</Link>

        <header className="knowledge-hero">
          <div>
            <p className="adaptive-eyebrow">Knowledge Journey</p>
            <h1>{knowledgeLevel(progress)}</h1>
            <p>Keep learning, test yourself and build genuine knowledge one topic at a time.</p>
          </div>
          <div className="knowledge-score" aria-label={`Overall knowledge score ${score}%`}>
            <strong>{score}%</strong>
            <span>Overall Knowledge</span>
          </div>
        </header>

        <div className="knowledge-stats">
          <div><strong>{progress.xp}</strong><span>Knowledge XP</span></div>
          <div><strong>{progress.completedLessons}</strong><span>Lessons mastered</span></div>
          <div><strong>{progress.currentStreak}</strong><span>Current streak</span></div>
          <div><strong>{progress.longestStreak}</strong><span>Longest streak</span></div>
        </div>

        <section className="knowledge-progress-panel" aria-labelledby="knowledge-progress-title">
          <div className="section-heading">
            <h2 id="knowledge-progress-title">📈 Your learning progress</h2>
            <p>{progress.totalCorrect} correct answers from {progress.totalQuestions} questions · {progress.perfectTests} perfect tests</p>
          </div>
          <div className="overall-progress-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></div>
          <p className="progress-caption">{score >= 75 ? "You're demonstrating strong knowledge. Keep challenging yourself." : "Keep testing yourself — every answer helps Tiny Titans adapt your next challenge."}</p>
        </section>

        <section>
          <div className="section-heading">
            <h2>🏆 Achievements & Badges</h2>
            <p>Badges recognise demonstrated progress, consistency and understanding — not just button presses.</p>
          </div>
          <div className="badge-grid">
            {badges.map((badge) => {
              const unlocked = progress.unlockedBadges.includes(badge.id);
              const current = Math.round(badge.progress?.(progress) ?? (unlocked ? 1 : 0));
              const target = badge.target ?? 1;
              const percent = Math.min(100, Math.round((current / target) * 100));

              return (
                <article key={badge.id} className={`badge-card ${unlocked ? "unlocked" : "locked"}`}>
                  <span className="badge-icon" aria-hidden="true">{unlocked ? badge.icon : "🔒"}</span>
                  <div className="badge-card__body">
                    <h3>{badge.name}</h3>
                    <p>{badge.description}</p>
                    {!unlocked && (
                      <>
                        <div className="badge-progress-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
                        <small>{current} / {target}</small>
                      </>
                    )}
                    {unlocked && <strong>Unlocked ✓</strong>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
