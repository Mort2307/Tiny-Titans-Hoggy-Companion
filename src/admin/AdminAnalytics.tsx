import { useState } from "react";

const metricOptions = ["Users", "Active users", "Snakes tracked", "Feeding records", "Shed records", "Breeding records"] as const;
type Metric = (typeof metricOptions)[number];

export default function AdminAnalytics() {
  const [metric, setMetric] = useState<Metric>("Users");

  return (
    <section className="creator-admin-analytics" aria-labelledby="admin-analytics-title">
      <header>
        <p className="creator-dashboard__eyebrow">Creator Centre</p>
        <h1 id="admin-analytics-title">Analytics</h1>
        <p>Monitor adoption, engagement and feature usage from trusted application telemetry.</p>
      </header>

      <div className="creator-admin-analytics__toolbar">
        <label>
          <span>Metric</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
            {metricOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="creator-admin-analytics__empty" role="status">
        <strong>Analytics telemetry is not connected yet.</strong>
        <p>Selected metric: {metric}. Live totals, trends and time-series data will appear here once the trusted analytics layer is enabled.</p>
      </div>
    </section>
  );
}
