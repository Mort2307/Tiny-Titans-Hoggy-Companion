import { useEffect, useMemo, useState } from "react";
import type { Enclosure, ConnectedDevice } from "../types/Enclosure";

const GOVEE_DEVICES_URL = "https://openapi.api.govee.com/router/api/v1/user/devices";
const GOVEE_STATE_URL = "https://openapi.api.govee.com/router/api/v1/device/state";
const GOVEE_HELP_URL = "https://developer.govee.com/reference/apply-you-govee-api-key";
const INKBIRD_APP_URL = "https://www.inkbird.com/pages/app/1000";

type Props = { enclosure: Enclosure; onChange: (next: Enclosure) => void };
type GoveeCapability = { type?: string; instance?: string; state?: { value?: unknown } };
type GoveeDevice = { sku: string; device: string; deviceName?: string; type?: string; capabilities?: GoveeCapability[] };
type GoveeResponse = { code?: number; message?: string; data?: GoveeDevice[]; payload?: GoveeDevice };

function getSensorValues(device: GoveeDevice) {
  const result: { temperature?: number; humidity?: number; online?: boolean } = {};
  for (const capability of device.capabilities ?? []) {
    const value = capability.state?.value;
    if ((capability.instance === "sensorTemperature" || capability.instance === "temperature") && typeof value === "number") result.temperature = value;
    if ((capability.instance === "sensorHumidity" || capability.instance === "humidity") && typeof value === "number") result.humidity = value;
    if (capability.instance === "online") result.online = value === true;
  }
  return result;
}

