import { useEffect, useMemo, useState } from "react";
import type { Snake } from "../../types/Snake";
import { getTitanMicroclimateReadings, type TitanMicroclimateReading } from "../../services/titanMicroclimateService";
import { buildTitanDigitalTwin, type TwinComponent, type TwinPlant, type TwinReading } from "../../intelligence/v50/titanDigitalTwinEngine";
import "./TitanDigitalTwinPanel.css";

export default function TitanDigitalTwinPanel({ uid, snake }: { uid: string; snake: Snake }) {
  const [readings, setReadings] = useState<TitanMicroclimateReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getTitanMicroclimateReadings(uid, snake.id)
      .then((value) => { if (active) setReadings(value); })
      .catch((reason) => { if (active) { setReadings([]); setError(reason instanceof Error ? reason.message : "Digital Twin readings could not be loaded."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid, snake.id]);

  const twin = useMemo(() => {
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
    return buildTitanDigitalTwin({ components, readings: twinReadings, plants });
  }, [readings, snake.enclosure]);

  if (!snake.enclosure) return <section className="titan-digital-twin"><div className="titan-feature-empty"><strong>No enclosure record is attached to this Titan.</strong><p>Create the enclosure record first; the Digital Twin will not manufacture an environment from species defaults.</p></div></section>;
  if (loading) return <section className="titan-digital-twin"><div className="titan-feature-empty">🏠 Building the Digital Twin from your recorded enclosure…</div></section>;
  if (error) return <section className="titan-digital-twin"><div className="titan-feature-empty"><strong>Digital Twin unavailable.</strong><p>{error}</p></div></section>;

  return <section className="titan-digital-twin">
    <div className="titan-digital-twin__hero"><div><p className="titan-feature-kicker">🏠 DIGITAL TWIN</p><h2>{snake.name}'s enclosure model</h2><p>{twin.note}</p></div><strong>{twin.health}</strong></div>
    <div className="titan-feature-data-grid"><article><strong>{twin.activeComponentCount}</strong><span>Active components</span></article><article><strong>{twin.readingCount}</strong><span>Environmental readings</span></article><article><strong>{twin.zoneCoverage.length}</strong><span>Zones represented</span></article><article><strong>{twin.plantCount}</strong><span>Plant records</span></article></div>
    {twin.findings.length > 0 && <div className="titan-digital-twin__findings">{twin.findings.map((finding) => <article key={finding.id}><strong>{finding.title}</strong><p>{finding.explanation}</p><small>{finding.severity} · {Math.round(finding.confidence * 100)}% confidence</small></article>)}</div>}
    {twin.optimisations.length > 0 && <div className="titan-digital-twin__optimisations"><h3>Potential optimisation targets</h3>{twin.optimisations.map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.reason}</p></article>)}</div>}
  </section>;
}
