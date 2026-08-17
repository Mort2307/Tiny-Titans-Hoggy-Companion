import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { badges, getLearningProgress, knowledgeLevel, knowledgeScore, syncTrackerAchievementCounts } from "../services/learningEngine";
import { getUserSnakes } from "../services/snakeService";
import "../styles/LearnAchievements.css";

const categoryMeta = [
  { id: "husbandry", label: "Husbandry", icon: "🐍", description: "Keeper milestones from caring for your snakes." },
  { id: "feeding", label: "Feeding", icon: "🍽️", description: "Feeding records, routines and consistency." },
  { id: "weight", label: "Weight Tracking", icon: "⚖️", description: "Growth records and long-term tracking." },
  { id: "shed", label: "Shed Tracking", icon: "💧", description: "Shed records and observation milestones." },
  { id: "observation", label: "Observation", icon: "👀", description: "Noticing patterns and recording useful observations." },
  { id: "genetics", label: "Genetics & Morphs", icon: "🧬", description: "Morph knowledge, genetics and identification." },
  { id: "challenge", label: "Titans Challenge", icon: "🧠", description: "Demonstrated learning and question-bank mastery." },
  { id: "bug", label: "Bug Hunters", icon: "🐛", description: "Confirmed reports that help make Tiny Titans better." },
  { id: "tracking", label: "Tracker Milestones", icon: "📊", description: "Long-term milestones earned by actually using your snake trackers." },
  { id: "special", label: "Special", icon: "🌟", description: "Rare milestones and special Tiny Titans achievements." },
] as const;

type CategoryId = typeof categoryMeta[number]["id"];
function badgeCategory(id: string): CategoryId {
  if (/bug/i.test(id)) return "bug";
  if (/genetic/i.test(id)) return "genetics";
  if (/streak/i.test(id)) return "special";
  if (/snake-keeper|weight-tracker|feeding-tracker|shed-tracker/i.test(id)) return "tracking";
  return "challenge";
}

export default function LearnAchievements() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(() => getLearningProgress(user?.uid));

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setProgress(getLearningProgress(null));
      return () => { cancelled = true; };
    }

    setProgress(getLearningProgress(user.uid));
    void getUserSnakes(user.uid)
      .then((snakes) => {
        if (cancelled) return;
        const counts = snakes.reduce(
          (total, snake) => ({
            snakes: total.snakes + 1,
            weightLogs: total.weightLogs + (snake.weightHistory?.length ?? 0),
            feedingLogs: total.feedingLogs + (snake.feedingHistory?.length ?? 0),
            shedLogs: total.shedLogs + (snake.shedHistory?.length ?? 0),
          }),
          { snakes: 0, weightLogs: 0, feedingLogs: 0, shedLogs: 0 },
        );
        setProgress(syncTrackerAchievementCounts(user.uid, counts));
      })
      .catch((error) => {
        console.warn("Tiny Titans: unable to sync tracker achievement counts", error);
      });

    return () => { cancelled = true; };
  }, [user?.uid]);

  const score = knowledgeScore(progress);
  const unlockedCount = progress.unlockedBadges.length;
  const totalCount = badges.length;
  const overallPercent = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;
  return (
    <main className="page-container learn-achievements-page"><section className="learn-achievements-shell">
      <Link className="learn-back" to="/account">← My Account</Link>
      <header className="knowledge-hero"><div><p className="adaptive-eyebrow">Tiny Titans · Your Progress</p><h1>🏆 Achievements &amp; Badges</h1><p>Track the things you have actually accomplished — from learning mastery to keeper milestones and confirmed contributions to Tiny Titans.</p></div><div className="knowledge-score" aria-label={`Achievement progress ${overallPercent}%`}><strong>{overallPercent}%</strong><span>{unlockedCount} / {totalCount} unlocked</span></div></header>
      <div className="knowledge-stats"><div><strong>{unlockedCount}</strong><span>Badges unlocked</span></div><div><strong>{progress.completedLessons}</strong><span>Topics mastered</span></div><div><strong>{progress.perfectBanks}</strong><span>Perfect banks</span></div><div><strong>{progress.longestStreak}</strong><span>Best streak</span></div></div>
      <section className="knowledge-progress-panel" aria-labelledby="achievement-progress-title"><div className="section-heading"><h2 id="achievement-progress-title">📈 Overall progress</h2><p>{knowledgeLevel(progress)} · {score}% overall knowledge · {progress.totalCorrect} correct answers from {progress.totalQuestions} questions.</p></div><div className="overall-progress-track" aria-hidden="true"><span style={{ width: `${overallPercent}%` }} /></div><p className="progress-caption">Achievements are earned from demonstrated progress, long-term tracker use and confirmed contributions.</p></section>
      <section className="achievement-category-grid" aria-label="Achievement categories">{categoryMeta.map((category) => { const categoryBadges = badges.filter((badge) => badgeCategory(badge.id) === category.id); const unlocked = categoryBadges.filter((badge) => progress.unlockedBadges.includes(badge.id)).length; const percent = categoryBadges.length ? Math.round((unlocked / categoryBadges.length) * 100) : 0; return <article key={category.id} className={`achievement-category-card ${categoryBadges.length ? "active" : "planned"}`}><div className="achievement-category-icon" aria-hidden="true">{category.icon}</div><div className="achievement-category-body"><div className="achievement-category-heading"><div><h2>{category.label}</h2><p>{category.description}</p></div><strong>{categoryBadges.length ? `${unlocked}/${categoryBadges.length}` : "Coming"}</strong></div>{categoryBadges.length ? <><div className="category-progress-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div><small>{percent}% complete</small></> : <small>Milestones from this area will appear here as the tracker achievement layer is connected.</small>}</div></article>; })}</section>
      <section><div className="section-heading"><h2>🏆 Your badges</h2><p>Locked badges show exactly what you are working towards.</p></div><div className="badge-grid">{badges.map((badge) => { const unlocked = progress.unlockedBadges.includes(badge.id); const current = Math.round(badge.progress?.(progress) ?? (unlocked ? 1 : 0)); const target = badge.target ?? 1; const percent = Math.min(100, Math.round((current / target) * 100)); return <article key={badge.id} className={`badge-card ${unlocked ? "unlocked" : "locked"}`}><span className="badge-icon" aria-hidden="true">{unlocked ? badge.icon : "🔒"}</span><div className="badge-card__body"><h3>{badge.name}</h3><p>{badge.description}</p>{!unlocked ? <><div className="badge-progress-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div><small>{current} / {target}</small></> : <strong>Unlocked ✓</strong>}</div></article>; })}</div></section>
    </section></main>
  );
}
