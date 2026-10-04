import { useCallback, useEffect, useMemo, useState } from "react";
import PageBackButton from "../components/PageBackButton";
import TinyTitansIcon from "../components/TinyTitansIcon";
import TinyTitansFeedback from "../components/TinyTitansFeedback";
import { useAuth } from "../context/useAuth";
import {
  createIntegrationGatewayKey,
  downloadReminderCalendar,
  getIntegrationHubStatus,
  revokeIntegrationGatewayKey,
  type IntegrationDevice,
  type IntegrationHubStatus,
} from "../services/integrationHubService";
import "../styles/integrationHub.css";

function when(value: number | null | undefined): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}
function metricLabel(key: string): string {
  return ({
    temperatureC: "Temperature",
    humidityPct: "Humidity",
    batteryPct: "Battery",
    powerW: "Power",
    lightLux: "Light",
    co2Ppm: "CO₂",
    pressureHpa: "Pressure",
    waterLevelPct: "Water level",
    switchState: "Switch",
    heatSourceState: "Heat source",
    lightState: "Light state",
    fanState: "Fan",
  } as Record<string, string>)[key] || key;
}
function metricValue(key: string, value: number | boolean): string {
  if (typeof value === "boolean") return value ? "ON" : "OFF";
  const suffix = ({ temperatureC: "°C", humidityPct: "%", batteryPct: "%", powerW: "W", lightLux: " lux", co2Ppm: " ppm", pressureHpa: " hPa", waterLevelPct: "%" } as Record<string, string>)[key] || "";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}
function DeviceCard({ device }: { device: IntegrationDevice }) {
  return <article className="tt-integration-device">
    <div className="tt-integration-device__head">
      <div><span>{device.source.replaceAll("_", " ")}</span><strong>{device.name}</strong><small>{device.deviceId}</small></div>
      <em>{when(device.lastSeenAt)}</em>
    </div>
    <div className="tt-integration-metrics">
      {Object.entries(device.metrics).map(([key, value]) => <span key={key}><small>{metricLabel(key)}</small><strong>{metricValue(key, value)}</strong></span>)}
    </div>
    <footer>
      <span>{device.readingCount} reading{device.readingCount === 1 ? "" : "s"}</span>
      {device.animalId && <span>Animal linked</span>}
      {device.enclosureId && <span>Enclosure linked</span>}
    </footer>
  </article>;
}

