import { Link } from "react-router-dom";

const dashboardCards = [
  { title: "Users", description: "Registered accounts and account management.", path: "/creator/users" },
  { title: "Activity", description: "Recent app activity and usage signals.", path: "/creator/activity" },
  { title: "Analytics", description: "Usage, adoption and feature metrics.", path: "/creator/analytics" },
  { title: "Health", description: "Errors, warnings and app health monitoring.", path: "/creator/health" },
  { title: "Genetics", description: "Morph data, verification and genetics reports.", path: "/creator/genetics" },
  { title: "Content", description: "Knowledge Base and creator-managed content.", path: "/creator/content" },
];

export default function CreatorDashboard() {
  return (
    <section className="creator-dashboard" aria-labelledby="creator-dashboard-title">
      <header className="creator-dashboard__header">
        <p className="creator-dashboard__eyebrow">Tiny Titans</p>
        <h1 id="creator-dashboard-title">Creator Centre</h1>
        <p>Global control, monitoring and management for Tiny Titans Hoggy Companion.</p>
      </header>

      <div className="creator-dashboard__status" aria-label="System status">
        <strong>System status</strong>
        <span>Admin telemetry will appear here once connected.</span>
      </div>

      <div className="creator-dashboard__grid">
        {dashboardCards.map((card) => (
          <Link className="creator-dashboard__card" key={card.path} to={card.path}>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
