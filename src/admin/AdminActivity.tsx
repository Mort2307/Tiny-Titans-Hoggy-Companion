import { useState } from "react";

const activityFilters = ["All activity", "Sign-ins", "Snake records", "Feeding", "Breeding", "Content"] as const;
type ActivityFilter = (typeof activityFilters)[number];

export default function AdminActivity() {
  const [filter, setFilter] = useState<ActivityFilter>("All activity");

  return (
    <section className="creator-admin-activity" aria-labelledby="admin-activity-title">
      <header>
        <p className="creator-dashboard__eyebrow">Creator Centre</p>
        <h1 id="admin-activity-title">Activity</h1>
        <p>Review app activity once trusted telemetry is connected.</p>
      </header>

      <div className="creator-admin-activity__toolbar">
        <label>
          <span className="sr-only">Activity type</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as ActivityFilter)}>
            {activityFilters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="creator-admin-activity__empty" role="status">
        <strong>Activity telemetry is not connected yet.</strong>
        <p>Selected view: {filter}. Live events will appear here after the trusted telemetry layer is enabled.</p>
      </div>
    </section>
  );
}
