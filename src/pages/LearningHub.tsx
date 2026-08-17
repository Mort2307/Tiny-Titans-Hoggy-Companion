import { Link } from "react-router-dom";

const learningAreas = [
  {
    icon: "📚",
    title: "Knowledge Base",
    description: "Explore Western Hognose husbandry, genetics, feeding, shedding and care guidance.",
    to: "/knowledge-base",
    action: "Explore Knowledge Base",
  },
  {
    icon: "🧠",
    title: "Titans Challenge",
    description: "Test what you know, build mastery, earn XP and progress through adaptive questions.",
    to: "/challenge",
    action: "Start Challenge",
  },
  {
    icon: "🎯",
    title: "Adaptive Learning",
    description: "Let Tiny Titans focus your learning journey around the areas where you need the most practice.",
    to: "/challenge",
    action: "Continue Learning",
  },
  {
    icon: "🏆",
    title: "Achievements",
    description: "Review learning milestones, mastery, streaks and collection achievements.",
    to: "/learn/achievements",
    action: "View Achievements",
  },
  {
    icon: "⚙️",
    title: "Personalisation",
    description: "Tune your learning experience and make Tiny Titans better suited to how you learn.",
    to: "/account/personalise",
    action: "Personalise Learning",
  },
];

export default function LearningHub() {
  return (
    <main className="page-container">
      <section className="welcome-card">
        <p className="eyebrow">TINY TITANS · LEARNING</p>
        <h1>📖 Learning Hub</h1>
        <p>
          One place to learn, practise, track mastery and turn knowledge into better care for your hoggies.
        </p>
      </section>

      <section className="dashboard-grid" aria-label="Learning destinations">
        {learningAreas.map((area) => (
          <article className="dashboard-card" key={area.title}>
            <div className="dashboard-card-icon" aria-hidden="true">{area.icon}</div>
            <h2>{area.title}</h2>
            <p>{area.description}</p>
            <Link className="primary-button" to={area.to}>
              {area.action} →
            </Link>
          </article>
        ))}
      </section>

      <section className="welcome-card">
        <h2>🐍 Learn from what you actually do</h2>
        <p>
          Tiny Titans is designed to connect learning with your real husbandry journey. As your records grow,
          the app can use your knowledge progress alongside your snake data to surface more useful learning.
        </p>
        <div className="button-row">
          <Link className="secondary-button" to="/snakes">View My Snakes</Link>
          <Link className="secondary-button" to="/community">Visit Community Hub</Link>
        </div>
      </section>
    </main>
  );
}
