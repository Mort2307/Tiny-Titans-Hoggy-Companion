import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import TinyTitansIcon from "./TinyTitansIcon";
import { getIntegrationTelemetry, type IntegrationDevice, type IntegrationTelemetryReading } from "../services/integrationHubService";

const METRIC_LABELS: Record<string, string> = {
  temperatureC: "Temperature",
  humidityPct: "Humidity",
  batteryPct: "Battery",
  powerW: "Power",
  lightLux: "Light",
  co2Ppm: "CO₂",
  pressureHpa: "Pressure",
  waterLevelPct: "Water level",
};
const METRIC_UNITS: Record<string, string> = {
  temperatureC: "°C",
  humidityPct: "%",
  batteryPct: "%",
  powerW: "W",
  lightLux: " lux",
  co2Ppm: " ppm",
  pressureHpa: " hPa",
  waterLevelPct: "%",
};

function formatAxis(value: number): string {
  const date = new Date(value);
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function numericMetrics(readings: IntegrationTelemetryReading[]): string[] {
  const found = new Set<string>();
  for (const reading of readings) {
    for (const [key, value] of Object.entries(reading.metrics || {})) {
      if (typeof value === "number" && Number.isFinite(value)) found.add(key);
    }
  }
  return [...found].sort((a, b) => (a === "temperatureC" ? -1 : b === "temperatureC" ? 1 : (METRIC_LABELS[a] || a).localeCompare(METRIC_LABELS[b] || b)));
}

export default function IntegrationTelemetryHistory({ device, onClose }: { device: IntegrationDevice; onClose: () => void }) {
  const [readings, setReadings] = useState<IntegrationTelemetryReading[]>([]);
  const [metric, setMetric] = useState("");
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getIntegrationTelemetry(device.deviceId, limit)
      .then((next) => {
        if (!active) return;
        setReadings(next);
        const available = numericMetrics(next);
        setMetric((current) => available.includes(current) ? current : (available[0] || ""));
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Telemetry history could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [device.deviceId, limit]);

  const availableMetrics = useMemo(() => numericMetrics(readings), [readings]);
  const chartData = useMemo(() => readings
    .filter((reading) => reading.recordedAt && typeof reading.metrics?.[metric] === "number")
    .map((reading) => ({ at: Number(reading.recordedAt), value: Number(reading.metrics[metric]) }))
    .sort((a, b) => a.at - b.at), [readings, metric]);
  const stats = useMemo(() => {
    const values = chartData.map((item) => item.value).filter(Number.isFinite);
    if (!values.length) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      count: values.length,
    };
  }, [chartData]);
  const unit = METRIC_UNITS[metric] || "";

  return <article className="tt-telemetry-history">
    <header>
      <div><span className="tt-integration-kicker">ENVIRONMENT HISTORY</span><h3><TinyTitansIcon name="analytics" size={20} /> {device.name}</h3><p>Validated readings stored by Tiny Titans. These charts describe the enclosure signal; they do not replace a dedicated thermostat or safety controller.</p></div>
      <button type="button" onClick={onClose}>Close</button>
    </header>
    <div className="tt-telemetry-controls">
      <label>Metric<select value={metric} onChange={(event) => setMetric(event.target.value)} disabled={!availableMetrics.length}>{availableMetrics.map((key) => <option key={key} value={key}>{METRIC_LABELS[key] || key}</option>)}</select></label>
      <label>Readings<select value={limit} onChange={(event) => setLimit(Number(event.target.value))}><option value={50}>Latest 50</option><option value={100}>Latest 100</option><option value={250}>Latest 250</option></select></label>
    </div>
    {loading ? <div className="tt-telemetry-state">Loading telemetry history…</div> : error ? <div className="tt-telemetry-state is-error">{error}</div> : !metric || !chartData.length ? <div className="tt-telemetry-state">No numeric history is available for this device yet.</div> : <>
      {stats && <div className="tt-telemetry-stats"><span><small>Minimum</small><strong>{stats.min.toFixed(1)}{unit}</strong></span><span><small>Average</small><strong>{stats.average.toFixed(1)}{unit}</strong></span><span><small>Maximum</small><strong>{stats.max.toFixed(1)}{unit}</strong></span><span><small>Samples</small><strong>{stats.count}</strong></span></div>}
      <div className="tt-telemetry-chart" role="img" aria-label={`${METRIC_LABELS[metric] || metric} history for ${device.name}`}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 12, right: 18, bottom: 6, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
            <XAxis dataKey="at" type="number" domain={["dataMin", "dataMax"]} tickFormatter={formatAxis} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={54} tickFormatter={(value) => `${value}${unit}`} />
            <Tooltip labelFormatter={(value) => new Date(Number(value)).toLocaleString("en-GB")} formatter={(value) => [`${Number(value).toFixed(1)}${unit}`, METRIC_LABELS[metric] || metric]} />
            <Line type="monotone" dataKey="value" name={METRIC_LABELS[metric] || metric} dot={false} stroke="currentColor" strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>}
  </article>;
}
