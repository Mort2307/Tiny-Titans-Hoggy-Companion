import type { QuizQuestion } from "../../types/Learning";
import "./ChallengeActivity.css";

const icons: Record<string, string> = { knowledge: "🧠", "genetics-builder": "🧬", "feeding-scenario": "🍽️", "husbandry-detective": "🌡️", "normal-monitor-investigate": "🐍", "shed-scenario": "💧", sequence: "↕️", "keeper-scenario": "🎯", reasoning: "🔬" };
const labels: Record<string, string> = { knowledge: "Knowledge Check", "genetics-builder": "Genetics Builder", "feeding-scenario": "Feeding Scenario", "husbandry-detective": "Husbandry Detective", "normal-monitor-investigate": "Normal / Monitor / Investigate", "shed-scenario": "Shed Challenge", sequence: "Put It In Order", "keeper-scenario": "Keeper Scenario", reasoning: "Reasoning Challenge" };

type Props = { question: QuizQuestion; selected: number | null; onSelect: (index: number) => void };

export default function ChallengeActivity({ question, selected, onSelect }: Props) {
  const type = question.challengeType ?? "knowledge";
  const data = question.challengeData;
  const scenario = data?.scenario;
  const instruction = data?.instruction;
  return <div className={`challenge-activity challenge-activity--${type}`}>
    <div className="challenge-activity__type"><span>{icons[type] ?? "🧠"}</span><strong>{labels[type] ?? "Knowledge Check"}</strong></div>
    {scenario && <div className="challenge-activity__scenario"><strong>Scenario</strong><p>{scenario}</p></div>}
    {instruction && <p className="challenge-activity__instruction">{instruction}</p>}
    {type === "genetics-builder" && <div className="genetics-builder-preview"><div className="genetics-builder-preview__parent"><span>Parent A</span><strong>{data?.labels?.[0] ?? "Known genotype"}</strong></div><div className="genetics-builder-preview__plus">×</div><div className="genetics-builder-preview__parent"><span>Parent B</span><strong>{data?.labels?.[1] ?? "Known genotype"}</strong></div></div>}
    {type === "sequence" && data?.sequenceItems?.length ? <div className="challenge-sequence-preview" aria-label="Sequence stages">{data.sequenceItems.map((item, index) => <div key={`${question.id}-sequence-${index}`} className="challenge-sequence-preview__item"><span>{index + 1}</span><strong>{item}</strong></div>)}</div> : null}
    <div className="question-options">{question.options.map((option, index) => <button key={`${question.id}-${index}`} type="button" className={selected === index ? "selected" : ""} aria-pressed={selected === index} onClick={() => onSelect(index)}><span className="challenge-option-index">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
  </div>;
}
