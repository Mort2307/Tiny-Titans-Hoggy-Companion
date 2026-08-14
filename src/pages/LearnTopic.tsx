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
  ["how", "HOW?", "How does it work?"] ,
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
    setAnswers([]);
    setIndex(0);
    setSelected(null);
    setFinished(false);
    setStarted(true);
  };

  const next = () => {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];
    if (index >= questions.length - 1) {
      const correct = questions.reduce((sum, question, questionIndex) => sum + ((nextAnswers[questionIndex] ?? -1) === question.correctIndex ? 1 : 0), 0);
      recordTest(user?.uid, topic, questions.length ? correct / questions.length : 0, questions.length);
      setAnswers(nextAnswers);
      setFinished(true);
      return;
    }
    setAnswers(nextAnswers);
    setIndex(index + 1);
    setSelected(null);
  };

  if (started && finished) {
    const finalCorrect = questions.reduce((sum, question, questionIndex) => sum + ((answers[questionIndex] ?? -1) === question.correctIndex ? 1 : 0), 0);
    const score = questions.length ? Math.round((finalCorrect / questions.length) * 100) : 0;
    const updated = getLearningProgress(user?.uid);
    const topicProgress = updated.topics[topic.id];
    const missed = questions.filter((question, questionIndex) => (answers[questionIndex] ?? -1) !== question.correctIndex);

    return (
      <main className="page-container learn-topic-page"><section className="learn-topic-shell">
        <Link className="learn-back" to="/learn">← Back to Learn</Link>
        <div className="test-result">
          <span className="test-result__icon">{score >= 80 ? "🏆" : "🧠"}</span>
          <h1>{score >= 80 ? "Brilliant work!" : "Good effort — let's build on it."}</h1>
          <p className="test-result__score">{score}%</p>
          <p>{finalCorrect} of {questions.length} correct.</p>
          <p>Topic mastery: <strong>{topicProgress?.mastery ?? 0}%</strong> · Best test: <strong>{Math.round((topicProgress?.bestScore ?? 0) * 100)}%</strong></p>
          <p>Knowledge level: <strong>{knowledgeLevel(updated)}</strong> · Overall score: <strong>{knowledgeScore(updated)}%</strong></p>
          {missed.length > 0 && <section className="test-review" aria-labelledby="test-review-title"><h2 id="test-review-title">🧠 Learn from your answers</h2><p>These explanations teach the idea behind the answer, so getting one wrong still helps you improve.</p><div className="test-review__list">{missed.map((question) => <article key={question.id} className="test-review__item"><h3>{question.prompt}</h3><p><strong>Correct answer:</strong> {question.options[question.correctIndex]}</p><p>{question.explanation}</p><span>Difficulty {question.difficulty}</span></article>)}</div></section>}
          {missed.length === 0 && <p className="test-result__mastery-note">Perfect! You've demonstrated every question in this challenge. Your next challenge can become harder as your mastery grows.</p>}
          <div className="test-result__actions"><button type="button" onClick={startTest}>Try Again</button><button type="button" onClick={() => navigate("/learn/achievements")}>View Achievements</button></div>
        </div>
      </section></main>
    );
  }

  if (started) {
    const question = questions[index];
    return (
      <main className="page-container learn-topic-page"><section className="learn-topic-shell">
        <div className="test-header"><Link to={`/learn/topic/${topic.id}`}>← Lesson</Link><span>Question {index + 1} of {questions.length}</span></div>
        <div className="question-card">
          <p className="adaptive-eyebrow">Tiny Titan Challenge · Difficulty {question.difficulty}</p>
          <h1>{question.prompt}</h1>
          <div className="question-options">{question.options.map((option, optionIndex) => <button key={`${question.id}-${optionIndex}`} type="button" className={selected === optionIndex ? "selected" : ""} aria-pressed={selected === optionIndex} onClick={() => setSelected(optionIndex)}>{option}</button>)}</div>
          {selected !== null && <div className="answer-feedback"><strong>{selected === question.correctIndex ? "Correct! 🎉" : "Not quite — keep learning."}</strong><p>{question.explanation}</p></div>}
          <button className="primary-action" type="button" disabled={selected === null} onClick={next}>{index === questions.length - 1 ? "Finish Mini Test" : "Next Question →"}</button>
        </div>
      </section></main>
    );
  }

  const difficulty = getDifficulty(progress, topic);
  const topicMastery = progress.topics[topic.id]?.mastery ?? 0;

  return (
    <main className="page-container learn-topic-page"><section className="learn-topic-shell">
      <Link className="learn-back" to="/learn">← Back to Learn</Link>
      <header className="lesson-hero"><span>{topic.icon}</span><div><p className="adaptive-eyebrow">{topic.category} · Learn & Explore</p><h1>{topic.title}</h1><p>{topic.summary}</p></div></header>
      <div className="lesson-progress"><strong>Your topic mastery: {topicMastery}%</strong><span>Challenge difficulty: {difficulty}/5</span></div>
      <section className="explore-intro"><h2>Explore this topic</h2><p>Tap through the questions you naturally want answered — <strong>who, what, why, when, how</strong> and real examples — then test what you've learned.</p></section>
      <section className="explore-grid">{sectionLabels.map(([key, label, subtitle]) => topic.sections[key] ? <article key={key} className="explore-card"><span className="explore-card__label">{label}</span><h2>{subtitle}</h2><p>{topic.sections[key]}</p></article> : null)}</section>
      <section className="lesson-cta"><div><p className="adaptive-eyebrow">Ready to prove what you learned?</p><h2>Take the Tiny Titan Mini Test 🧠</h2><p>Questions start simple and adapt as your demonstrated knowledge improves. Every answer teaches you something, and your results contribute to your overall knowledge score.</p></div><button type="button" onClick={startTest}>Start Mini Test</button></section>
    </section></main>
  );
}
