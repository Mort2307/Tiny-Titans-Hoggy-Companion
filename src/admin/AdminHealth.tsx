import { useState } from "react";

const healthAreas = ["Overall", "Authentication", "Database", "Genetics", "Feeding", "Content"] as const;
type HealthArea = (typeof healthAreas)[number];

export default function AdminHealth() {
  const [area, setArea] = useState<HealthArea>("Overall");

  return (
    <section className="creator-admin-health" aria-labelledby="admin-health-title">
      <header>
        <p className="creator-dashboard__eyebrow">Creator Centre</p>
        <h1 id="admin-health-title">App Health</h1>
        <p>Monitor application health, errors and service warnings from trusted diagnostics.</p>
      </header>
      <div className="creator-admin-health__toolbar">
        <label>
          <span>Health area</span>
          <select value={area} onChange={(event) => setArea(event.target.value as HealthArea)}>
            {healthAreas.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="creator-admin-health__status" role="status">
        <strong>Diagnostics are not connected yet.</strong>
        <p>Selected area: {area}. Live error counts, warnings and service status will appear here once diagnostics are connected.</p>
      </div>
    </section>
  );
}
