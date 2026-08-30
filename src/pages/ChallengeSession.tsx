import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getChallengeTopic } from "../data/challengeTopics";
import { getCurrentBank, getDifficulty, getLearningProgress, knowledgeLevel, knowledgeScore, presentQuestion, recordTest, selectQuestions } from "../services/learningEngine";
import type { LearningBank, QuizQuestion } from "../types/Learning";
import ChallengeActivity from "../components/learning/ChallengeActivity";
import "../styles/LearnTopic.css";

function randomizeAnswerPositions(question: QuizQuestion): QuizQuestion {
  const indexedOptions = question.options.map((option, index) => ({ option, index }));
  for (let i = indexedOptions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
  }
  return {
    ...question,
    options: indexedOptions.map((item) => item.option),
    correctIndex: indexedOptions.findIndex((item) => item.index === question.correctIndex),
  };
}

export default function ChallengeSession() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const topic = getChallengeTopic(id);
  const progress = useMemo(() => getLearningProgress(user?.uid), [user?.uid]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [bankMasteredThisRound, setBankMasteredThisRound] = useState(false);

  if (!topic) return <main className="page-container"><section className="welcome-card"><h1>Challenge not found</h1><Link to="/challenge">Back to Titans Challenge</Link></section></main>;

  const start = () => {
    const current = getLearningProgress(user?.uid);
    const selectedQuestions = selectQuestions(topic, current, 5).map(randomizeAnswerPositions);
    setQuestions(selectedQuestions);
    setAnswers([]); setIndex(0); setSelected(null); setFinished(false); setBankMasteredThisRound(false);
  };

  const next = () => {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];
    if (index === questions.length - 1) {
      const correct = questions.reduce((sum, q, i) => sum + (nextAnswers[i] === q.correctIndex ? 1 : 0), 0);
      const missed = questions.filter((q, i) => nextAnswers[i] !== q.correctIndex).map(q => q.id);
      const bankBefore = getCurrentBank(getLearningProgress(user?.uid), topic) as LearningBank;
      const updated = recordTest(user?.uid, topic, questions.length ? correct / questions.length : 0, questions.length, questions.map(q => q.id), missed);
      setAnswers(nextAnswers); setBankMasteredThisRound(updated.topics[topic.id]?.masteredBanks.includes(bankBefore) ?? false); setFinished(true); return;
    }
    setAnswers(nextAnswers); setIndex(index + 1); setSelected(null);
  };

  if (!questions.length && !finished) return <main className="page-container learn-topic-page"><section className="learn-topic-shell"><Link className="learn-back" to="/challenge">← Titans Challenge</Link><header className="lesson-hero"><span>{topic.icon}</span><div><p className="adaptive-eyebrow">{topic.category} · Bank {getCurrentBank(progress, topic)}</p><h1>{topic.title}</h1><p>Five challenges at a time. Reach 100% across the whole bank to unlock the next one.</p></div></header><section className="lesson-cta"><div><p className="adaptive-eyebrow">Challenge level {getDifficulty(progress, topic)}/5</p><h2>Ready to challenge yourself?</h2><p>Everyone starts at Foundation. Challenge level rises as you demonstrate mastery; it is never based on age, experience or a profile label.</p></div><button type="button" onClick={start}>Start Bank {getCurrentBank(progress, topic)} →</button></section></section></main>;

  if (finished) {
    const correct = questions.reduce((sum, q, i) => sum + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const score = questions.length ? Math.round(correct / questions.length * 100) : 0;
    const updated = getLearningProgress(user?.uid);
    const tp = updated.topics[topic.id];
    const masteredBank = bankMasteredThisRound;
    const missed = questions.filter((q, i) => answers[i] !== q.correctIndex);
    const roundPerfect = score === 100;
    return <main className="page-container learn-topic-page"><section className="learn-topic-shell"><Link className="learn-back" to="/challenge">← Titans Challenge</Link><div className="test-result"><span className="test-result__icon">{masteredBank ? "🏆" : roundPerfect ? "💯" : "🧠"}</span><h1>{masteredBank ? "Bank mastered!" : roundPerfect ? "Perfect round!" : "Keep building."}</h1><p className="test-result__score">{score}%</p><p>{correct} of {questions.length} correct.</p><p>Topic mastery: <strong>{tp?.mastery ?? 0}%</strong> · Current bank: <strong>{tp?.currentBank ?? 1}</strong></p><p>Overall knowledge: <strong>{knowledgeScore(updated)}%</strong> · {knowledgeLevel(updated)} · <strong>{updated.xp} XP</strong></p><p className="test-result__mastery-note">{masteredBank ? "Excellent. The next bank is unlocked." : roundPerfect ? "100% this round — but there are still unseen questions in this bank. Keep going until the whole bank is mastered." : "You need 100% across the complete bank before the next stage can unlock."}</p>{missed.length > 0 && <section className="test-review"><h2>🧠 Targeted reinforcement</h2>{missed.map(q => { const copy = presentQuestion(q, updated.learnerProfile); return <article key={q.id} className="test-review__item"><h3>{copy.prompt}</h3><p><strong>Correct answer:</strong> {q.options[q.correctIndex]}</p><p>{copy.explanation}</p></article>; })}</section>}<div className="test-result__actions"><button type="button" onClick={start}>{masteredBank ? "Practice Again" : "Continue This Bank"}</button><button type="button" onClick={() => navigate("/challenge")}>Back to Challenge Centre</button></div></div></section></main>;
  }

  const q = questions[index];
  const copy = presentQuestion(q, progress.learnerProfile);
  return <main className="page-container learn-topic-page"><section className="learn-topic-shell"><div className="test-header"><Link to="/challenge">← Titans Challenge</Link><span>Challenge {index + 1} of {questions.length}</span></div><div className="question-card"><p className="adaptive-eyebrow">Bank {getCurrentBank(progress, topic)} · Challenge level {getDifficulty(progress, topic)}/5</p><h1>{copy.prompt}</h1><ChallengeActivity question={q} selected={selected} onSelect={setSelected}/>{selected !== null && <div className="answer-feedback"><strong>{selected === q.correctIndex ? "Correct! 🎉" : "Not quite — let's learn why."}</strong><p>{copy.explanation}</p>{copy.terminology.map(t => <p key={t.term}><strong>📚 {t.term}</strong> — {t.definition}<br/><small>Think of it as: {t.simple}</small></p>)}</div>}<button className="primary-action" type="button" disabled={selected === null} onClick={next}>{index === questions.length - 1 ? "Finish Round" : "Next Challenge →"}</button></div></section></main>;
}