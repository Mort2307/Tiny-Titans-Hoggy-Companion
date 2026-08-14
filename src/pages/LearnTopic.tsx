import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLearningTopic } from "../data/learningTopics";
import { getDifficulty, getLearningProgress, knowledgeLevel, knowledgeScore, recordTest, selectQuestions } from "../services/learningEngine";
import type { LearningSectionKey, QuizQuestion } from "../types/Learning";
import "../styles/LearnTopic.css";

const sectionLabels: Array<[LearningSectionKey, string, string]> = [
  ["who", "WHO?", "Who does this apply to?"],
  ["what", "WHAT?", "What does it actually mean?"],
  ["why", "WHY?", "Why does it happen or matter?"],
  ["when", "WHEN?", "When would you see it?"],
  ["how", "HOW?", "How does it work?"],
  ["examples", "REAL EXAMPLES", "What does this look like in real life?"]
];

export default function LearnTopic() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const topic = getLearningTopic(id);
  const progress = useMemo(() => getLearningProgress(user?.uid), [user?.uid]);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  if (!topic) return <main className="page-container"><section className="welcome-card"><h1>Lesson not found</h1><Link to="/learn">Back to Learn</Link></section></main>;

  const startTest = () => {
    const current = getLearningProgress(user?.uid);
    setQuestions(selectQuestions(topic, current, Math.min(5, topic.questions.length)));
    setAnswers([]); setIndex(0); setSelected(null); setFinished(false); setStarted(true);
  };

  const answer = (choice: number) => setSelected(choice);

  const next = () => {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];
    if (index >= questions.length - 1) {
      const correct = questions.reduce((sum, question, questionIndex) => sum + ((nextAnswers[questionIndex] ?? -1) === question.correctIndex ? 1 : 0), 0);
      const score = questions.length ? correct / questions.length : 0;
      recordTest(user?.uid, topic, score, questions.length);
      setAnswers(nextAnswers); setFinished(true); return;
    }
    setAnswers(nextAnswers); setIndex(index + 1); setSelected(null);
  };

  if (started && finished) {
    const finalCorrect = questions.reduce((sum, question, questionIndex) => sum + ((answers[questionIndex] ?? -1) === question.correctIndex ? 1 : 0), 0);
    const score = questions.length ? Math.round((finalCorrect / questions.length) * 100) : 0;
    const updated = getLearningProgress(user?.uid);
    return <main className="page-container learn-topic-page"><section className="learn-topic-shell"><Link className="learn-back" to="/learn">← Back to Learn</Link><div className="test-result"><span className="test-result__icon">{score >= 80 ? "🏆" : "🧠"}</span><h1>{score >= 80 ? "Brilliant work!" : "Good effort — let's build on it."}</h1><p className="test-result__score">{score}%</p><p>{finalCorrect} of {questions.length} correct.</p><p>Knowledge level: <strong>{knowledgeLevel(updated)}</strong> · Overall score: <strong>{knowledgeScore(updated)}%</strong></p><div className="test-result__actions"><button type="button" onClick={startTest}>Try Again</button><button type="button" onClick={() => navigate("/learn/achievements")}>View Achievements</button></div></div></section></main>;
  }

  if (started) {
    const question = questions[index];
    return <main className="page-container learn-topic-page"><section className="learn-topic-shell"><div className="test-header"><Link to={`/learn/topic/${topic.id}`}>← Lesson</Link><span>Question {index + 1} of {questions.length}</span></div><div className="question-card"><p className="adaptive-eyebrow">Tiny Titan Challenge · Difficulty {question.difficulty}</p><h1>{question.prompt}</h1><div className="question-options">{question.options.map((option, optionIndex) => <button key={option} type="button" className={selected === optionIndex ? "selected" : ""} onClick={() => answer(optionIndex)}>{option}</button>)}</div>{selected !== null && <div className="answer-feedback"><strong>{selected === question.correctIndex ? "Correct! 🎉" : "Not quite — keep learning."}</strong><p>{question.explanation}</p></div>}<button className="primary-action" type="button" disabled={selected === null} onClick={next}>{index === questions.length - 1 ? "Finish Test" : "Next Question →"}</button></div></section></main>;
  }

  const difficulty = getDifficulty(progress, topic);
  return <main className="page-container learn-topic-page"><section className="learn-topic-shell"><Link className="learn-back" to="/learn">← Back to Learn</Link><header className="lesson-hero"><span>{topic.icon}</span><div><p className="adaptive-eyebrow">{topic.category} · Adaptive lesson</p><h1>{topic.title}</h1><p>{topic.summary}</p></div></header><div className="lesson-progress"><strong>Your topic mastery: {progress.topics[topic.id]?.mastery ?? 0}%</strong><span>Current challenge difficulty: {difficulty}/5</span></div><section className="explore-grid">{sectionLabels.map(([key, label, subtitle]) => topic.sections[key] ? <article key={key} className="explore-card"><span className="explore-card__label">{label}</span><h2>{subtitle}</h2><p>{topic.sections[key]}</p></article> : null)}</section><section className="lesson-cta"><div><p className="adaptive-eyebrow">Ready to check what you learned?</p><h2>Take the Tiny Titan Challenge</h2><p>The test starts simply, then adapts as your knowledge improves. Wrong answers teach you why before you move on.</p></div><button type="button" onClick={startTest}>Start Mini Test 🧠</button></section></section></main>;
}