export default function ConnectedDevicePanel({ enclosure, onChange }: Props) {
  const [provider, setProvider] = useState<"Govee" | "Inkbird">("Govee");
  const [apiKey, setApiKey] = useState("");
  const [devices, setDevices] = useState<GoveeDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(enclosure.connectedDevice?.deviceId ?? "");
  const [reading, setReading] = useState<{ temperature?: number; humidity?: number; online?: boolean }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const connected = enclosure.connectedDevice;
  const selected = useMemo(() => devices.find((device) => device.device === selectedDeviceId), [devices, selectedDeviceId]);

  useEffect(() => { setSelectedDeviceId(enclosure.connectedDevice?.deviceId ?? ""); }, [enclosure.connectedDevice?.deviceId]);

  async function goveeRequest(url: string, init?: RequestInit) {
    if (!apiKey.trim()) throw new Error("Enter your Govee API key first. Tiny Titans keeps this key in this browser session and does not save it to the enclosure record.");
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", "Govee-API-Key": apiKey.trim(), ...(init?.headers ?? {}) } });
    if (!response.ok) throw new Error(`Govee returned HTTP ${response.status}. Check the API key and device access.`);
    const payload = await response.json() as GoveeResponse;
    if (payload.code && payload.code !== 200) throw new Error(payload.message || `Govee returned code ${payload.code}.`);
    return payload;
  }

  async function discoverGovee() {
    setBusy(true); setMessage("");
    try {
      const payload = await goveeRequest(GOVEE_DEVICES_URL);
      setDevices(payload.data ?? []);
      setMessage(payload.data?.length ? `${payload.data.length} Govee device${payload.data.length === 1 ? "" : "s"} found.` : "No compatible Govee devices were returned.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to read Govee devices."); }
    finally { setBusy(false); }
  }

  async function readGoveeDevice(device = selected) {
    if (!device) { setMessage("Choose a Govee device first."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await goveeRequest(GOVEE_STATE_URL, { method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), payload: { sku: device.sku, device: device.device } }) });
      const stateDevice = response.payload ? { ...device, ...response.payload } : device;
      const values = getSensorValues(stateDevice);
      setReading(values);
      setMessage(values.temperature !== undefined || values.humidity !== undefined ? "Live Govee reading received." : "Govee responded, but this device did not expose a readable temperature/humidity value.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to read the Govee device."); }
    finally { setBusy(false); }
  }

  function connectGovee() {
    if (!selected) { setMessage("Choose a Govee device first."); return; }
    const next: ConnectedDevice = { provider: "Govee", deviceId: selected.device, model: selected.sku, name: selected.deviceName || selected.sku, connectedAt: new Date().toISOString() };
    onChange({ ...enclosure, connectedDevice: next });
    setMessage("Govee device linked to this enclosure. Use Read current state for the latest device data.");
  }

  function disconnect() {
    onChange({ ...enclosure, connectedDevice: undefined });
    setReading(undefined);
    setMessage("Connected device removed from this enclosure.");
  }

  return <section className="husbandry-panel" aria-labelledby="connected-device-title">
    <div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">📡 CONNECTED DEVICE</p><h3 id="connected-device-title">Read environmental devices</h3><p className="husbandry-muted">Link supported sensors to this enclosure. Device readings are evidence from the device, not a health diagnosis.</p></div></div>
    <div className="husbandry-form-grid">
      <label>Manufacturer<select value={provider} onChange={(event) => { setProvider(event.target.value as "Govee" | "Inkbird"); setMessage(""); }}><option>Govee</option><option>Inkbird</option></select></label>
      {provider === "Govee" ? <>
        <label>Govee API key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your Govee API key" autoComplete="off" /></label>
        <div className="husbandry-links" style={{ gridColumn: "1 / -1" }}><a href={GOVEE_HELP_URL} target="_blank" rel="noreferrer">↗ Get a Govee API key</a><button type="button" className="husbandry-button" onClick={() => void discoverGovee()} disabled={busy}>{busy ? "Reading…" : "🔎 Find Govee devices"}</button></div>
        {devices.length > 0 && <label style={{ gridColumn: "1 / -1" }}>Device<select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}><option value="">Choose a device</option>{devices.map((device) => <option key={device.device} value={device.device}>{device.deviceName || device.sku} · {device.sku}</option>)}</select></label>}
        {selected && <div className="husbandry-links" style={{ gridColumn: "1 / -1" }}><button type="button" className="husbandry-button" onClick={connectGovee}>🔗 Link to enclosure</button><button type="button" className="husbandry-button husbandry-button--primary" onClick={() => void readGoveeDevice()} disabled={busy}>{busy ? "Reading…" : "🌡️ Read current state"}</button></div>}
      </> : <div style={{ gridColumn: "1 / -1" }} className="husbandry-callout good"><strong>Inkbird</strong><p>Use the official INKBIRD app to connect and manage supported smart controllers and sensors. Tiny Titans does not reverse-engineer or scrape the INKBIRD app. Where a supported integration is available, Tiny Titans can read device data; otherwise you can still keep the manufacturer and equipment record here.</p><a href={INKBIRD_APP_URL} target="_blank" rel="noreferrer">↗ Open INKBIRD App</a></div>}
    </div>
    {connected && <div className="husbandry-growth-grid" style={{ marginTop: 18 }}><article><span>Linked device</span><strong>{connected.name}</strong><small>{connected.provider} · {connected.model || "Model not reported"}</small></article><article><span>Latest device reading</span><strong>{reading?.temperature !== undefined ? `${reading.temperature}°C` : "Not read yet"}</strong><small>{reading?.humidity !== undefined ? `${reading.humidity}% RH` : "Humidity not exposed"}</small></article><article><span>Device status</span><strong>{reading?.online === undefined ? "Unknown" : reading.online ? "Online" : "Offline / stale"}</strong><small>State comes from the connected device response.</small></article><article><span>Connection</span><strong>{connected.provider === "Govee" ? "API linked" : "Manufacturer linked"}</strong><button type="button" className="husbandry-button" onClick={disconnect}>Disconnect</button></article></div>}
    {message && <p className="husbandry-save-message" role="status">{message}</p>}
    {provider === "Govee" && <p className="husbandry-muted" style={{ marginTop: 14 }}>Security note: the Govee API key is held only in this browser session and is not written into the enclosure record.</p>}
  </section>;
}
