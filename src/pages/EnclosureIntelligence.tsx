import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import type { Enclosure, EnvironmentHistoryEntry, HeatingType, SubstrateMixPart, SubstrateType } from "../types/Enclosure";
import { husbandryReferenceBands } from "../data/husbandryReferences";
import "../styles/husbandry-care.css";

type EnvironmentKey = "warmSideTemperature" | "coolSideTemperature" | "ambientTemperature" | "baskingTemperature" | "nightTemperature" | "humidity";
type EnclosureField = "dimensions" | "enclosureType" | "heating" | "thermostat" | "substrate" | "uvb" | "hides" | "water" | "furnishings" | "bioactive" | "maintenance" | "all";
type DraftReadings = Record<EnvironmentKey, string>;
type TextListField = "plants" | "decorations" | "cleanupCrew";

type Metric = { key: EnvironmentKey; label: string; unit: string; min: number; max: number; icon: string };

const metrics: Metric[] = [
  { key: "warmSideTemperature", label: "Warm side", unit: "°C", min: husbandryReferenceBands.temperature.warmMinC, max: husbandryReferenceBands.temperature.warmMaxC, icon: "🌡️" },
  { key: "coolSideTemperature", label: "Cool side", unit: "°C", min: husbandryReferenceBands.temperature.coolMinC, max: husbandryReferenceBands.temperature.coolMaxC, icon: "❄️" },
  { key: "ambientTemperature", label: "Ambient", unit: "°C", min: husbandryReferenceBands.temperature.coolMinC, max: husbandryReferenceBands.temperature.warmMaxC, icon: "🌬️" },
  { key: "baskingTemperature", label: "Basking / surface", unit: "°C", min: husbandryReferenceBands.temperature.baskingMinC, max: husbandryReferenceBands.temperature.baskingMaxC, icon: "☀️" },
  { key: "nightTemperature", label: "Night", unit: "°C", min: 16, max: husbandryReferenceBands.temperature.warmMaxC, icon: "🌙" },
  { key: "humidity", label: "Humidity", unit: "%", min: husbandryReferenceBands.humidity.minPercent, max: husbandryReferenceBands.humidity.maxPercent, icon: "💧" },
];

const heatingTypes: HeatingType[] = ["Heat Mat", "CHE", "Halogen", "Deep Heat Projector", "Radiant Heat Panel", "Other"];
const heatingDevices = [
  "Arcadia Deep Heat Projector",
  "Arcadia Halogen Basking Spot",
  "Arcadia Solar Basking Flood",
  "Arcadia Ceramic Heat Emitter",
  "Exo Terra Ceramic Heat Emitter",
  "Habistat Ceramic Heat Emitter",
  "ProRep Ceramic Heat Emitter",
  "Komodo Ceramic Heat Emitter",
  "Heat mat",
  "Radiant heat panel",
  "Other / custom",
];
const thermostatOptions = [
  "Microclimate EVO Connected 600W",
  "Microclimate EVO Lite",
  "Microclimate B2",
  "Microclimate Habistat Dimming",
  "Habistat Dimming Thermostat",
  "Habistat Pulse Proportional",
  "Habistat On/Off Thermostat",
  "Exo Terra 600W Thermostat",
  "Komodo Dimming Thermostat",
  "Inkbird ITC-306T",
  "On/off thermostat",
  "Pulse proportional thermostat",
  "Dimming thermostat",
  "Other / custom",
];
const uvbOptions = ["Arcadia T5 HO UVB", "Arcadia T8 UVB", "Compact UVB", "Mercury vapour", "LED only", "Custom / other"];
const enclosureTypeOptions = ["Glass vivarium", "PVC vivarium", "Wood vivarium", "Melamine vivarium", "Plastic enclosure", "Rack tub", "Other / custom"];
const substrateTypes: SubstrateType[] = ["Aspen", "Coco Fibre", "Bioactive", "Soil Mix", "Sand Mix", "Other"];

const substratePresets: Array<{ name: string; description: string; parts: SubstrateMixPart[]; substrate: SubstrateType }> = [
  { name: "70 / 30 Aspen + Coco", description: "Aspen-dominant dry mix with added fibre structure.", parts: [{ material: "Aspen", percentage: 70 }, { material: "Coco fibre", percentage: 30 }], substrate: "Aspen" },
  { name: "80 / 20 Soil + Sand", description: "Soil-based mix with a mineral component; actual materials and moisture behaviour matter.", parts: [{ material: "Soil", percentage: 80 }, { material: "Sand", percentage: 20 }], substrate: "Soil Mix" },
  { name: "Bioactive-style base", description: "A starting substrate profile for a bioactive setup, not a universal recipe.", parts: [{ material: "Soil", percentage: 60 }, { material: "Sand", percentage: 20 }, { material: "Organic matter", percentage: 20 }], substrate: "Bioactive" },
];

const emptyReadings: DraftReadings = { warmSideTemperature: "", coolSideTemperature: "", ambientTemperature: "", baskingTemperature: "", nightTemperature: "", humidity: "" };

