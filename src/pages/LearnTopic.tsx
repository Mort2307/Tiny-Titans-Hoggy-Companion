import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLearningTopic } from "../data/learningTopics";
import { getCurrentBank, getLanguageLevel, getLearningProgress, getDifficulty, knowledgeLevel, knowledgeScore, presentQuestion, recordTest, selectQuestions, setLearnerProfile } from "../services/learningEngine";
import type { LanguageLevel, LearningSectionKey, QuizQuestion } from "../types/Learning";
import "../styles/LearnTopic.css";

const sectionLabels: Array<[LearningSectionKey, string, string]> = [["who", "WHO?", "Who does this apply to?"], ["what", "WHAT?", "What does it actually mean?"], ["why", "WHY?", "Why does it happen or matter?"], ["when", "WHEN?", "When would you see it?"], ["how", "HOW?", "How does it work?"], ["examples", "REAL EXAMPLES", "What does this look like in real life?"]];
const languageOptions: Array<[LanguageLevel, string, string]> = [["young", "Young Learner", "Simple words, visual explanations and friendly examples."], ["teen", "Teen Learner", "Clear language with gradually introduced scientific vocabulary."], ["keeper", "Keeper", "Normal keeper language with scientific terms explained."], ["advanced", "Advanced Keeper", "Technical language and deeper biological reasoning."]];

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
  const [profileOpen, setProfileOpen] = useState(!progress.learnerProfile.profileSet);

  if (!topic) return <main className="page-container"><section className="welcome-card"><h1>Lesson not found</h1><Link to="/learn">Back to Learn</Link></section></main>;

  const startTest = () => {
    const current = getLearningProgress(user?.uid);
    setQuestions(selectQuestions(topic, current, 5));
    setAnswers([]); setIndex(0); setSelected(null); setFinished(false); setStarted(true);
  };

  const next = () => {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];
    if (index >= questions.length - 1) {
      const correct = questions.reduce((sum, question, questionIndex) => sum + ((nextAnswers[questionIndex] ?? -1) === question.correctIndex ? 1 : 0), 0);
      recordTest(user?.uid, topic, questions.length ? correct / questions.length : 0, questions.length, questions.map((question) => question.id));
      setAnswers(nextAnswers); setFinished(true); return;
    }
    setAnswers(nextAnswers); setIndex(index + 1); setSelected(null);
  };

  if (started && finished) {
    const finalCorrect = questions.reduce((sum, question, questionIndex) => sum + ((answers[questionIndex] ?? -1) === question.correctIndex ? 1 : 0), 0);
    const score = questions.length ? Math.round((finalCorrect / questions.length) * 100) : 0;
    const updated = getLearningProgress(user?.uid);
    const topicProgress = updated.topics[topic.id];
    const missed = questions.filter((question, questionIndex) => (answers[questionIndex] ?? -1) !== question.correctIndex);
    const mastered = topicProgress?.masteredBanks ?? [];
    const currentBank = topicProgress?.currentBank ?? 1;
    return <main className="page-container learn-topic-page"><section className="learn-topic-shell">
      <Link className="learn-back" to="/learn">← Back to Learn</Link>
      <div className="test-result">
        <span className="test-result__icon">{score === 100 ? "🏆" : "🧠"}</span>
        <h1>{score === 100 ? "Bank mastered!" : "Keep building — you're learning."}</h1>
        <p className="test-result__score">{score}%</p>
        <p>{finalCorrect} of {questions.length} correct.</p>
        <p>Topic mastery: <strong>{topicProgress?.mastery ?? 0}%</strong> · Current bank: <strong>{currentBank}</strong> · Banks mastered: <strong>{mastered.length}</strong></p>
        <p>Knowledge level: <strong>{knowledgeLevel(updated)}</strong> · Overall score: <strong>{knowledgeScore(updated)}%</strong> · XP: <strong>{updated.xp}</strong></p>
        {score === 100 ? <p className="test-result__mastery-note">Excellent. This bank is complete. The next bank unlocks only after 100% mastery, with new questions and harder thinking.</p> : <p className="test-result__mastery-note">You need 100% to unlock the next question bank. Don't worry — missed questions are prioritised for reinforcement so you can close the gaps.</p>}
        {missed.length > 0 && <section className="test-review" aria-labelledby="test-review-title"><h2 id="test-review-title">🧠 Learn from your answers</h2><p>Wrong answers are not failures. They become reinforcement targets.</p><div className="test-review__list">{missed.map((question) => { const copy = presentQuestion(question, updated.learnerProfile); return <article key={question.id} className="test-review__item"><h3>{copy.prompt}</h3><p><strong>Correct answer:</strong> {question.options[question.correctIndex]}</p><p>{copy.explanation}</p>{copy.terminology.map((item) => <p key={item.term}><strong>New word — {item.term}:</strong> {item.definition}<br /><small>Think of it as: {item.simple}</small></p>)}</article>; })}</div></section>}
        <div className="test-result__actions"><button type="button" onClick={startTest}>Try Again</button><button type="button" onClick={() => navigate("/learn/achievements")}>View Achievements</button></div>
      </div>
    </section></main>;
  }

  if (started) {
    const question = questions[index];
    if (!question) return <main className="page-container"><section className="welcome-card"><h1>No questions available</h1><p>This bank needs more content before it can be challenged.</p><button type="button" onClick={() => setStarted(false)}>Back</button></section></main>;
    const copy = presentQuestion(question, progress.learnerProfile);
    return <main className="page-container learn-topic-page"><section className="learn-topic-shell">
      <div className="test-header"><Link to={`/learn/topic/${topic.id}`}>← Lesson</Link><span>Question {index + 1} of {questions.length}</span></div>
      <div className="question-card"><p className="adaptive-eyebrow">Tiny Titan Challenge · Bank {getCurrentBank(progress, topic)} · Thinking level {getDifficulty(progress, topic)}/5</p><h1>{copy.prompt}</h1>
        <div className="question-options">{question.options.map((option, optionIndex) => <button key={`${question.id}-${optionIndex}`} type="button" className={selected === optionIndex ? "selected" : ""} aria-pressed={selected === optionIndex} onClick={() => setSelected(optionIndex)}>{option}</button>)}</div>
        {selected !== null && <div className="answer-feedback"><strong>{selected === question.correctIndex ? "Correct! 🎉" : "Not quite — let's learn why."}</strong><p>{copy.explanation}</p>{copy.terminology.map((item) => <p key={item.term}><strong>📚 {item.term}</strong> — {item.definition}<br /><small>Think of it as: {item.simple}</small></p>)}</div>}
        <button className="primary-action" type="button" disabled={selected === null} onClick={next}>{index === questions.length - 1 ? "Finish Bank" : "Next Question →"}</button>
      </div>
    </section></main>;
  }

  const currentBank = getCurrentBank(progress, topic);
  const topicMastery = progress.topics[topic.id]?.mastery ?? 0;
  const languageLevel = getLanguageLevel(progress);

  return <main className="page-container learn-topic-page"><section className="learn-topic-shell">
    <Link className="learn-back" to="/learn">← Back to Learn</Link>
    <header className="lesson-hero"><span>{topic.icon}</span><div><p className="adaptive-eyebrow">{topic.category} · Learn & Explore</p><h1>{topic.title}</h1><p>{topic.summary}</p></div></header>
    <div className="lesson-progress"><strong>Topic mastery: {topicMastery}%</strong><span>Question bank: {currentBank}</span><span>Language: {languageOptions.find(([level]) => level === languageLevel)?.[1]}</span></div>
    {profileOpen && <section className="learner-profile-card"><p className="adaptive-eyebrow">Make Tiny Titans fit the learner</p><h2>How would you like things explained?</h2><p>Knowledge difficulty and language difficulty are separate. A young learner can tackle advanced ideas without being hit with a wall of jargon.</p><div className="language-grid">{languageOptions.map(([level, label, description]) => <button key={level} type="button" className={languageLevel === level ? "selected" : ""} onClick={() => { setLearnerProfile(user?.uid, { languageLevel: level, showScientificTerms: true }); setProfileOpen(false); }}>{label}<small>{description}</small></button>)}</div><label className="term-toggle"><input type="checkbox" checked={progress.learnerProfile.showScientificTerms} onChange={(event) => setLearnerProfile(user?.uid, { showScientificTerms: event.target.checked })} /> Teach me the proper scientific terms as I go</label></section>}
    {!profileOpen && <button className="secondary-action" type="button" onClick={() => setProfileOpen(true)}>🗣️ Change explanation level</button>}
    <section className="explore-intro"><h2>Explore this topic</h2><p>Start with <strong>who, what, why, when, how</strong> and real examples. Then prove what you've learned.</p></section>
    <section className="explore-grid">{sectionLabels.map(([key, label, subtitle]) => topic.sections[key] ? <article key={key} className="explore-card"><span className="explore-card__label">{label}</span><h2>{subtitle}</h2><p>{topic.sections[key]}</p></article> : null)}</section>
    <section className="lesson-cta"><div><p className="adaptive-eyebrow">100% mastery required to advance</p><h2>Question Bank {currentBank} 🧠</h2><p>Five questions at a time. The bank must be completed at 100% before the next bank unlocks. Unseen questions are prioritised, missed questions return for reinforcement, and mastered questions are spaced out for retention.</p></div><button type="button" onClick={startTest}>Start Bank {currentBank}</button></section>
  </section></main>;
}
