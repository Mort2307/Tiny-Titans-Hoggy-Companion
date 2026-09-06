import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { getTitanMicroclimateReadings, addTitanMicroclimateReading, type TitanMicroclimateReading } from "../../services/titanMicroclimateService";
import { analyseMicroclimate, buildHusbandryBaseline } from "../../intelligence/v50/husbandryIntelligenceEngine";

interface Props { snakeId: string }

export default function TitanMicroclimateTool({ snakeId }: Props) {
  const { user } = useAuth();
  const [readings, setReadings] = useState<TitanMicroclimateReading[]>([]);
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [source, setSource] = useState<"keeper" | "sensor">("keeper");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || !snakeId) return;
    let active = true;
    void getTitanMicroclimateReadings(user.uid, snakeId).then((items) => { if (active) setReadings(items); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Microclimate readings could not be loaded."); });
    return () => { active = false; };
  }, [user, snakeId]);

  const baseline = useMemo(() => buildHusbandryBaseline(readings.map((reading) => ({ date: reading.recordedAt, temperatureC: reading.temperatureC, humidityPercent: reading.humidityPercent, source: reading.source }))), [readings]);
  const findings = useMemo(() => analyseMicroclimate(readings.map((reading) => ({ date: reading.recordedAt, temperatureC: reading.temperatureC, humidityPercent: reading.humidityPercent, source: reading.source })), baseline), [readings, baseline]);

  async function save() {
    if (!user || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const parsedTemperature = temperature.trim() ? Number(temperature) : undefined;
      const parsedHumidity = humidity.trim() ? Number(humidity) : undefined;
      if (parsedTemperature !== undefined && !Number.isFinite(parsedTemperature)) throw new Error("Temperature must be a number.");
      if (parsedHumidity !== undefined && !Number.isFinite(parsedHumidity)) throw new Error("Humidity must be a number.");
      await addTitanMicroclimateReading(user.uid, snakeId, { temperatureC: parsedTemperature, humidityPercent: parsedHumidity, source });
      setReadings(await getTitanMicroclimateReadings(user.uid, snakeId));
      setTemperature(""); setHumidity(""); setMessage("Microclimate reading saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Microclimate reading could not be saved.");
    } finally { setSaving(false); }
  }

  return <div className="titan-microclimate-tool">
    <div className="titan-microclimate-form">
      <input inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} placeholder="Temperature °C" aria-label="Temperature in degrees Celsius" />
      <input inputMode="decimal" value={humidity} onChange={(event) => setHumidity(event.target.value)} placeholder="Humidity %" aria-label="Humidity percentage" />
      <select value={source} onChange={(event) => setSource(event.target.value as "keeper" | "sensor")} aria-label="Reading source"><option value="keeper">Keeper</option><option value="sensor">Sensor</option></select>
      <button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save reading"}</button>
    </div>
    {message && <small>{message}</small>}{error && <small role="alert">{error}</small>}
    <div className="titan-microclimate-summary"><span>{readings.length} readings</span><span>{baseline.temperatureMinC !== undefined ? `${baseline.temperatureMinC}–${baseline.temperatureMaxC}°C baseline` : "No temperature baseline"}</span><span>{baseline.humidityMinPercent !== undefined ? `${baseline.humidityMinPercent}–${baseline.humidityMaxPercent}% baseline` : "No humidity baseline"}</span></div>
    {findings.length > 0 && <div className="titan-microclimate-findings">{findings.slice(-5).map((finding) => <article key={`${finding.type}-${finding.title}-${finding.observationDate ?? 0}`}><strong>{finding.title}</strong><p>{finding.detail}</p><small>{finding.severity} · {Math.round(finding.confidence * 100)}% confidence</small></article>)}</div>}
    {readings.length > 0 && <div className="titan-microclimate-history">{readings.slice(0, 8).map((reading) => <div key={reading.id}><span>{new Date(reading.recordedAt).toLocaleString("en-GB")}</span><b>{reading.temperatureC !== undefined ? `${reading.temperatureC}°C` : "—"}</b><b>{reading.humidityPercent !== undefined ? `${reading.humidityPercent}%` : "—"}</b><small>{reading.source}</small></div>)}</div>}
  </div>;
}
