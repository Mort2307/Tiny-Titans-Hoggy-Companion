import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import { getSnakeWeights } from "../services/weightService";
import type { Snake } from "../types/Snake";
import type { Enclosure } from "../types/Enclosure";
import type { WeightRecord } from "../types/Weight";
import { ageInYears, growthStageForAge, husbandryReferenceBands, husbandryReferences } from "../data/husbandryReferences";
import "../styles/husbandry-care.css";

type EnvironmentKey = "warmSideTemperature" | "coolSideTemperature" | "baskingTemperature" | "humidity";
type EnvironmentDraft = Record<EnvironmentKey, string>;
const environmentLabels: Record<EnvironmentKey, string> = { warmSideTemperature: "Warm side", coolSideTemperature: "Cool side", baskingTemperature: "Basking", humidity: "Humidity" };
const environmentUnits: Record<EnvironmentKey, string> = { warmSideTemperature: "°C", coolSideTemperature: "°C", baskingTemperature: "°C", humidity: "%" };

function statusForRange(value: number | undefined, min: number, max: number): "good" | "check" | "unknown" { if (value === undefined || !Number.isFinite(value)) return "unknown"; return value >= min && value <= max ? "good" : "check"; }
function label(status: "good" | "check" | "unknown") { return status === "good" ? "🟢 Within reference" : status === "check" ? "🟠 Worth reviewing" : "🔵 Not enough data"; }
function trend(history: WeightRecord[]) {
  const ordered = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (ordered.length < 2) return { text: "Record more weights to establish this snake's personal trajectory.", tone: "unknown" as const, change: null as number | null };
  const change = ordered.at(-1)!.weight - ordered[0].weight;
  if (ordered.length < 3) return { text: `Two measurements show ${change > 0 ? "an upward" : change < 0 ? "a downward" : "a stable"} direction (${change >= 0 ? "+" : ""}${change.toFixed(1)} g). More repeated records are needed before calling this a reliable trend.`, tone: "unknown" as const, change };
  if (change > 0) return { text: `Your recorded trajectory is upward across ${ordered.length} measurements (+${change.toFixed(1)} g).`, tone: "good" as const, change };
  if (change < 0) return { text: `Your recorded trajectory is downward across ${ordered.length} measurements (${change.toFixed(1)} g).`, tone: "check" as const, change };
  return { text: `Your recorded trajectory is stable across ${ordered.length} measurements.`, tone: "good" as const, change };
}
function defaultEnclosure(snake: Snake): Enclosure { return snake.enclosure ?? { id: `enclosure-${snake.id}`, snakeId: snake.id, length: 0, width: 0, height: 0, enclosureType: "Not recorded", substrate: "Other", heatingType: "Other", uvbEnabled: false, hides: 0, waterBowl: false, bioactive: false }; }

