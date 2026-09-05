import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";

type ReviewArea = {
  id: "shed" | "weight" | "feeding" | "enclosure" | "health" | "behaviour" | "master";
  label: string;
  icon: string;
  reason: string;
  fields: string;
  route: string;
};

function validDate(value?: string | null) {
  if (!value) return false;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(time);
}

function ageDays(value?: string | null, now = new Date()) {
  if (!validDate(value)) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.floor((today - time) / 86_400_000));
}

function hasRecentNonRecoveredHealth(snake: Snake) {
  const latest = [...(snake.healthHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest || latest.status === "Recovered") return false;
  const age = ageDays(latest.date);
  return age !== null && age <= 30;
}

function areaPriority(areas: ReviewArea[]) {
  const order: ReviewArea["id"][] = ["health", "weight", "feeding", "shed", "enclosure", "behaviour", "master"];
  return [...areas].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export default function SnakeProfileReviewGuide({ snake }: { snake: Snake }) {
  const navigate = useNavigate();

  const data = useMemo(() => {
    const areas: ReviewArea[] = [];
    const weightCount = snake.weightHistory?.length ?? 0;
    const feedingCount = snake.feedingHistory?.length ?? 0;
    const shedCount = snake.shedHistory?.length ?? 0;

    const latestWeight = [...(snake.weightHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
    const latestFeeding = [...(snake.feedingHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
    const latestShed = [...(snake.shedHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
    const latestEnvironment = [...(snake.enclosure?.environmentHistory ?? [])].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

    if (hasRecentNonRecoveredHealth(snake)) {
      areas.push({ id: "health", label: "Health", icon: "🩺", reason: "A recent health record is still active, so Tiny Titans needs the current keeper/vet outcome rather than assuming what it means.", fields: "Date, observed signs, recorded status, vet findings where applicable, treatment/medication, and outcome.", route: `/health/${snake.id}` });
    }

    const currentWeight = latestWeight?.weight ?? snake.weight;
    if (currentWeight === undefined || currentWeight === null || !weightCount || ageDays(latestWeight?.date) !== null && (ageDays(latestWeight?.date) ?? 0) > 30) {
      areas.push({ id: "weight", label: "Weight", icon: "⚖️", reason: weightCount ? "The weight record is getting stale, so a current measurement would improve the trend picture." : "No usable weight history is available yet, so Tiny Titans cannot establish this snake's personal weight baseline.", fields: "Measurement, date, unit, and body length in cm when known; repeated measurements are especially valuable for trend analysis.", route: `/weights/${snake.id}` });
    }

    if (!feedingCount || ageDays(latestFeeding?.date) !== null && (ageDays(latestFeeding?.date) ?? 0) > 45) {
      areas.push({ id: "feeding", label: "Feeding", icon: "🍽️", reason: feedingCount ? "The feeding history is stale, so the next actual meal will help re-establish the personal feeding pattern." : "No feeding history is available yet, so Tiny Titans cannot learn this snake's individual response or rhythm.", fields: "Actual prey type, prey category, quantity, size, individual or total prey mass, response, feeding method, and useful meal notes.", route: `/feeding/${snake.id}` });
    }

    if (!shedCount || latestShed?.status === "Partial" || latestShed?.status === "Problematic" || ageDays(latestShed?.date) !== null && (ageDays(latestShed?.date) ?? 0) > 120) {
      areas.push({ id: "shed", label: "Shed", icon: "🐍", reason: latestShed?.status === "Partial" || latestShed?.status === "Problematic" ? `The latest shed is recorded as ${latestShed.status.toLowerCase()}, so the exact outcome is worth reviewing.` : shedCount ? "The shed record is getting stale, so a current shed event will improve the individual rhythm picture." : "No shed history is available yet, so Tiny Titans cannot establish this snake's individual shed rhythm.", fields: "Shed date, complete/partial/problematic outcome, retained eye caps or tail tip, and notes about the shed or surrounding conditions.", route: `/shedding/${snake.id}` });
    }

    if (!snake.enclosure || !latestEnvironment || (ageDays(latestEnvironment.recordedAt) ?? 0) > 30) {
      areas.push({ id: "enclosure", label: "Enclosure", icon: "🏠", reason: snake.enclosure ? "The environment record is getting stale, so a current reading/setup check would improve context." : "No current enclosure/environment record is linked, limiting husbandry context around this snake.", fields: "Enclosure dimensions, warm/cool temperatures, humidity, substrate, hides, water, ventilation, lighting/UVB, enrichment, and relevant setup changes.", route: `/husbandry/${snake.id}` });
    }

    if (!snake.notes?.trim() || !snake.acquisitionDate || snake.lengthCm == null) {
      areas.push({ id: "master", label: "Master Record", icon: "📋", reason: "Core identity or physical-reference fields are incomplete, which limits comparisons and longitudinal interpretation.", fields: "Species, sex, hatch date, arrival/acquisition date, breeder/origin, morphs/hets, body length, identifiers, and important keeper notes.", route: `/snakes/${snake.id}/master-record` });
    }

    const coverageTargets = [
      Boolean(snake.species && snake.sex && snake.hatchDate),
      Boolean(weightCount || snake.weight !== null),
      Boolean(feedingCount || snake.lastMealDate),
      Boolean(shedCount),
      Boolean(snake.enclosure),
      Boolean(snake.healthHistory?.length),
      Boolean(snake.lengthCm != null),
    ];
    const coverage = Math.round((coverageTargets.filter(Boolean).length / coverageTargets.length) * 100);
    const orderedAreas = areaPriority(areas);
    const tone = orderedAreas.some((area) => area.id === "health" || area.id === "weight" && !weightCount || area.id === "shed" && latestShed?.status === "Problematic")
      ? "attention"
      : orderedAreas.length ? "watch" : coverage < 70 ? "watch" : "clear";
    const statusLabel = tone === "attention" ? "Action worth taking" : tone === "watch" ? "Worth checking" : "Record looks healthy";

    return { areas: orderedAreas, coverage, tone, statusLabel };
  }, [snake]);

  const quickLinks = [
    ["📋", "Master Record", `/snakes/${snake.id}/master-record`],
    ["🌡️", "Husbandry", `/husbandry/${snake.id}`],
    ["⚖️", "Weight", `/weights/${snake.id}`],
    ["🍽️", "Feeding", `/feeding/${snake.id}`],
  ] as const;

  const alwaysUseful: ReviewArea[] = [
    { id: "weight", label: "Weight", icon: "⚖️", reason: "Helps Tiny Titans measure growth/change against this snake's own history.", fields: "Mass, date, unit, and body length when known.", route: `/weights/${snake.id}` },
    { id: "feeding", label: "Feeding", icon: "🍽️", reason: "Builds the individual feeding pattern and preserves the actual diet instead of guessing from generic snake defaults.", fields: "Actual prey, category, quantity, size, mass, response, method, and notes.", route: `/feeding/${snake.id}` },
    { id: "shed", label: "Shed", icon: "🐍", reason: "Builds the individual shed rhythm and records whether each event completed normally.", fields: "Date, outcome, retained material, and relevant notes.", route: `/shedding/${snake.id}` },
    { id: "enclosure", label: "Enclosure", icon: "🏠", reason: "Provides the environmental context needed to interpret behaviour, feeding and shed records.", fields: "Dimensions, temperature gradient, humidity, substrate, hides, water, ventilation, lighting/UVB, and enrichment.", route: `/husbandry/${snake.id}` },
    { id: "health", label: "Health", icon: "🩺", reason: "Preserves observed health events without asking Tiny Titans to diagnose them.", fields: "Date, observation, recorded status, treatment/vet information, and outcome.", route: `/health/${snake.id}` },
    { id: "behaviour", label: "Behaviour", icon: "👀", reason: "A consistent description of what the snake actually did is more useful than a guessed interpretation.", fields: "Observed behaviour, context, frequency/duration, change from baseline, and possible triggers.", route: `/behaviour/${snake.id}` },
  ];

  return (
    <section className={`tt-profile-review-guide tt-profile-review-guide--${data.tone}`} aria-labelledby="snake-profile-review-guide-heading">
      <div className="tt-profile-review-guide-header">
        <div>
          <p className="tt-intelligence-kicker">SELECTED SNAKE</p>
          <h2 id="snake-profile-review-guide-heading">{snake.name}</h2>
        </div>
        <span className="tt-profile-review-guide-status">{data.tone === "attention" ? "🔴" : data.tone === "watch" ? "🟠" : "🟢"} {data.statusLabel}</span>
      </div>

      <p className="tt-profile-review-guide-intro">
        {data.areas.length
          ? `${snake.name} has something worth reviewing, but Tiny Titans will not assume a cause without enough evidence.`
          : `${snake.name} has no immediate review flag from the records currently available. Keep the highlighted records current so Tiny Titans can build a stronger individual baseline.`}
      </p>

      <div className="tt-profile-review-guide-coverage"><strong>{data.coverage}% record coverage</strong><span>Coverage reflects useful data fields currently available; it is not a health score.</span></div>

      <div className="tt-profile-review-guide-section">
        <h3>Please review/update these logs:</h3>
        {data.areas.length ? <div className="tt-profile-review-guide-list">
          {data.areas.map((area) => <article key={area.id} className="tt-profile-review-guide-item">
            <div className="tt-profile-review-guide-item-top"><span className="tt-profile-review-guide-item-title">{area.icon} {area.label}</span><button type="button" onClick={() => navigate(area.route)}>Open {area.label} →</button></div>
            <p>{area.reason}</p>
            <small><strong>What Tiny Titans is looking for:</strong> {area.fields}</small>
          </article>)}
        </div> : <p className="tt-profile-review-guide-empty">Nothing is currently flagged. Continue recording the actual events below and the profile will reassess as new evidence arrives.</p>}
      </div>

      <details className="tt-profile-review-guide-details">
        <summary>What information helps Tiny Titans build the best picture?</summary>
        <div className="tt-profile-review-guide-all">
          {alwaysUseful.map((area) => <div key={area.id}><strong>{area.icon} {area.label}</strong><span>{area.fields}</span></div>)}
          <div><strong>📋 Master Record</strong><span>Species, sex, hatch date, arrival/acquisition, breeder/origin, genetics, body length and important keeper notes.</span></div>
        </div>
      </details>

      <nav className="tt-profile-review-guide-links" aria-label={`${snake.name} record links`}>
        {quickLinks.map(([icon, label, path]) => <button key={label} type="button" onClick={() => navigate(path)}>{icon} {label}</button>)}
      </nav>
    </section>
  );
}
