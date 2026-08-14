import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLearningProgress, knowledgeLevel, knowledgeScore } from "../services/learningEngine";
import { learningTopics } from "../data/learningTopics";
import "../styles/AdaptiveLearningHub.css";

type LearningView = { title: string; intro: string };
const content: Record<"explorer" | "learner" | "student" | "adult", LearningView> = {
  explorer: { title: "Explore the world of hognoses", intro: "Friendly explanations, simple words and short challenges that make reptile biology easier to understand." },
  learner: { title: "Build your reptile knowledge", intro: "Explore the who, what, why, when and how — then prove what you learned with a mini test." },
  student: { title: "Investigate reptile biology", intro: "Build understanding with scientific terminology, reasoning, examples and increasingly difficult challenges." },
  adult: { title: "Deepen your reptile knowledge", intro: "Detailed husbandry, genetics and evidence-led learning with adaptive tests that increase in difficulty as you improve." },
};

export default function AdaptiveLearningHub() {
  const { profile, user } = useAuth();
  const level = profile?.learningLevel ?? (profile?.category === "child" ? "learner" : "adult");
  const view = content[level];
  const experience = profile?.experienceLevel === "pro" ? "Advanced" : profile?.experienceLevel === "intermediate" ? "Intermediate" : "Beginner";
  const progress = getLearningProgress(user?.uid);
  const score = knowledgeScore(progress);

  return <main className="page-container adaptive-page"><section className="adaptive-shell"><header className="adaptive-hero"><div><p className="adaptive-eyebrow">Adaptive Learning</p><h1>{view.title}</h1><p>{view.intro}</p></div><span>{experience}</span></header><section className="adaptive-progress-card"><div><p className="adaptive-eyebrow">Your Knowledge Journey</p><h2>{knowledgeLevel(progress)}</h2><p>Overall knowledge score: <strong>{score}%</strong></p></div><div className="adaptive-progress-bar"><span style={{ width: `${score}%` }} /></div><Link to="/learn/achievements">🏆 Achievements & Badges →</Link></section><section className="adaptive-grid">{learningTopics.map((topic) => <article className="adaptive-card" key={topic.id}><span>{topic.icon}</span><p className="adaptive-eyebrow">{topic.category}</p><h2>{topic.title}</h2><p>{topic.summary}</p><Link to={`/learn/topic/${topic.id}`}>Explore →</Link></article>)}</section><section className="adaptive-note"><strong>How Learn works</strong><p>Explore a topic through <strong>WHO, WHAT, WHY, WHEN, HOW</strong> and real examples. Then take the Tiny Titan Challenge. Tests start simply and become harder as you demonstrate understanding. Wrong answers explain the concept so the test itself becomes part of learning.</p></section></section></main>;
}