export default function HusbandryCare() {
  const { id } = useParams();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [weights, setWeights] = useState<Record<string, WeightRecord[]>>({});
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(true);
  const [selectedSnakeId, setSelectedSnakeId] = useState(id ?? "");
  const [editingMetric, setEditingMetric] = useState<EnvironmentKey | "all" | null>(null);
  const [draft, setDraft] = useState<EnvironmentDraft>({ warmSideTemperature: "", coolSideTemperature: "", baskingTemperature: "", humidity: "" });
  const [savingEnvironment, setSavingEnvironment] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editingLength, setEditingLength] = useState(false);
  const [lengthDraft, setLengthDraft] = useState("");
  const [savingLength, setSavingLength] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setBusy(true); setLoadError("");
    try {
      const loaded = await getUserSnakes(user.uid); setSnakes(loaded);
      const entries = await Promise.all(loaded.map(async (snake) => [snake.id, await getSnakeWeights(user.uid, snake.id)] as const));
      setWeights(Object.fromEntries(entries));
      setSelectedSnakeId((current) => loaded.some((snake) => snake.id === current) ? current : loaded[0]?.id ?? "");
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Unable to load husbandry data."); }
    finally { setBusy(false); }
  }, [user]);
  useEffect(() => { if (loading || profileLoading || !user) return; void loadData(); }, [user, loading, profileLoading, loadData]);

  const snake = useMemo(() => snakes.find((item) => item.id === selectedSnakeId) ?? snakes[0], [snakes, selectedSnakeId]);
  const history = snake ? (weights[snake.id] ?? snake.weightHistory ?? []) : [];
  const orderedHistory = useMemo(() => [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [history]);
  const currentWeight = orderedHistory.at(-1)?.weight ?? snake?.weight ?? undefined;
  const age = snake ? ageInYears(snake.hatchDate) : 0;
  const growthStage = growthStageForAge(age);
  const growthTrend = trend(history);
  const adultBand = snake?.sex === "Male" ? [husbandryReferenceBands.adultObservedWeight.maleMinG, husbandryReferenceBands.adultObservedWeight.maleMaxG] : snake?.sex === "Female" ? [husbandryReferenceBands.adultObservedWeight.femaleMinG, husbandryReferenceBands.adultObservedWeight.femaleMaxG] : null;
  const adultComparison = adultBand && age >= 2.5 && currentWeight !== undefined ? statusForRange(currentWeight, adultBand[0], adultBand[1]) : "unknown";
  const lengthStatus = snake?.lengthCm !== undefined && snake.lengthCm !== null ? "recorded" : "missing";
  const enclosure = snake?.enclosure;
  const metrics: { key: EnvironmentKey; min: number; max: number }[] = [
    { key: "warmSideTemperature", min: husbandryReferenceBands.temperature.warmMinC, max: husbandryReferenceBands.temperature.warmMaxC },
    { key: "coolSideTemperature", min: husbandryReferenceBands.temperature.coolMinC, max: husbandryReferenceBands.temperature.coolMaxC },
    { key: "baskingTemperature", min: husbandryReferenceBands.temperature.baskingMinC, max: husbandryReferenceBands.temperature.baskingMaxC },
    { key: "humidity", min: husbandryReferenceBands.humidity.minPercent, max: husbandryReferenceBands.humidity.maxPercent },
  ];
  const reviewItems = [...metrics.map(({ key, min, max }) => statusForRange(enclosure?.[key], min, max)), adultComparison].filter((item) => item === "check").length;

  function openEnvironmentEditor(metric: EnvironmentKey | "all") { if (!snake) return; setDraft({ warmSideTemperature: enclosure?.warmSideTemperature?.toString() ?? "", coolSideTemperature: enclosure?.coolSideTemperature?.toString() ?? "", baskingTemperature: enclosure?.baskingTemperature?.toString() ?? "", humidity: enclosure?.humidity?.toString() ?? "" }); setSaveMessage(""); setEditingMetric(metric); }
  function openLengthEditor() { setLengthDraft(snake?.lengthCm?.toString() ?? ""); setSaveMessage(""); setEditingLength(true); }
  async function saveLength() {
    if (!user || !snake) return;
    if (lengthDraft.trim() === "") { setSaveMessage("Enter a body length or cancel without saving."); return; }
    const value = Number(lengthDraft);
    if (!Number.isFinite(value) || value <= 0 || value > 200) { setSaveMessage("Body length must be a realistic number in centimetres."); return; }
    setSavingLength(true); setSaveMessage("");
    try { const updated = await updateUserSnake(user.uid, { ...snake, lengthCm: Number(value.toFixed(1)) }); setSnakes((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditingLength(false); setSaveMessage("Body length saved to this snake's growth profile."); }
    catch (error) { setSaveMessage(error instanceof Error ? error.message : "Unable to save body length."); }
    finally { setSavingLength(false); }
  }
  async function saveEnvironment() {
    if (!user || !snake) return;
    const values: Partial<Record<EnvironmentKey, number>> = {};
    for (const key of Object.keys(draft) as EnvironmentKey[]) { if (draft[key].trim() === "") continue; const value = Number(draft[key]); if (!Number.isFinite(value)) { setSaveMessage(`${environmentLabels[key]} must be a valid number.`); return; } values[key] = value; }
    if (!Object.keys(values).length) { setSaveMessage("Enter at least one reading before saving."); return; }
    setSavingEnvironment(true); setSaveMessage("");
    try { const updated = await updateUserSnake(user.uid, { ...snake, enclosure: { ...defaultEnclosure(snake), ...values } }); setSnakes((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditingMetric(null); setSaveMessage("Environment readings saved to this snake's Husbandry record."); }
    catch (error) { setSaveMessage(error instanceof Error ? error.message : "Unable to save the environment readings."); }
    finally { setSavingEnvironment(false); }
  }

  if (busy || loading || profileLoading) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-hero"><p className="husbandry-eyebrow">Tiny Titans Intelligence</p><h1>🐍 Husbandry & Care</h1><p>Building your individual care picture from your recorded data.</p></section></main>;
  if (loadError) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-panel"><h1>🐍 Husbandry & Care</h1><p>{loadError}</p><button className="husbandry-button" type="button" onClick={() => void loadData()}>Try again</button></section></main>;
  if (!snake) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-panel"><h1>🐍 Husbandry & Care</h1><p>Add a Tiny Titan first and this page will build its personalised care profile.</p></section></main>;

  return <main className="page-container husbandry-page"><BackHomeButton />
    <header className="husbandry-hero"><div><p className="husbandry-eyebrow">Tiny Titans Intelligence</p><h1>🐍 Husbandry & Care</h1><p>Personalised guidance for <strong>{snake.name}</strong> using recorded husbandry, growth and care history.</p></div><div className="husbandry-badge">{reviewItems ? "🟠 Review" : "🟢 On track"}</div></header>
    <section className="husbandry-panel husbandry-selector"><label htmlFor="husbandry-snake">🐍 Viewing</label><select id="husbandry-snake" value={snake.id} onChange={(event) => setSelectedSnakeId(event.target.value)}>{snakes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="husbandry-muted">Changing this selector rebuilds the profile, growth assessment and environment readings for that individual snake.</p></section>
    <section className="husbandry-panel husbandry-disclaimer"><strong>📚 Guidance, not medical advice</strong><p>Tiny Titans compares your records with sourceable husbandry information and explains what the data may suggest. It is <strong>not professional veterinary or medical advice</strong>, does not diagnose conditions and should never be used to rule out illness or injury. Individual hognoses vary, so reference ranges are guidance rather than strict targets.</p></section>
    <section className="husbandry-panel"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">INDIVIDUAL PROFILE</p><h2>🧬 {snake.name}'s growth picture</h2></div><button className="husbandry-button husbandry-button--primary" type="button" onClick={openLengthEditor}>📏 {lengthStatus === "recorded" ? "Edit length" : "Record length"}</button></div><div className="husbandry-stats husbandry-stats--five"><div><span>Age</span><strong>{age.toFixed(1)} years</strong></div><div><span>Growth stage</span><strong>{growthStage}</strong></div><div><span>Sex</span><strong>{snake.sex}</strong></div><div><span>Current weight</span><strong>{currentWeight !== undefined ? `${currentWeight.toFixed(1)} g` : "Not recorded"}</strong></div><div><span>Body length</span><strong>{snake.lengthCm !== undefined && snake.lengthCm !== null ? `${snake.lengthCm.toFixed(1)} cm` : "Not recorded"}</strong></div></div><p className="husbandry-muted husbandry-profile-note">Tiny Titans treats age, sex, weight, length and the snake's own repeated history as separate pieces of evidence. Missing data is shown rather than guessed.</p></section>
    <section className="husbandry-panel"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">PERSONAL GROWTH ASSESSMENT</p><h2>📈 What the records actually tell us</h2></div><span className={`husbandry-assessment-badge ${growthTrend.tone}`}>{growthTrend.tone === "good" ? "🟢 Reassuring pattern" : growthTrend.tone === "check" ? "🟠 Monitor pattern" : "🔵 More data needed"}</span></div><div className={`husbandry-callout ${growthTrend.tone}`}>{growthTrend.text}</div><div className="husbandry-growth-grid"><article><span>Recorded change</span><strong>{growthTrend.change === null ? "—" : `${growthTrend.change >= 0 ? "+" : ""}${growthTrend.change.toFixed(1)} g`}</strong><small>Across the available weight history.</small></article><article><span>Measurements</span><strong>{history.length}</strong><small>{history.length >= 5 ? "Enough repeated records for a useful personal trajectory." : "Keep recording to strengthen the personal baseline."}</small></article><article><span>Length evidence</span><strong>{lengthStatus === "recorded" ? `${snake.lengthCm!.toFixed(1)} cm` : "Missing"}</strong><small>{lengthStatus === "recorded" ? "Can now be tracked alongside weight." : "Add occasional length measurements to improve context."}</small></article><article><span>Reference comparison</span><strong>{adultComparison === "good" ? "Within adult cohort" : adultComparison === "check" ? "Outside adult cohort" : "Stage-dependent"}</strong><small>{age >= 2.5 && adultBand ? `${adultBand[0]}–${adultBand[1]} g observed ${snake.sex.toLowerCase()} adult cohort.` : "No universal juvenile/subadult weight target is claimed."}</small></article></div><div className="husbandry-reference-explainer"><strong>🧠 How Tiny Titans compares growth</strong><p><b>Hatchling → Juvenile → Subadult → Adult</b> is used as age context, not as a fixed growth chart. The currently encoded peer-reviewed weight data describes an observed adult cohort at about 3 years old, so Tiny Titans only applies that numeric comparison once the snake reaches the adult stage. For younger snakes, the engine prioritises the snake's own trajectory, available length, feeding and shed history instead of inventing a "correct" weight.</p><p><strong>What this means for {snake.name}:</strong> {age < 2.5 ? `At ${age.toFixed(1)} years, the most useful comparison is ${snake.lengthCm !== undefined && snake.lengthCm !== null ? "the combination of recorded length, weight and trajectory" : "the repeated weight trajectory; adding length will make the picture stronger"}.` : adultBand && currentWeight !== undefined ? `The current ${currentWeight.toFixed(1)} g weight can be compared with the observed ${snake.sex.toLowerCase()} adult cohort, while still treating individual variation as important.` : "More complete weight data is needed before a meaningful adult comparison can be made."}</p></div></section>
    <section className="husbandry-panel"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">ENVIRONMENT INTELLIGENCE</p><h2>🌡️ Recorded enclosure conditions</h2><p className="husbandry-muted">Tap any reading to edit it. Use <strong>Log all readings</strong> for a complete enclosure check.</p></div><button className="husbandry-button husbandry-button--primary" type="button" onClick={() => openEnvironmentEditor("all")}>➕ Log all readings</button></div><p className="husbandry-muted">These are broad overlapping reference bands assembled from sourceable care references. They are context, not magic numbers.</p><div className="husbandry-grid husbandry-grid--four">{metrics.map(({ key, min, max }) => { const value = enclosure?.[key]; const state = statusForRange(value, min, max); return <button key={key} type="button" className="husbandry-metric husbandry-metric--button" onClick={() => openEnvironmentEditor(key)}><span>{environmentLabels[key]}</span><strong>{typeof value === "number" ? `${value}${environmentUnits[key]}` : "Not recorded"}</strong><em className={state}>{label(state)}</em><small>Reference: {min}–{max}{environmentUnits[key]}</small><b>Tap to edit</b></button>; })}</div>{saveMessage && !editingMetric && !editingLength && <p className="husbandry-save-message" role="status">{saveMessage}</p>}</section>
    <section className="husbandry-grid"><article className="husbandry-panel"><h2>🧭 Personalised plan</h2><p><strong>First rule: don't change a stable setup just to chase a number.</strong></p><ul>{reviewItems === 0 ? <li>Keep your established setup and continue recording consistent measurements.</li> : <><li>Review flagged environmental readings and check measuring equipment before changing the enclosure.</li><li>Compare several readings rather than reacting to one measurement.</li><li>Use Weight, Feeding, Shed and Husbandry records together before changing the care routine.</li></>} {history.length < 5 && <li>Continue building {snake.name}'s weight history; repeated real measurements are more useful than a generic target.</li>} {lengthStatus === "missing" && <li>Record occasional body length alongside weight to give the growth assessment another independent measurement.</li>}<li>If the snake develops concerning clinical signs or unexplained significant weight change, seek a qualified reptile/exotics veterinarian.</li></ul></article><article className="husbandry-panel"><h2>🔗 Connected intelligence</h2><p>Husbandry reads the existing Tiny Titans systems rather than creating duplicate records.</p><div className="husbandry-links"><a href={`/weights/${snake.id}`}>⚖️ Weight Records</a><a href={`/snakes/${snake.id}/feeding`}>🍽️ Feeding</a><a href={`/snakes/${snake.id}/shedding`}>🐍 Shed Cycle</a><a href={`/snakes/${snake.id}/master-record`}>📋 Master Record</a></div></article></section>
    <section className="husbandry-panel"><h2>📚 Sources & confidence</h2><p className="husbandry-muted">The adult numeric weight comparison comes from an observed peer-reviewed cohort. The veterinary/professional references provide husbandry context. Tiny Titans does not turn these sources into a universal growth chart.</p><div className="husbandry-sources">{husbandryReferences.map((reference) => <a key={reference.id} href={reference.url} target="_blank" rel="noreferrer"><strong>{reference.title}</strong><span>{reference.sourceType} · reviewed {reference.reviewed}</span></a>)}</div></section>
    {editingMetric && <div className="husbandry-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingMetric(null); }}><section className="husbandry-modal" role="dialog" aria-modal="true" aria-labelledby="husbandry-modal-title"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">Tiny Titans Husbandry</p><h2 id="husbandry-modal-title">🌡️ {editingMetric === "all" ? "Log environment readings" : `Log ${environmentLabels[editingMetric]}`}</h2></div><button className="husbandry-close" type="button" onClick={() => setEditingMetric(null)} aria-label="Close">✕</button></div><p className="husbandry-muted">These values update the current husbandry record for <strong>{snake.name}</strong>. Leave a field blank if you did not measure it.</p><div className="husbandry-form-grid">{(editingMetric === "all" ? metrics.map((item) => item.key) : [editingMetric]).map((key) => <label key={key}>{environmentLabels[key]} ({environmentUnits[key]})<input autoFocus={key === editingMetric} inputMode="decimal" type="number" step="0.1" min="0" value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} placeholder={`Enter ${environmentLabels[key].toLowerCase()}`} /></label>)}</div>{saveMessage && <p className="husbandry-save-message" role="alert">{saveMessage}</p>}<div className="husbandry-modal-actions"><button className="husbandry-button" type="button" onClick={() => setEditingMetric(null)} disabled={savingEnvironment}>Cancel</button><button className="husbandry-button husbandry-button--primary" type="button" onClick={() => void saveEnvironment()} disabled={savingEnvironment}>{savingEnvironment ? "Saving…" : "💾 Save readings"}</button></div></section></div>}
    {editingLength && <div className="husbandry-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingLength(false); }}><section className="husbandry-modal" role="dialog" aria-modal="true" aria-labelledby="length-modal-title"><div className="husbandry-section-heading"><div><p className="husbandry-eyebrow">Tiny Titans Growth</p><h2 id="length-modal-title">📏 Record body length</h2></div><button className="husbandry-close" type="button" onClick={() => setEditingLength(false)} aria-label="Close">✕</button></div><p className="husbandry-muted">Record the snake's measured body length in centimetres. Occasional measurements help Tiny Titans interpret weight in better individual context.</p><label className="husbandry-single-input">Body length (cm)<input autoFocus inputMode="decimal" type="number" step="0.1" min="1" max="200" value={lengthDraft} onChange={(event) => setLengthDraft(event.target.value)} placeholder="e.g. 42.5" /></label>{saveMessage && <p className="husbandry-save-message" role="alert">{saveMessage}</p>}<div className="husbandry-modal-actions"><button className="husbandry-button" type="button" onClick={() => setEditingLength(false)} disabled={savingLength}>Cancel</button><button className="husbandry-button husbandry-button--primary" type="button" onClick={() => void saveLength()} disabled={savingLength}>{savingLength ? "Saving…" : "💾 Save length"}</button></div></section></div>}
  </main>;
}
