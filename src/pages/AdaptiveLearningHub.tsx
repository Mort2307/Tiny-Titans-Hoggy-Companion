import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/AdaptiveLearningHub.css";

const content = {
  explorer: { title: "Explore the world of hognoses", intro: "Short, visual explanations designed to make reptile biology easy to understand.", lessons: ["What makes a snake a reptile?", "Why do snakes shed?", "How do snakes use their senses?"] },
  learner: { title: "Build your reptile knowledge", intro: "Clear explanations with the right amount of terminology, backed by interactive examples.", lessons: ["Hognose biology", "Inheritance basics", "Growth and feeding data"] },
  student: { title: "Investigate reptile biology", intro: "Use proper biological terminology, probabilities and real datasets to test your understanding.", lessons: ["Genetics and inheritance", "Analysing growth datasets", "Adaptation and behaviour"] },
  adult: { title: "Deepen your reptile knowledge", intro: "Detailed husbandry, genetics and data-led learning for adult keepers and enthusiasts.", lessons: ["Individual husbandry data", "Advanced genetics", "Evidence and data quality"] },
};

export default function AdaptiveLearningHub() {
  const { profile } = useAuth();
  const level = profile?.learningLevel ?? (profile?.category === "child" ? "learner" : "adult");
  const view = content[level];
  const isEducator = profile?.profileType === "educator";

  return <main className="page-container adaptive-page"><section className="adaptive-shell">
    <header className="adaptive-hero"><div><p className="adaptive-eyebrow">Adaptive Learning</p><h1>{view.title}</h1><p>{view.intro}</p></div><span>{profile?.experienceLevel ?? "beginner"}</span></header>
    <section className="adaptive-grid">{view.lessons.map((lesson, index) => <article className="adaptive-card" key={lesson}><span>{index === 0 ? "🐍" : index === 1 ? "🧬" : "📊"}</span><h2>{lesson}</h2><p>{profile?.experienceLevel === "pro" ? "Advanced explanation layer" : profile?.experienceLevel === "intermediate" ? "Intermediate explanation layer" : "Beginner-friendly explanation layer"}</p><button type="button">Explore</button></article>)}</section>
    {isEducator && <section className="adaptive-educator"><div><p className="adaptive-eyebrow">Teaching mode</p><h2>Build a lesson for your class</h2><p>Your educator profile is active. Classroom tools are ready in the Educator Centre.</p></div><Link to="/educator">Open Educator Centre →</Link></section>}
    <section className="adaptive-note"><strong>Why am I seeing this?</strong><p>Tiny Titans uses your selected learning level and reptile experience to change the language, terminology and depth of explanations. The underlying information stays consistent.</p></section>
  </section></main>;
}
