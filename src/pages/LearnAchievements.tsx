import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { badges, getLearningProgress, knowledgeLevel, knowledgeScore } from "../services/learningEngine";
import "../styles/LearnAchievements.css";

export default function LearnAchievements() {
  const { user } = useAuth();
  const progress = getLearningProgress(user?.uid);
  const score = knowledgeScore(progress);
  return <main className="page-container learn-achievements-page"><section className="learn-achievements-shell"><Link className="learn-back" to="/learn">← Back to Learn</Link><header className="knowledge-hero"><div><p className="adaptive-eyebrow">Knowledge Journey</p><h1>{knowledgeLevel(progress)}</h1><p>Keep learning, test yourself and build genuine knowledge one topic at a time.</p></div><div className="knowledge-score"><strong>{score}%</strong><span>Overall Knowledge</span></div></header><div className="knowledge-stats"><div><strong>{progress.xp}</strong><span>Knowledge XP</span></div><div><strong>{progress.completedLessons}</strong><span>Lessons mastered</span></div><div><strong>{progress.perfectTests}</strong><span>Perfect tests</span></div><div><strong>{progress.unlockedBadges.length}</strong><span>Badges earned</span></div></div><section><div className="section-heading"><h2>🏆 Achievements & Badges</h2><p>Some badges reward progress. Others recognise demonstrated understanding.</p></div><div className="badge-grid">{badges.map((badge) => { const unlocked = progress.unlockedBadges.includes(badge.id); return <article key={badge.id} className={`badge-card ${unlocked ? "unlocked" : "locked"}`}><span className="badge-icon">{unlocked ? badge.icon : "🔒"}</span><div><h3>{badge.name}</h3><p>{badge.description}</p>{unlocked && <strong>Unlocked ✓</strong>}</div></article>; })}</div></section></section></main>;
}