function readingStatus(value: number | undefined, min: number, max: number) {
  if (value === undefined) return "unknown";
  return value >= min && value <= max ? "good" : "check";
}

function blankEnclosure(snake: Snake): Enclosure {
  return snake.enclosure ?? { id: `enclosure-${snake.id}`, snakeId: snake.id, length: 0, width: 0, height: 0, enclosureType: "", substrate: "Other", heatingType: "Other", uvbEnabled: false, hides: 0, waterBowl: false, bioactive: false, environmentHistory: [] };
}

function formatRecordedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function normaliseMix(parts: SubstrateMixPart[]) {
  return parts.filter((part) => part.material.trim() && Number.isFinite(part.percentage) && part.percentage > 0);
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function optionValues(options: string[], current?: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

export default function EnclosureIntelligence() {
  const { id } = useParams();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedId, setSelectedId] = useState(id ?? "");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [editingEnvironment, setEditingEnvironment] = useState<EnvironmentKey | "all" | null>(null);
  const [readings, setReadings] = useState<DraftReadings>(emptyReadings);
  const [savingReadings, setSavingReadings] = useState(false);
  const [editingField, setEditingField] = useState<EnclosureField | null>(null);
  const [enclosureDraft, setEnclosureDraft] = useState<Enclosure | null>(null);
  const [mixParts, setMixParts] = useState<SubstrateMixPart[]>([]);
  const [savingEnclosure, setSavingEnclosure] = useState(false);
  const [message, setMessage] = useState("");
  const [listDrafts, setListDrafts] = useState<Record<TextListField, string>>({ plants: "", decorations: "", cleanupCrew: "" });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true); setError("");
    try {
      const loaded = await getUserSnakes(user.uid);
      setSnakes(loaded);
      setSelectedId((current) => loaded.some((snake) => snake.id === current) ? current : id && loaded.some((snake) => snake.id === id) ? id : loaded[0]?.id ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load enclosure data."); }
    finally { setLoadingData(false); }
  }, [user, id]);

  useEffect(() => { if (!user || loading || profileLoading) return; void loadData(); }, [user, loading, profileLoading, loadData]);

  const snake = useMemo(() => snakes.find((item) => item.id === selectedId) ?? snakes[0], [snakes, selectedId]);
  const enclosure = useMemo(() => snake ? blankEnclosure(snake) : null, [snake]);
  const area = enclosure && enclosure.length > 0 && enclosure.width > 0 ? enclosure.length * enclosure.width : 0;
  const volume = area > 0 && enclosure && enclosure.height > 0 ? area * enclosure.height : 0;
  const completenessChecks = enclosure ? [enclosure.length > 0, enclosure.width > 0, enclosure.height > 0, Boolean(enclosure.enclosureType), enclosure.heatingType !== "Other", Boolean(enclosure.heatingDevice), enclosure.substrate !== "Other", Boolean(enclosure.thermostat), enclosure.hides > 0, enclosure.waterBowl, Boolean(enclosure.uvbEnabled || enclosure.uvbDetails), Boolean(enclosure.uvbPhotoperiodHours), Boolean(enclosure.plants?.length || enclosure.decorations?.length)] : [];
  const completeness = completenessChecks.filter(Boolean).length;
  const completenessPercent = completenessChecks.length ? Math.round((completeness / completenessChecks.length) * 100) : 0;
  const environmentHistory = useMemo(() => [...(enclosure?.environmentHistory ?? [])].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)), [enclosure]);
  const environmentReview = snake ? metrics.filter(({ key, min, max }) => readingStatus(snake.enclosure?.[key], min, max) === "check").length : 0;
  const environmentCoverage = snake ? metrics.filter(({ key }) => typeof snake.enclosure?.[key] === "number").length : 0;

  const nextBestRecord = useMemo(() => {
    if (!enclosure || !snake) return "Build the enclosure profile first so later environment readings have context.";
    const priorities: Array<[boolean, string]> = [
      [enclosure.length <= 0 || enclosure.width <= 0 || enclosure.height <= 0, "Add the enclosure dimensions next. Tiny Titans can then calculate floor area and volume automatically."],
      [enclosure.heatingType === "Other" || !enclosure.heatingDevice, "Add the heating source next. That gives environmental readings a real equipment context."],
      [!enclosure.thermostat, "Add the thermostat next so temperature records can be interpreted alongside the recorded control setup."],
      [enclosure.substrate === "Other", "Record the actual substrate next. You do not need to fill unrelated fields just to raise completeness."],
      [environmentCoverage < metrics.length, "Record the next environmental measurement when you actually take it. Never invent a value just to complete the record."],
    ];
    return priorities.find(([missing]) => missing)?.[1] ?? "Keep recording consistent readings. Repeated personal evidence is more useful than chasing a perfect completeness score.";
  }, [enclosure, snake, environmentCoverage]);

  function openEnvironment(which: EnvironmentKey | "all") {
    if (!snake) return;
    const current: DraftReadings = { ...emptyReadings };
    for (const metric of metrics) { const value = snake.enclosure?.[metric.key]; current[metric.key] = typeof value === "number" ? String(value) : ""; }
    setReadings(current); setMessage(""); setEditingEnvironment(which);
  }

  async function saveEnvironment() {
    if (!user || !snake) return;
    const values: Partial<Record<EnvironmentKey, number>> = {};
    for (const metric of metrics) {
      const raw = readings[metric.key].trim(); if (!raw) continue;
      const value = Number(raw); if (!Number.isFinite(value) || value < 0) { setMessage(`${metric.label} must be a valid non-negative number.`); return; }
      values[metric.key] = value;
    }
    if (!Object.keys(values).length) { setMessage("Enter at least one measured reading before saving."); return; }
    setSavingReadings(true); setMessage("");
    try {
      const current = blankEnclosure(snake); const now = new Date().toISOString();
      const historyEntry: EnvironmentHistoryEntry = { id: `environment-${Date.now()}`, snakeId: snake.id, enclosureId: current.id, recordedAt: now, source: "manual", ...values, heatingType: current.heatingType, heatingDevice: current.heatingDevice, thermostat: current.thermostat };
      const updated = await updateUserSnake(user.uid, { ...snake, enclosure: { ...current, ...values, environmentHistory: [historyEntry, ...(current.environmentHistory ?? [])].slice(0, 100) } });
      setSnakes((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditingEnvironment(null); setMessage("Environment reading saved with its time and enclosure context.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save environment readings."); }
    finally { setSavingReadings(false); }
  }

  function startEnclosureEdit(field: EnclosureField) {
    if (!snake) return;
    const current = blankEnclosure(snake);
    setEnclosureDraft(current); setMixParts(current.substrateMix?.length ? current.substrateMix : []); setMessage("");
    setListDrafts({ plants: current.plants?.join(", ") ?? "", decorations: current.decorations?.join(", ") ?? "", cleanupCrew: current.cleanupCrew?.join(", ") ?? "" });
    setEditingField(field);
  }

  function updateEnclosure<K extends keyof Enclosure>(key: K, value: Enclosure[K]) { setEnclosureDraft((current) => current ? { ...current, [key]: value } : current); }
  function applySubstratePreset(preset: typeof substratePresets[number]) { setMixParts(preset.parts); setEnclosureDraft((current) => current ? { ...current, substrate: preset.substrate, customSubstrate: preset.name, substrateMix: preset.parts } : current); }
  function updateMix(index: number, key: keyof SubstrateMixPart, value: string) { setMixParts((parts) => parts.map((part, partIndex) => partIndex === index ? { ...part, [key]: key === "percentage" ? Math.max(0, Number(value) || 0) : value } : part)); }
  function addMixPart() { setMixParts((parts) => [...parts, { material: "", percentage: 0 }]); }
  function removeMixPart(index: number) { setMixParts((parts) => parts.filter((_, partIndex) => partIndex !== index)); }

  async function saveEnclosure() {
    if (!user || !snake || !enclosureDraft) return;
    if (enclosureDraft.length < 0 || enclosureDraft.width < 0 || enclosureDraft.height < 0) { setMessage("Enclosure dimensions cannot be negative."); return; }
    const cleanMix = normaliseMix(mixParts);
    if (editingField === "substrate" && cleanMix.length > 0) { const total = cleanMix.reduce((sum, part) => sum + part.percentage, 0); if (Math.round(total * 10) / 10 !== 100) { setMessage(`Substrate mix currently totals ${total}%. The mix must total exactly 100%.`); return; } }
    setSavingEnclosure(true); setMessage("");
    try {
      const updated = await updateUserSnake(user.uid, { ...snake, enclosure: { ...enclosureDraft, snakeId: snake.id, plants: splitList(listDrafts.plants), decorations: splitList(listDrafts.decorations), cleanupCrew: splitList(listDrafts.cleanupCrew), substrateMix: cleanMix.length ? cleanMix : undefined } });
      setSnakes((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditingField(null); setMessage("Enclosure profile saved.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save the enclosure profile."); }
    finally { setSavingEnclosure(false); }
  }

  if (loadingData || loading || profileLoading) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-hero"><p className="husbandry-eyebrow">Tiny Titans Intelligence</p><h1>🏠 Enclosure Intelligence</h1><p>Building the enclosure and environment picture…</p></section></main>;
  if (error) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-panel"><h1>🏠 Enclosure Intelligence</h1><p>{error}</p><button className="husbandry-button" type="button" onClick={() => void loadData()}>Try again</button></section></main>;
  if (!snake || !enclosure) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-panel"><h1>🏠 Enclosure Intelligence</h1><p>Add a Tiny Titan first and this page will build its enclosure and environment picture.</p></section></main>;

  const profileCards: Array<{ field: EnclosureField; icon: string; title: string; value: string; description: string }> = [
    { field: "dimensions", icon: "📐", title: "Dimensions", value: enclosure.length && enclosure.width && enclosure.height ? `${enclosure.length} × ${enclosure.width} × ${enclosure.height} cm` : "Not recorded", description: area ? `${area.toLocaleString()} cm² floor area` : "Floor area and volume calculate automatically" },
    { field: "enclosureType", icon: "🧱", title: "Enclosure type", value: enclosure.enclosureType || "Not recorded", description: "Actual enclosure" },
    { field: "substrate", icon: "🪵", title: "Substrate", value: enclosure.substrate !== "Other" ? enclosure.substrate : "Not recorded", description: enclosure.substrateMix?.length ? enclosure.substrateMix.map((part) => `${part.percentage}% ${part.material}`).join(" · ") : enclosure.customSubstrate || "Tap to choose a mix" },
    { field: "heating", icon: "🔥", title: "Heating", value: enclosure.heatingType !== "Other" ? enclosure.heatingType : "Not recorded", description: enclosure.heatingDevice || "Heat source not recorded" },
    { field: "thermostat", icon: "🎛️", title: "Thermostat", value: enclosure.thermostat || "Not recorded", description: "Controller / model" },
    { field: "uvb", icon: "☀️", title: "UVB / lighting", value: enclosure.uvbEnabled ? "Provided" : "Not recorded", description: enclosure.uvbDetails || "Lamp / strength / photoperiod" },
    { field: "hides", icon: "🏠", title: "Hides", value: enclosure.hides > 0 ? String(enclosure.hides) : "Not recorded", description: "Secure cover" },
    { field: "water", icon: "💧", title: "Water", value: enclosure.waterBowl ? "Provided" : "Not recorded", description: "Drinking water provision" },
    { field: "furnishings", icon: "🌿", title: "Furnishings", value: enclosure.plants?.length || enclosure.decorations?.length ? "Recorded" : "Not recorded", description: "Plants / branches / decorations" },
    { field: "bioactive", icon: "🪱", title: "Bioactive", value: enclosure.bioactive ? "Yes" : "No", description: enclosure.cleanupCrew?.length ? `${enclosure.cleanupCrew.length} cleanup-crew entries` : "Bioactive status" },
    { field: "maintenance", icon: "🧹", title: "Last cleaned", value: enclosure.lastCleanedDate || "Not recorded", description: "Maintenance record" },
  ];
  const fieldTitle = profileCards.find((card) => card.field === editingField)?.title ?? "Enclosure";
  const mixTotal = mixParts.reduce((sum, part) => sum + (Number(part.percentage) || 0), 0);
  const mixTotalLabel = `${Math.round(mixTotal * 10) / 10}%`;

  return <main className="page-container husbandry-page">
    <BackHomeButton />
    <header className="husbandry-hero"><div><p className="husbandry-eyebrow">Tiny Titans Intelligence</p><h1>🏠 Enclosure Intelligence</h1><p>One connected enclosure and environment workspace for <strong>{snake.name}</strong>.</p></div><div className="husbandry-badge">{environmentReview ? "🟠 Review context" : snake.enclosure ? "🟢 Profile connected" : "🔵 Build profile"}</div></header>

    <section className="husbandry-panel husbandry-selector"><label htmlFor="enclosure-snake">🐍 Selected Tiny Titan</label><select id="enclosure-snake" value={snake.id} onChange={(event) => setSelectedId(event.target.value)}>{snakes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="husbandry-muted">This page follows the selected snake's actual enclosure record. No generic vivarium is assumed.</p></section>

    <section className="husbandry-panel" id="enclosure-intelligence">
      <div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">🏠 VIVARIUM / ENCLOSURE INTELLIGENCE</p><h2>{snake.name}'s enclosure</h2><p className="husbandry-muted">Track the actual setup, not a generic imaginary vivarium.</p></div><button type="button" className="husbandry-button husbandry-button--primary" onClick={() => startEnclosureEdit("all")}>✏️ Edit full enclosure</button></div>
      <div className="husbandry-enclosure-score"><div><span>Setup record</span><strong>{completenessPercent}%</strong></div><div><span>Floor area</span><strong>{area ? `${area.toLocaleString()} cm²` : "Not recorded"}</strong></div><div><span>Volume</span><strong>{volume ? `${(volume / 1000).toFixed(1)} L` : "Not recorded"}</strong></div><p style={{ marginTop: 24 }}>Completeness is a record-coverage measure, <strong>not a husbandry or health score</strong>.</p></div>
      <div className="husbandry-enclosure-grid" style={{ marginTop: 28 }}>{profileCards.map((card) => <button key={card.field} type="button" className="husbandry-enclosure-tile" onClick={() => startEnclosureEdit(card.field)} aria-label={`Edit ${card.title}`}><span>{card.icon}</span><strong>{card.title}</strong><b>{card.value}</b><small>{card.description}</small><em>✏️ Tap to edit</em></button>)}</div>
      <div className="husbandry-enclosure-note"><strong>🧠 Intelligent interpretation</strong><p>{!snake.enclosure ? `Tiny Titans has no saved enclosure profile for ${snake.name} yet. Build it once and the environment tiles below can use the same record.` : completeness < completenessChecks.length ? `Tiny Titans has ${completeness} of ${completenessChecks.length} useful setup areas documented. The next most valuable record is: ${nextBestRecord}` : `${snake.name}'s enclosure profile is fully documented across the tracked setup fields. Tiny Titans can now use enclosure configuration as context for environmental history rather than treating isolated readings as standalone facts.`}</p></div>
    </section>

    <section className="husbandry-panel" id="environment-intelligence"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">🌡️ ENVIRONMENT INTELLIGENCE</p><h2>Tap a tile to record it</h2><p className="husbandry-muted">Each saved reading carries its snake, enclosure, timestamp and active heating context. The current tile is only the latest state; history is retained below.</p></div><button className="husbandry-button husbandry-button--primary" type="button" onClick={() => openEnvironment("all")}>➕ Log readings</button></div><div className="husbandry-grid husbandry-grid--four">{metrics.map(({ key, label, unit, min, max, icon }) => { const value = snake.enclosure?.[key]; const state = readingStatus(value, min, max); return <button key={key} type="button" className="husbandry-metric husbandry-metric--button" onClick={() => openEnvironment(key)}><span>{icon} {label}</span><strong>{typeof value === "number" ? `${value}${unit}` : "Not recorded"}</strong><em className={state}>{state === "good" ? "🟢 Within reference" : state === "check" ? "🟠 Worth reviewing" : "🔵 Not enough data"}</em><small>Reference: {min}–{max}{unit}</small><b>Tap to record</b></button>; })}</div><div className="husbandry-growth-grid"><article><span>Current coverage</span><strong>{environmentCoverage}/{metrics.length}</strong><small>Current environment measurements actually recorded.</small></article><article><span>Recorded history</span><strong>{environmentHistory.length}</strong><small>Timestamped environment snapshots retained for this enclosure.</small></article><article><span>Latest reading</span><strong>{environmentHistory[0] ? formatRecordedAt(environmentHistory[0].recordedAt) : "None yet"}</strong><small>History is never invented to fill a gap.</small></article><article><span>Heating context</span><strong>{enclosure.heatingType !== "Other" ? enclosure.heatingType : "Not recorded"}</strong><small>Equipment context is captured with new readings.</small></article></div></section>

    <section className="husbandry-panel"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">📈 ENVIRONMENT HISTORY</p><h2>What changed, and when?</h2><p className="husbandry-muted">Historical readings remain attached to the enclosure configuration that existed when they were recorded.</p></div></div>{environmentHistory.length === 0 ? <div className="husbandry-callout good">No environment history yet. Record the next real measurement and Tiny Titans will start building {snake.name}'s individual baseline without asking you to reconstruct old history.</div> : <div className="husbandry-links">{environmentHistory.slice(0, 8).map((entry) => <article key={entry.id} className="husbandry-panel"><strong>{formatRecordedAt(entry.recordedAt)}</strong><p>{metrics.filter(({ key }) => typeof entry[key] === "number").map(({ key, label, unit }) => `${label}: ${entry[key]}${unit}`).join(" · ") || "No numeric readings"}</p><small>Source: {entry.source} · Heating: {entry.heatingType}{entry.heatingDevice ? ` · ${entry.heatingDevice}` : ""}{entry.thermostat ? ` · ${entry.thermostat}` : ""}</small></article>)}</div>}</section>

    <section className="husbandry-panel"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">🧠 INTELLIGENT INTERPRETATION</p><h2>Context before conclusions</h2></div><span className={`husbandry-assessment-badge ${environmentReview ? "check" : "good"}`}>{environmentReview ? "Context needs review" : "Evidence-led"}</span></div><div className={`husbandry-callout ${environmentReview ? "check" : "good"}`}>{!snake.enclosure ? `There is no saved enclosure profile for ${snake.name} yet. Build the profile first; environmental readings can then be interpreted alongside the recorded setup.` : environmentReview ? `${environmentReview} current reading${environmentReview === 1 ? " is" : "s are"} outside the encoded reference band. That is a prompt to review the measurement, location, timing and wider enclosure context — not a diagnosis and not an instruction to change a stable setup from one reading.` : environmentCoverage === 0 ? `Tiny Titans does not have current environment measurements for ${snake.name} yet. That is missing evidence, not evidence of a problem.` : "The current recorded readings sit within the encoded reference bands. Repeated measurements are more informative than isolated values, so Tiny Titans will build confidence from the personal history rather than overreacting to one reading."}</div><div className="husbandry-growth-grid"><article><span>Setup coverage</span><strong>{completenessPercent}%</strong><small>Record coverage only; never a health score.</small></article><article><span>Environment history</span><strong>{environmentHistory.length}</strong><small>Timestamped personal evidence.</small></article><article><span>Calculated floor area</span><strong>{area ? `${area.toLocaleString()} cm²` : "Missing"}</strong><small>Derived from length × width.</small></article><article><span>Calculated volume</span><strong>{volume ? `${(volume / 1000).toFixed(1)} L` : "Missing"}</strong><small>Derived only when all dimensions exist.</small></article></div><p className="husbandry-muted"><strong>Important:</strong> a missing record is not evidence that something is absent, and an out-of-band reading is not automatically evidence of a husbandry problem. Tiny Titans should ask for context before suggesting action.</p></section>

    <section className="husbandry-grid"><article className="husbandry-panel"><h2>🔗 Connected intelligence</h2><p>This page is the source of truth for enclosure and environment context. Other areas should surface summaries and link back here.</p><div className="husbandry-links"><a href={`/snakes/${snake.id}/weights`}>⚖️ Weight Records</a><a href={`/snakes/${snake.id}/feeding`}>🍽️ Feeding</a><a href={`/snakes/${snake.id}/shedding`}>🐍 Shed Cycle</a><a href={`/snakes/${snake.id}/husbandry`}>🌡️ Husbandry & Care</a><a href={`/snakes/${snake.id}/master-record`}>📋 Master Record</a></div></article><article className="husbandry-panel"><h2>🧭 Next best record</h2><p>{nextBestRecord}</p></article></section>

    {editingField && enclosureDraft && <div className="husbandry-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingField(null); }}><section className="husbandry-modal husbandry-enclosure-modal" role="dialog" aria-modal="true" aria-labelledby="enclosure-editor-title"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">TINY TITANS ENCLOSURE EDITOR</p><h2 id="enclosure-editor-title">🏠 Edit {fieldTitle}</h2><p className="husbandry-muted">Only the selected enclosure area is shown unless you choose the full editor.</p></div><button type="button" className="husbandry-close" onClick={() => setEditingField(null)} aria-label="Close">✕</button></div>
      {editingField === "all" && <div className="husbandry-form-grid"><label>Length (cm)<input type="number" min="0" step="0.1" value={enclosureDraft.length || ""} onChange={(event) => updateEnclosure("length", Number(event.target.value) || 0)} /></label><label>Width (cm)<input type="number" min="0" step="0.1" value={enclosureDraft.width || ""} onChange={(event) => updateEnclosure("width", Number(event.target.value) || 0)} /></label><label>Height (cm)<input type="number" min="0" step="0.1" value={enclosureDraft.height || ""} onChange={(event) => updateEnclosure("height", Number(event.target.value) || 0)} /></label><label>Enclosure type<select value={enclosureDraft.enclosureType} onChange={(event) => updateEnclosure("enclosureType", event.target.value)}>{optionValues(enclosureTypeOptions, enclosureDraft.enclosureType).map((item) => <option key={item}>{item}</option>)}</select></label><label>Heating type<select value={enclosureDraft.heatingType} onChange={(event) => updateEnclosure("heatingType", event.target.value as HeatingType)}>{heatingTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Heating device<select value={enclosureDraft.heatingDevice || ""} onChange={(event) => updateEnclosure("heatingDevice", event.target.value)}><option value="">Choose device</option>{optionValues(heatingDevices, enclosureDraft.heatingDevice).map((item) => <option key={item}>{item}</option>)}</select></label><label>Thermostat / controller<select value={enclosureDraft.thermostat || ""} onChange={(event) => updateEnclosure("thermostat", event.target.value)}><option value="">Choose thermostat</option>{optionValues(thermostatOptions, enclosureDraft.thermostat).map((item) => <option key={item}>{item}</option>)}</select></label><label>Hides<input type="number" min="0" value={enclosureDraft.hides} onChange={(event) => updateEnclosure("hides", Math.max(0, Number(event.target.value) || 0))} /></label><label>Last cleaned<input type="date" value={enclosureDraft.lastCleanedDate || ""} onChange={(event) => updateEnclosure("lastCleanedDate", event.target.value)} /></label></div>}
      {editingField === "dimensions" && <div className="husbandry-form-grid"><label>Length (cm)<input type="number" min="0" step="0.1" value={enclosureDraft.length || ""} onChange={(event) => updateEnclosure("length", Number(event.target.value) || 0)} /></label><label>Width (cm)<input type="number" min="0" step="0.1" value={enclosureDraft.width || ""} onChange={(event) => updateEnclosure("width", Number(event.target.value) || 0)} /></label><label>Height (cm)<input type="number" min="0" step="0.1" value={enclosureDraft.height || ""} onChange={(event) => updateEnclosure("height", Number(event.target.value) || 0)} /></label></div>}
      {editingField === "enclosureType" && <label className="husbandry-wide-input">Enclosure type<select value={enclosureDraft.enclosureType} onChange={(event) => updateEnclosure("enclosureType", event.target.value)}>{optionValues(enclosureTypeOptions, enclosureDraft.enclosureType).map((item) => <option key={item}>{item}</option>)}</select></label>}
      {editingField === "heating" && <div className="husbandry-form-grid"><label>Heating type<select value={enclosureDraft.heatingType} onChange={(event) => updateEnclosure("heatingType", event.target.value as HeatingType)}>{heatingTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Heating device<select value={enclosureDraft.heatingDevice || ""} onChange={(event) => updateEnclosure("heatingDevice", event.target.value)}><option value="">Choose a device</option>{optionValues(heatingDevices, enclosureDraft.heatingDevice).map((item) => <option key={item}>{item}</option>)}</select></label><p className="husbandry-muted" style={{ gridColumn: "1 / -1" }}>Heating type describes the method; heating device records the actual emitter or equipment. You can leave device blank if you have not identified it.</p></div>}
      {editingField === "thermostat" && <div className="husbandry-form-grid"><label>Thermostat / controller<select value={enclosureDraft.thermostat || ""} onChange={(event) => updateEnclosure("thermostat", event.target.value)}><option value="">Choose a thermostat</option>{optionValues(thermostatOptions, enclosureDraft.thermostat).map((item) => <option key={item}>{item}</option>)}</select></label><p className="husbandry-muted" style={{ gridColumn: "1 / -1" }}>Choose the closest known controller. The list is intentionally scrollable on mobile; "Other / custom" keeps the record honest when a device is not listed.</p></div>}
      {editingField === "substrate" && <div><div className="husbandry-form-grid"><label>Primary substrate<select value={enclosureDraft.substrate} onChange={(event) => updateEnclosure("substrate", event.target.value as SubstrateType)}>{substrateTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Mix name / notes<input value={enclosureDraft.customSubstrate || ""} onChange={(event) => updateEnclosure("customSubstrate", event.target.value)} placeholder="e.g. 70/30 Aspen + Coco" /></label></div><div style={{ marginTop: 22 }}><h3>🪵 Mix presets</h3><p className="husbandry-muted">Presets are curated starting points. They are not a universal 'correct' recipe.</p><div className="husbandry-links">{substratePresets.map((preset) => <button key={preset.name} type="button" className="husbandry-panel" onClick={() => applySubstratePreset(preset)}><strong>⭐ {preset.name}</strong><small>{preset.description}</small><div style={{ marginTop: 8 }}>{preset.parts.map((part) => <div key={part.material} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 5 }}><span style={{ width: `${part.percentage}%`, minWidth: 35, maxWidth: 100, display: "inline-block", padding: "3px 6px", borderRadius: 6, background: "rgba(255,255,255,.12)" }}>{part.percentage}%</span><span>{part.material}</span></div>)}</div></button>)}</div></div><div style={{ marginTop: 22 }}><div className="husbandry-section-heading"><div><h3>Custom mix</h3><p className="husbandry-muted">Total must equal 100%.</p></div><strong>{mixTotalLabel}</strong></div>{mixParts.map((part, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 110px auto", gap: 10, alignItems: "end", marginTop: 10 }}><label>Material<input value={part.material} onChange={(event) => updateMix(index, "material", event.target.value)} /></label><label>%<input type="number" min="0" max="100" value={part.percentage} onChange={(event) => updateMix(index, "percentage", event.target.value)} /></label><button type="button" className="husbandry-button" onClick={() => removeMixPart(index)}>Remove</button></div>)}<button type="button" className="husbandry-button" style={{ marginTop: 12 }} onClick={addMixPart}>＋ Add component</button>{mixParts.length > 0 && <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "rgba(255,255,255,.05)" }}>{mixParts.map((part, index) => <div key={index} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>{part.material || "Unnamed"}</span><strong>{part.percentage}%</strong></div><div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, Math.max(0, part.percentage))}%`, height: "100%", background: "currentColor" }} /></div></div>)}</div>}</div></div>}
      {editingField === "uvb" && <div className="husbandry-form-grid"><label>Lighting / UVB<select value={enclosureDraft.uvbDetails || ""} onChange={(event) => updateEnclosure("uvbDetails", event.target.value)}><option value="">Choose common option</option>{optionValues(uvbOptions, enclosureDraft.uvbDetails).map((item) => <option key={item}>{item}</option>)}</select></label><label>Photoperiod (hours)<input type="number" min="0" max="24" step="0.5" value={enclosureDraft.uvbPhotoperiodHours ?? ""} onChange={(event) => updateEnclosure("uvbPhotoperiodHours", event.target.value === "" ? undefined : Number(event.target.value))} /></label><label className="checkbox"><input type="checkbox" checked={enclosureDraft.uvbEnabled} onChange={(event) => updateEnclosure("uvbEnabled", event.target.checked)} /> UVB provided</label></div>}
      {editingField === "hides" && <label className="husbandry-wide-input">Number of hides<input type="number" min="0" step="1" value={enclosureDraft.hides} onChange={(event) => updateEnclosure("hides", Math.max(0, Number(event.target.value) || 0))} /></label>}
      {editingField === "water" && <label className="checkbox husbandry-wide-input"><input type="checkbox" checked={enclosureDraft.waterBowl} onChange={(event) => updateEnclosure("waterBowl", event.target.checked)} /> Water bowl / drinking water provided</label>}
      {editingField === "furnishings" && <div className="husbandry-form-grid"><label>Plants / soft furnishings<input value={listDrafts.plants} onChange={(event) => setListDrafts((current) => ({ ...current, plants: event.target.value }))} placeholder="Artificial plants, clutter…" /></label><label>Branches / decorations<input value={listDrafts.decorations} onChange={(event) => setListDrafts((current) => ({ ...current, decorations: event.target.value }))} placeholder="Cork, branches, rocks…" /></label><p className="husbandry-muted" style={{ gridColumn: "1 / -1" }}>Use normal spaces and commas freely. Nothing is split or trimmed until you save.</p></div>}
      {editingField === "bioactive" && <div className="husbandry-form-grid"><label className="checkbox"><input type="checkbox" checked={enclosureDraft.bioactive} onChange={(event) => updateEnclosure("bioactive", event.target.checked)} /> Bioactive enclosure</label><label>Cleanup crew<input value={listDrafts.cleanupCrew} onChange={(event) => setListDrafts((current) => ({ ...current, cleanupCrew: event.target.value }))} placeholder="Springtails, dwarf isopods…" /></label><p className="husbandry-muted" style={{ gridColumn: "1 / -1" }}>Spaces and commas are accepted normally and only converted to saved entries when you press Save.</p></div>}
      {editingField === "maintenance" && <label className="husbandry-wide-input">Last cleaned<input type="date" value={enclosureDraft.lastCleanedDate || ""} onChange={(event) => updateEnclosure("lastCleanedDate", event.target.value)} /></label>}
      {editingField === "all" && <div className="husbandry-form-grid"><label>Plants / soft furnishings<input value={listDrafts.plants} onChange={(event) => setListDrafts((current) => ({ ...current, plants: event.target.value }))} placeholder="Artificial plants, clutter…" /></label><label>Branches / decorations<input value={listDrafts.decorations} onChange={(event) => setListDrafts((current) => ({ ...current, decorations: event.target.value }))} placeholder="Cork, branches, rocks…" /></label><label>Cleanup crew<input value={listDrafts.cleanupCrew} onChange={(event) => setListDrafts((current) => ({ ...current, cleanupCrew: event.target.value }))} placeholder="Springtails, dwarf isopods…" /></label><label className="husbandry-wide-input">Notes<textarea value={enclosureDraft.notes || ""} onChange={(event) => updateEnclosure("notes", event.target.value)} rows={4} placeholder="Setup notes, changes, equipment observations…" /></label></div>}
      {message && <p className="husbandry-save-message" role="status">{message}</p>}
      <div className="husbandry-modal-actions"><button type="button" className="husbandry-button" onClick={() => setEditingField(null)} disabled={savingEnclosure}>Cancel</button>{editingField !== "all" && <button type="button" className="husbandry-button" onClick={() => setEditingField("all")}>Edit full enclosure</button>}<button type="button" className="husbandry-button husbandry-button--primary" onClick={() => void saveEnclosure()} disabled={savingEnclosure}>{savingEnclosure ? "Saving…" : "💾 Save changes"}</button></div>
    </section></div>}

    {editingEnvironment && <div className="husbandry-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingEnvironment(null); }}><section className="husbandry-modal" role="dialog" aria-modal="true" aria-labelledby="environment-editor-title"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">TINY TITANS TRACKING</p><h2 id="environment-editor-title">🌡️ {editingEnvironment === "all" ? "Log environment readings" : `Log ${metrics.find((metric) => metric.key === editingEnvironment)?.label ?? "reading"}`}</h2></div><button type="button" className="husbandry-close" onClick={() => setEditingEnvironment(null)} aria-label="Close">✕</button></div><p className="husbandry-muted">Record what you actually measured for {snake.name}. The timestamp, snake, enclosure and active heating context are stored automatically. Leave unmeasured fields blank.</p><div className="husbandry-form-grid">{(editingEnvironment === "all" ? metrics.map((item) => item.key) : [editingEnvironment]).map((key) => { const metric = metrics.find((item) => item.key === key)!; return <label key={key}>{metric.icon} {metric.label} ({metric.unit})<input autoFocus={key === editingEnvironment} inputMode="decimal" type="number" step="0.1" min="0" value={readings[key]} onChange={(event) => setReadings((current) => ({ ...current, [key]: event.target.value }))} placeholder="Enter measured value" /></label>; })}</div>{message && <p className="husbandry-save-message" role="alert">{message}</p>}<div className="husbandry-modal-actions"><button type="button" className="husbandry-button" onClick={() => setEditingEnvironment(null)} disabled={savingReadings}>Cancel</button><button type="button" className="husbandry-button husbandry-button--primary" onClick={() => void saveEnvironment()} disabled={savingReadings}>{savingReadings ? "Saving…" : "💾 Save measured readings"}</button></div></section></div>}
  </main>;
}
