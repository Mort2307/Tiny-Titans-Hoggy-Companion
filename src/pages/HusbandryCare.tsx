import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getSnakeWeights } from "../services/weightService";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { ageInYears, husbandryReferenceBands, husbandryReferences } from "../data/husbandryReferences";
import "../styles/husbandry-care.css";

function statusForRange(value: number | undefined, min: number, max: number): "good" | "check" | "unknown" {
  if (value === undefined || !Number.isFinite(value)) return "unknown";
  return value >= min && value <= max ? "good" : "check";
}
function label(status: "good" | "check" | "unknown") { return status === "good" ? "🟢 Within reference" : status === "check" ? "🟠 Worth reviewing" : "🔵 Not enough data"; }
function trend(history: WeightRecord[]) {
  const ordered = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (ordered.length < 3) return { text: "Not enough repeated records for a meaningful personal trend.", tone: "unknown" as const };
  const first = ordered[0].weight; const last = ordered[ordered.length - 1].weight;
  const change = last - first;
  if (change > 0) return { text: `Your recorded trajectory is upward across ${ordered.length} measurements (+${change.toFixed(1)} g).`, tone: "good" as const };
  if (change < 0) return { text: `Your recorded trajectory is downward across ${ordered.length} measurements (${change.toFixed(1)} g).`, tone: "check" as const };
  return { text: `Your recorded trajectory is stable across ${ordered.length} measurements.`, tone: "good" as const };
}

