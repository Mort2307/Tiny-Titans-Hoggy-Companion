import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const tools = [
  ["🧬", "Morph Submission Review", "/creator/submissions", "Review and moderate morph submissions."],
  ["🐛", "Bug Reports & Feedback", "/creator/issues", "Review bugs, evidence, status and creator decisions."],
  ["📢", "Community Manager", "/creator/community", "Publish updates, known issues, tester notices and releases."],
  ["🧪", "Tester Centre", "/creator/tester", "Run the protected testing and diagnostics workflows."],
  ["🛡️", "Creator Privacy Data", "/creator/privacy-data", "Review consent-controlled creator data and privacy tools."],
];

export default function CreatorLanding() {
  const { profile } = useAuth();
  if (profile?.role === "admin") return <AdminCreatorLink />;

  return (
    <main className="page-container">
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

function AdminCreatorLink() {
  return <AdminCreatorContent />;
}

function AdminCreatorContent() {
  return <iframe title="Creator Centre" src="/creator" style={{ width: "100%", minHeight: "100vh", border: 0 }} />;
}
