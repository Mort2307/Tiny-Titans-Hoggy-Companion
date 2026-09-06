import { useEffect, useMemo, useState } from "react";
import type { Snake } from "../../types/Snake";
import { getTitanMicroclimateReadings, type TitanMicroclimateReading } from "../../services/titanMicroclimateService";
import { buildTitanDigitalTwin, type TwinComponent, type TwinPlant, type TwinReading } from "../../intelligence/v50/titanDigitalTwinEngine";
import { buildTitanVivariumIntelligence } from "../../intelligence/v50/titanVivariumIntelligenceEngine";
import TitanEcosystemPanel from "./TitanEcosystemPanel";
import "./TitanDigitalTwinPanel.css";

export default function TitanDigitalTwinPanel({ uid, snake }: { uid: string; snake: Snake }) {
  const [readings, setReadings] = useState<TitanMicroclimateReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void getTitanMicroclimateReadings(uid, snake.id)
      .then((value) => { if (active) setReadings(value); })
      .catch((reason) => { if (active) { setReadings([]); setError(reason instanceof Error ? reason.message : "Digital Twin readings could not be loaded."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid, snake.id]);

  const model = useMemo(() => {
    const enclosure = snake.enclosure;
    const components: TwinComponent[] = enclosure ? [
      { id: "enclosure", kind: "enclosure", label: enclosure.enclosureType || "Enclosure", enabled: true, metadata: { length: enclosure.length, width: enclosure.width, height: enclosure.height } },
      { id: "heating", kind: "heat", label: enclosure.heatingType, enabled: true, metadata: { thermostat: enclosure.thermostat ?? null } },
      { id: "uvb", kind: "uvb", label: "UVB", enabled: enclosure.uvbEnabled, metadata: { photoperiodHours: enclosure.uvbPhotoperiodHours ?? null } },
      { id: "humidity", kind: "humidity", label: "Humidity monitoring", enabled: enclosure.humidity !== undefined },
      { id: "substrate", kind: "substrate", label: enclosure.bioactive ? "Bioactive substrate" : enclosure.customSubstrate || enclosure.substrate, enabled: true },
      ...((enclosure.plants ?? []).map((plant, index) => ({ id: `plant-${index}`, kind: "plant" as const, label: plant, enabled: true }))),
      { id: "monitor", kind: "monitor", label: "Microclimate observations", enabled: readings.length > 0 },
      { id: "enrichment", kind: "enrichment", label: `${(enclosure.hides ?? 0)} hide(s) + ${(enclosure.decorations ?? []).length} decoration(s)`, enabled: (enclosure.hides ?? 0) > 0 || (enclosure.decorations ?? []).length > 0 },
    ] : [];
    const plants: TwinPlant[] = (enclosure?.plants ?? []).map((name, index) => ({ id: `plant-${index}`, name, status: "unknown" }));
    const twinReadings: TwinReading[] = readings.map((reading) => ({ id: reading.id, timestamp: reading.recordedAt, zone: reading.enclosureId ? "other" : "ambient", temperatureC: reading.temperatureC, humidityPct: reading.humidityPercent, source: reading.source === "sensor" ? "sensor" : "manual" }));
    return { twin: buildTitanDigitalTwin({ components, readings: twinReadings, plants }), vivarium: buildTitanVivariumIntelligence({ components, readings: twinReadings }) };
  }, [readings, snake.enclosure]);

  if (!snake.enclosure) return <section className="titan-digital-twin"><div className="titan-feature-empty"><strong>No enclosure record is attached to this Titan.</strong><p>Create the enclosure record first; the Digital Twin will not manufacture an environment from species defaults.</p></div></section>;
  if (loading) return <section className="titan-digital-twin"><div className="titan-feature-empty">🏠 Building the Digital Twin from your recorded enclosure…</div></section>;
  if (error) return <section className="titan-digital-twin"><div className="titan-feature-empty"><strong>Digital Twin unavailable.</strong><p>{error}</p></div></section>;

  const { twin, vivarium } = model;
  return <>
    <section className="titan-digital-twin">
      <div className="titan-digital-twin__hero"><div><p className="titan-feature-kicker">🏠 DIGITAL TWIN</p><h2>{snake.name}'s enclosure model</h2><p>{twin.note}</p></div><strong>{twin.health}</strong></div>
      <div className="titan-feature-data-grid"><article><strong>{twin.activeComponentCount}</strong><span>Active components</span></article><article><strong>{twin.readingCount}</strong><span>Environmental readings</span></article><article><strong>{twin.zoneCoverage.length}</strong><span>Zones represented</span></article><article><strong>{Math.round(vivarium.proactivePriority)}</strong><span>Vivarium signal priority</span></article></div>
      {(vivarium.baselines.temperature !== undefined || vivarium.baselines.humidity !== undefined) && <div className="titan-digital-twin__optimisations"><h3>Keeper-specific baseline</h3><p>{vivarium.baselines.temperature !== undefined ? `Median temperature ${vivarium.baselines.temperature.toFixed(1)}°C` : "Temperature not measured"} · {vivarium.baselines.humidity !== undefined ? `median humidity ${vivarium.baselines.humidity.toFixed(1)}%` : "humidity not measured"} · {vivarium.baselines.sampleCount} baseline readings across {vivarium.baselines.windowDays} day{vivarium.baselines.windowDays === 1 ? "" : "s"}.</p></div>}
      {vivarium.trendDeltas.filter((trend) => Math.abs(trend.delta) >= (trend.metric === "temperature" ? 1 : 5)).length > 0 && <div className="titan-digital-twin__findings"><h3>Trend deltas</h3>{vivarium.trendDeltas.filter((trend) => Math.abs(trend.delta) >= (trend.metric === "temperature" ? 1 : 5)).slice(0, 6).map((trend) => <article key={trend.id}><strong>{trend.zone} {trend.metric} {trend.direction}</strong><p>{trend.recentValue}{trend.metric === "temperature" ? "°C" : "%"} vs {trend.baselineValue}{trend.metric === "temperature" ? "°C" : "%"} baseline ({trend.delta > 0 ? "+" : ""}{trend.delta}).</p><small>{trend.sampleCount} samples · {Math.round(trend.confidence * 100)}% confidence</small></article>)}</div>}
      {vivarium.anomalyClusters.length > 0 && <div className="titan-digital-twin__findings"><h3>Environmental anomaly clusters</h3>{vivarium.anomalyClusters.slice(0, 6).map((cluster) => <article key={cluster.id}><strong>{cluster.severity} · {cluster.metric} · {cluster.observationCount} observations</strong><p>{cluster.explanation}</p><small>{cluster.spanHours}h window · {Math.round(cluster.confidence * 100)}% confidence</small></article>)}</div>}
      {twin.findings.length > 0 && <div className="titan-digital-twin__findings">{twin.findings.map((finding) => <article key={finding.id}><strong>{finding.title}</strong><p>{finding.explanation}</p><small>{finding.severity} · {Math.round(finding.confidence * 100)}% confidence</small></article>)}</div>}
      {twin.optimisations.length > 0 && <div className="titan-digital-twin__optimisations"><h3>Potential optimisation targets</h3>{twin.optimisations.map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.reason}</p></article>)}</div>}
    </section>
    <TitanEcosystemPanel snake={snake} />
  </>;
}