export default function HusbandryCare() {
  const { id } = useParams();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [weights, setWeights] = useState<Record<string, WeightRecord[]>>({});
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let active = true;
    void getUserSnakes(user.uid).then(async (loaded) => {
      if (!active) return;
      setSnakes(loaded);
      const entries = await Promise.all(loaded.map(async (snake) => [snake.id, await getSnakeWeights(user.uid, snake.id)] as const));
      if (!active) return;
      setWeights(Object.fromEntries(entries));
    }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "Unable to load husbandry data."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [user, loading, profileLoading]);

  if (busy || loading || profileLoading) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-hero"><p className="husbandry-eyebrow">Tiny Titans Intelligence</p><h1>🐍 Husbandry & Care</h1><p>Building your individual care picture from your recorded data.</p></section></main>;
  if (loadError) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-panel"><h1>🐍 Husbandry & Care</h1><p>{loadError}</p></section></main>;
  if (!snakes.length) return <main className="page-container husbandry-page"><BackHomeButton /><section className="husbandry-panel"><h1>🐍 Husbandry & Care</h1><p>Add a Tiny Titan first and this page will build its personalised care profile.</p></section></main>;

  const snake = snakes.find((item) => item.id === id) ?? snakes[0];
  const history = weights[snake.id] ?? snake.weightHistory ?? [];
  const currentWeight = history.length ? [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).at(-1)?.weight : snake.weight ?? undefined;
  const age = ageInYears(snake.hatchDate);
  const growthTrend = trend(history);
  const adultBand = snake.sex === "Male" ? [husbandryReferenceBands.adultObservedWeight.maleMinG, husbandryReferenceBands.adultObservedWeight.maleMaxG] : snake.sex === "Female" ? [husbandryReferenceBands.adultObservedWeight.femaleMinG, husbandryReferenceBands.adultObservedWeight.femaleMaxG] : null;
  const adultComparison = adultBand && age >= 2.5 && currentWeight !== undefined ? statusForRange(currentWeight, adultBand[0], adultBand[1]) : "unknown";
  const enclosure = snake.enclosure;
  const tempStatus = statusForRange(enclosure?.warmSideTemperature, husbandryReferenceBands.temperature.warmMinC, husbandryReferenceBands.temperature.warmMaxC);
  const coolStatus = statusForRange(enclosure?.coolSideTemperature, husbandryReferenceBands.temperature.coolMinC, husbandryReferenceBands.temperature.coolMaxC);
  const baskStatus = statusForRange(enclosure?.baskingTemperature, husbandryReferenceBands.temperature.baskingMinC, husbandryReferenceBands.temperature.baskingMaxC);
  const humidityStatus = statusForRange(enclosure?.humidity, husbandryReferenceBands.humidity.minPercent, husbandryReferenceBands.humidity.maxPercent);
  const reviewItems = [tempStatus, coolStatus, baskStatus, humidityStatus, adultComparison].filter((item) => item === "check").length;

  return <main className="page-container husbandry-page"><BackHomeButton />
    <header className="husbandry-hero"><div><p className="husbandry-eyebrow">Tiny Titans Intelligence</p><h1>🐍 Husbandry & Care</h1><p>Personalised guidance for <strong>{snake.name}</strong> using your recorded husbandry, growth and care history.</p></div><div className="husbandry-badge">{reviewItems ? "🟠 Review" : "🟢 On track"}</div></header>
    <section className="husbandry-panel husbandry-disclaimer"><strong>📚 Guidance, not medical advice</strong><p>Tiny Titans compares your records with sourceable husbandry information and explains what the data may suggest. It is <strong>not professional veterinary or medical advice</strong>, does not diagnose conditions and should never be used to rule out illness or injury. Individual hognoses vary, so reference ranges are guidance rather than strict targets.</p></section>
    <section className="husbandry-grid">
      <article className="husbandry-panel"><h2>🧬 Individual profile</h2><div className="husbandry-stats"><div><span>Age</span><strong>{age.toFixed(1)} years</strong></div><div><span>Sex</span><strong>{snake.sex}</strong></div><div><span>Current weight</span><strong>{currentWeight !== undefined ? `${currentWeight.toFixed(1)} g` : "Not recorded"}</strong></div><div><span>Weight records</span><strong>{history.length}</strong></div></div></article>
      <article className="husbandry-panel"><h2>📈 Growth intelligence</h2><div className={`husbandry-callout ${growthTrend.tone}`}>{growthTrend.text}</div>{adultBand ? <p className="husbandry-muted">{age >= 2.5 ? `Observed adult reference cohort: ${adultBand[0]}–${adultBand[1]} g for ${snake.sex.toLowerCase()} snakes at about 3 years in a peer-reviewed study.` : "A reliable universal juvenile growth curve is not currently encoded here. Tiny Titans therefore prioritises this snake's repeated trajectory rather than inventing a developmental target."}</p> : <p className="husbandry-muted">Sex-specific adult reference data cannot be selected for this snake. Tiny Titans will not guess a range.</p>}<p><strong>{label(adultComparison)}</strong></p></article>
    </section>
    <section className="husbandry-panel"><h2>🌡️ Environment intelligence</h2><p className="husbandry-muted">These are broad reference bands assembled from multiple sourceable care references. Sources disagree on some exact values, so Tiny Titans deliberately uses overlapping ranges and context rather than a single magic number.</p><div className="husbandry-grid husbandry-grid--four">{[["Warm side", enclosure?.warmSideTemperature, husbandryReferenceBands.temperature.warmMinC, husbandryReferenceBands.temperature.warmMaxC, "°C"], ["Cool side", enclosure?.coolSideTemperature, husbandryReferenceBands.temperature.coolMinC, husbandryReferenceBands.temperature.coolMaxC, "°C"], ["Basking", enclosure?.baskingTemperature, husbandryReferenceBands.temperature.baskingMinC, husbandryReferenceBands.temperature.baskingMaxC, "°C"], ["Humidity", enclosure?.humidity, husbandryReferenceBands.humidity.minPercent, husbandryReferenceBands.humidity.maxPercent, "%"]].map(([name, value, min, max, unit]) => { const state = statusForRange(typeof value === "number" ? value : undefined, Number(min), Number(max)); return <article key={String(name)} className="husbandry-metric"><span>{name}</span><strong>{typeof value === "number" ? `${value}${unit}` : "Not recorded"}</strong><em className={state}>{label(state)}</em><small>Reference: {min}–{max}{unit}</small></article>; })}</div></section>
    <section className="husbandry-grid"><article className="husbandry-panel"><h2>🧭 Personalised plan</h2><p><strong>First rule: don't change a stable setup just to chase a number.</strong></p><ul>{reviewItems === 0 ? <li>Keep your established setup and continue recording consistent measurements.</li> : <><li>Review the flagged environmental readings and check the measuring equipment before changing the enclosure.</li><li>Compare the next few measurements rather than reacting to one reading.</li><li>Use Weight, Feeding and Shed records together before changing the care routine.</li></>}<li>If the snake develops concerning clinical signs or unexplained significant weight change, seek a qualified reptile/exotics veterinarian.</li></ul></article><article className="husbandry-panel"><h2>🔗 Connected intelligence</h2><p>Husbandry reads the existing Tiny Titans systems rather than creating duplicate records.</p><div className="husbandry-links"><a href={`/weights/${snake.id}`}>⚖️ Weight Records</a><a href={`/snakes/${snake.id}/feeding`}>🍽️ Feeding</a><a href={`/snakes/${snake.id}/shedding`}>🐍 Shed Cycle</a><a href={`/snakes/${snake.id}/master-record`}>📋 Master Record</a></div></article></section>
    <section className="husbandry-panel"><h2>📚 Sources & confidence</h2><p className="husbandry-muted">Every reference is stored with its source type and review date. The peer-reviewed weight study is an observed adult cohort, not a universal growth chart.</p><div className="husbandry-sources">{husbandryReferences.map((reference) => <a key={reference.id} href={reference.url} target="_blank" rel="noreferrer"><strong>{reference.title}</strong><span>{reference.sourceType} · reviewed {reference.reviewed}</span></a>)}</div></section>
  </main>;
}
