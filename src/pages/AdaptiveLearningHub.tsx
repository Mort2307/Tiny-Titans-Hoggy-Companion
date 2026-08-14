import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/AdaptiveLearningHub.css";

type LearningView = { title: string; intro: string; lessons: Array<[string, string, string]> };
const content: Record<"explorer" | "learner" | "student" | "adult", LearningView> = {
  explorer: { title: "Explore the world of hognoses", intro: "Short, visual explanations designed to make reptile biology easy to understand.", lessons: [["What makes a snake a reptile?", "🐍", "/knowledge-base"], ["Why do snakes shed?", "💧", "/shedding"], ["How do snakes use their senses?", "👀", "/knowledge-base"]] },
  learner: { title: "Build your reptile knowledge", intro: "Clear explanations with useful terminology, connected ideas and practical examples.", lessons: [["Hognose biology", "🐍", "/knowledge-base"], ["Inheritance basics", "🧬", "/calculator"], ["Growth and feeding data", "📊", "/weights"]] },
  student: { title: "Investigate reptile biology", intro: "Use biological terminology, probabilities and real datasets to test your understanding.", lessons: [["Genetics and inheritance", "🧬", "/calculator"], ["Analysing growth datasets", "📊", "/weights"], ["Adaptation and behaviour", "🔬", "/knowledge-base"]] },
  adult: { title: "Deepen your reptile knowledge", intro: "Detailed husbandry, genetics and data-led learning for adult keepers and enthusiasts.", lessons: [["Individual husbandry data", "📊", "/snakes"], ["Advanced genetics", "🧬", "/calculator"], ["Evidence and data quality", "📚", "/knowledge-base"]] },
};

export default function AdaptiveLearningHub() {
  const { profile } = useAuth();
  const level = profile?.learningLevel ?? (profile?.category === "child" ? "learner" : "adult");
  const view = content[level];
  const isEducator = profile?.profileType === "educator";
  const experience = profile?.experienceLevel === "pro" ? "Advanced" : profile?.experienceLevel === "intermediate" ? "Intermediate" : "Beginner";
  return <main className="page-container adaptive-page"><section className="adaptive-shell"><header className="adaptive-hero"><div><p className="adaptive-eyebrow">Adaptive Learning</p><h1>{view.title}</h1><p>{view.intro}</p></div><span>{experience}</span></header><section className="adaptive-grid">{view.lessons.map(([lesson, icon, href]) => <article className="adaptive-card" key={lesson}><span>{icon}</span><h2>{lesson}</h2><p>{level === "explorer" ? "A friendly explanation with new words explained as we go." : level === "learner" ? "Clear science language with practical examples." : level === "student" ? "Technical terminology, reasoning and evidence." : "Full technical context and individual-data caveats."}</p><Link to={href}>Explore →</Link></article>)}</section>{isEducator && <section className="adaptive-educator"><div><p className="adaptive-eyebrow">Teaching mode</p><h2>Build a lesson for your class</h2><p>Your educator profile is active. Classroom tools are ready in the Educator Centre.</p></div><Link to="/educator">Open Educator Centre →</Link></section>}<section className="adaptive-note"><strong>Why am I seeing this?</strong><p>Tiny Titans uses your selected learning level and reptile experience to change the language, terminology and depth of explanations. The underlying scientific information and safety principles stay consistent.</p></section></section></main>;
}
