import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { getTitanMicroclimateReadings, addTitanMicroclimateReading, type TitanMicroclimateReading } from "../../services/titanMicroclimateService";
import { analyseMicroclimate, buildAdaptiveHusbandryBaseline, buildHusbandryBaseline } from "../../intelligence/v50/husbandryIntelligenceEngine";

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
    setError("");
    void getTitanMicroclimateReadings(user.uid, snakeId).then((items) => { if (active) setReadings(items); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Microclimate readings could not be loaded."); });
    return () => { active = false; };
  }, [user, snakeId]);

  const observations = useMemo(() => readings.map((reading) => ({ date: reading.recordedAt, temperatureC: reading.temperatureC, humidityPercent: reading.humidityPercent, source: reading.source })), [readings]);
  const fullRange = useMemo(() => buildHusbandryBaseline(observations), [observations]);
  const history = useMemo(() => observations.slice(1), [observations]);
  const adaptiveBaseline = useMemo(() => buildAdaptiveHusbandryBaseline(history), [history]);
  const findings = useMemo(() => analyseMicroclimate(observations.slice(0, Math.max(1, Math.min(observations.length, 24))), adaptiveBaseline), [observations, adaptiveBaseline]);

  async function save() {
    if (!user || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const parsedTemperature = temperature.trim() ? Number(temperature) : undefined;
      const parsedHumidity = humidity.trim() ? Number(humidity) : undefined;
      if (parsedTemperature !== undefined && !Number.isFinite(parsedTemperature)) throw new Error("Temperature must be a number.");
      if (parsedHumidity !== undefined && !Number.isFinite(parsedHumidity)) throw new Error("Humidity must be a number.");
      if (parsedHumidity !== undefined && (parsedHumidity < 0 || parsedHumidity > 100)) throw new Error("Humidity must be between 0% and 100%.");
      await addTitanMicroclimateReading(user.uid, snakeId, { temperatureC: parsedTemperature, humidityPercent: parsedHumidity, source });
      setReadings(await getTitanMicroclimateReadings(user.uid, snakeId));
      setTemperature(""); setHumidity(""); setMessage("Microclimate reading saved. Historical context has been recalculated.");
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
    {message && <small>{message}</small>}
    {error && <small role="alert">{error}</small>}
    <div className="titan-microclimate-summary"><span>{readings.length} readings</span><span>{adaptiveBaseline.temperatureMinC !== undefined ? `${adaptiveBaseline.temperatureMinC}–${adaptiveBaseline.temperatureMaxC}°C adaptive baseline` : "More temperature history needed"}</span><span>{adaptiveBaseline.humidityMinPercent !== undefined ? `${adaptiveBaseline.humidityMinPercent}–${adaptiveBaseline.humidityMaxPercent}% adaptive baseline` : "More humidity history needed"}</span></div>
    {readings.length >= 4 && <div className="titan-feature-note"><strong>How this works:</strong> the adaptive baseline is derived from earlier readings using a robust median/MAD spread. Tiny Titans surfaces unusual measurements and short-term drift; it does not turn one reading into a diagnosis or a universal husbandry rule.</div>}
    {findings.length > 0 && <div className="titan-microclimate-findings">{findings.slice(-5).map((finding) => <article key={`${finding.type}-${finding.title}-${finding.observationDate ?? 0}`}><strong>{finding.title}</strong><p>{finding.detail}</p><small>{finding.severity} · {Math.round(finding.confidence * 100)}% confidence</small></article>)}</div>}
    {readings.length > 0 && <div className="titan-microclimate-history">{readings.slice(0, 12).map((reading) => <div key={reading.id}><span>{new Date(reading.recordedAt).toLocaleString("en-GB")}</span><b>{reading.temperatureC !== undefined ? `${reading.temperatureC}°C` : "—"}</b><b>{reading.humidityPercent !== undefined ? `${reading.humidityPercent}%` : "—"}</b><small>{reading.source}</small></div>)}</div>}
    {readings.length > 0 && <small>Observed range so far: {fullRange.temperatureMinC !== undefined ? `${fullRange.temperatureMinC}–${fullRange.temperatureMaxC}°C` : "no temperature values"} · {fullRange.humidityMinPercent !== undefined ? `${fullRange.humidityMinPercent}–${fullRange.humidityMaxPercent}%` : "no humidity values"}.</small>}
  </div>;
}
