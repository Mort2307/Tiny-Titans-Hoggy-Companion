import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";

const tools = [
  ["🧬", "Morph Submission Review", "/creator/submissions", "Review and moderate morph submissions."],
  ["🐛", "Bug Reports & Feedback", "/creator/issues", "Review bugs, evidence, status and creator decisions."],
  ["📢", "Community Manager", "/creator/community", "Publish updates, known issues, tester notices and releases."],
  ["🛡️", "Creator Privacy Data", "/creator/privacy-data", "Review consent-controlled creator data and privacy tools."],
];

export default function CreatorLanding() {
  return (
    <main className="page-container">
      <BackHomeButton fallback="/" />
      <section className="welcome-card">
        <p className="eyebrow">TINY TITANS · CREATOR</p>
        <h1>🛠️ Creator Centre</h1>
        <p>Your creator workflows are protected by the shared capability system. Choose the operation you want to work on.</p>
      </section>
      <section className="dashboard-grid" aria-label="Creator tools">
        {tools.map(([icon, title, to, description]) => (
          <article className="dashboard-card" key={to}>
            <div className="dashboard-card-icon" aria-hidden="true">{icon}</div>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link className="primary-button" to={to}>Open →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