export default function IntegrationHub() {
  const { user } = useAuth();
  const [status, setStatus] = useState<IntegrationHubStatus | null>(null);
  const [gatewayKey, setGatewayKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    try { setStatus(await getIntegrationHubStatus()); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Integration status could not be loaded."); }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const endpoint = status?.gateway.endpoint || "https://tinytitanskeeper.web.app/api/device-gateway";
  const samplePayload = useMemo(() => JSON.stringify({
    deviceId: "vivarium-3-hot-side",
    name: "Vivarium 3 hot side",
    source: "home_assistant",
    animalId: "OPTIONAL_TINY_TITANS_ANIMAL_ID",
    enclosureId: "OPTIONAL_ENCLOSURE_ID",
    metrics: { temperatureC: 31.2, humidityPct: 42, heatSourceState: true },
    timestamp: new Date().toISOString(),
  }, null, 2), []);

  async function generateKey() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await createIntegrationGatewayKey();
      setGatewayKey(result.key);
      setMessage("New gateway key created. Any previous key was revoked.");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gateway key could not be created."); }
    finally { setBusy(false); }
  }
  async function revokeKey() {
    setBusy(true); setError(""); setMessage("");
    try {
      await revokeIntegrationGatewayKey();
      setGatewayKey("");
      setMessage("Device Gateway access revoked.");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gateway key could not be revoked."); }
    finally { setBusy(false); }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setMessage(`${label} copied.`); }
    catch { setError("Clipboard access was blocked by this browser."); }
  }
  async function exportCalendar() {
    if (!user) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const count = await downloadReminderCalendar(user.uid);
      setMessage(`Calendar exported with ${count} active reminder${count === 1 ? "" : "s"}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Calendar export failed."); }
    finally { setBusy(false); }
  }
  if (!user) return null;

  return <main className="tt-integration-page">
    <PageBackButton fallbackPath="/account/settings" label="Back to Settings" />
    <header className="tt-integration-hero">
      <div>
        <span className="tt-integration-kicker">TINY TITANS · FREE INTEGRATION PLATFORM</span>
        <h1><TinyTitansIcon name="link" size={29} /> Integration Hub</h1>
        <p>Connect keeper hardware and open tools without adding paid APIs, SaaS subscriptions or metered third-party services to Tiny Titans.</p>
      </div>
      <aside>
        <strong>£0</strong><span>optional API budget</span>
        <small>Paid and metered providers are disabled by policy.</small>
      </aside>
    </header>

    {message && <TinyTitansFeedback>{message}</TinyTitansFeedback>}
    {error && <TinyTitansFeedback className="tt-integration-error">{error}</TinyTitansFeedback>}

    <section className="tt-integration-policy">
      <div><TinyTitansIcon name="check" size={20} /><span><strong>Zero-cost mode</strong><small>No optional paid APIs.</small></span></div>
      <div><TinyTitansIcon name="lock" size={20} /><span><strong>Revocable credentials</strong><small>Gateway keys can be rotated instantly.</small></span></div>
      <div><TinyTitansIcon name="power" size={20} /><span><strong>User-owned hardware</strong><small>Home Assistant, MQTT, ESPHome and Node-RED feed one gateway.</small></span></div>
      <div><TinyTitansIcon name="reminders" size={20} /><span><strong>Native push</strong><small>{status?.push.enabledDeviceCount || 0} notification device{status?.push.enabledDeviceCount === 1 ? "" : "s"} connected.</small></span></div>
    </section>

    <section className="tt-integration-section">
      <div className="tt-integration-section__head">
        <div><span className="tt-integration-kicker">UNIVERSAL DEVICE BRIDGE</span><h2>Connected Enclosures gateway</h2><p>Home Assistant, MQTT bridges, ESPHome, Node-RED and custom sensors can all send the same small JSON payload into Tiny Titans.</p></div>
        <span className={status?.gateway.enabled ? "is-connected" : "is-available"}>{status?.gateway.enabled ? "CONNECTED" : "AVAILABLE"}</span>
      </div>
      <div className="tt-integration-gateway-grid">
        <article className="tt-integration-panel">
          <label>Gateway endpoint</label>
          <div className="tt-integration-copyrow"><code>{endpoint}</code><button type="button" onClick={() => void copy(endpoint, "Endpoint")}>Copy</button></div>
          <p>Authenticate with <code>Authorization: Bearer YOUR_GATEWAY_KEY</code>. Tiny Titans stores only a SHA-256 hash of the key.</p>
          {status?.gateway.enabled && <p className="tt-integration-meta">Key ending <strong>…{status.gateway.keySuffix}</strong> · created {when(status.gateway.createdAt)} · last used {when(status.gateway.lastUsedAt)}</p>}
          <div className="tt-integration-actions">
            <button type="button" className="is-primary" disabled={busy} onClick={() => void generateKey()}>{busy ? "Working…" : status?.gateway.enabled ? "Rotate gateway key" : "Generate gateway key"}</button>
            {status?.gateway.enabled && <button type="button" disabled={busy} onClick={() => void revokeKey()}>Revoke</button>}
          </div>
          {gatewayKey && <div className="tt-integration-secret"><strong>Shown once</strong><code>{gatewayKey}</code><button type="button" onClick={() => void copy(gatewayKey, "Gateway key")}>Copy key</button><small>Put this in your Home Assistant, MQTT bridge, ESPHome/Node-RED flow or custom sender. Do not post it publicly.</small></div>}
        </article>
        <article className="tt-integration-panel">
          <label>Accepted telemetry example</label>
          <pre>{samplePayload}</pre>
          <p>Supported now: temperature, humidity, battery, power, light, CO₂, pressure, water level and common on/off states. Invalid or stale payloads are rejected before storage.</p>
        </article>
      </div>
    </section>

    <section className="tt-integration-section">
      <div className="tt-integration-section__head">
        <div><span className="tt-integration-kicker">FREE CONNECTORS</span><h2>One gateway, several ecosystems</h2></div>
      </div>
      <div className="tt-integration-provider-grid">
        {(status?.providers || []).map((provider) => <article key={provider.id}><TinyTitansIcon name={provider.id === "calendar_ics" ? "reminders" : provider.id === "push" ? "reminders" : "link"} size={21} /><div><strong>{provider.name}</strong><small>£0 integration cost</small></div><span>{provider.status}</span></article>)}
      </div>
    </section>

    <section className="tt-integration-section">
      <div className="tt-integration-section__head">
        <div><span className="tt-integration-kicker">LIVE ENVIRONMENT</span><h2>Connected devices</h2><p>The latest validated reading is visible here. Historical readings are stored for future enclosure graphs and correlation tools.</p></div>
        <button type="button" onClick={() => void refresh()}>Refresh</button>
      </div>
      <div className="tt-integration-device-grid">
        {status?.devices.length ? status.devices.map((device) => <DeviceCard key={device.id} device={device} />) : <article className="tt-integration-empty"><TinyTitansIcon name="enclosure" size={27} /><strong>No devices have reported yet</strong><p>Generate a gateway key, send the example payload from a bridge or sensor, then refresh this page.</p></article>}
      </div>
    </section>

    <section className="tt-integration-section">
      <div className="tt-integration-section__head">
        <div><span className="tt-integration-kicker">OPEN STANDARD</span><h2>Calendar export</h2><p>Export active Tiny Titans reminders as a standard ICS calendar. No Google Calendar API or paid calendar service is required.</p></div>
        <button type="button" className="is-primary" disabled={busy} onClick={() => void exportCalendar()}><TinyTitansIcon name="export" size={16} /> Export .ics</button>
      </div>
    </section>
  </main>;
}
