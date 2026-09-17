import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RescueCareRecord, RescueCareRecordType } from "../../types/rescue";
import "../../styles/rescue-log-intelligence.css";

type RescueLogIntelligenceProps = {
  records?: RescueCareRecord[];
  animalName?: string;
};

type ActivityPoint = {
  date: string;
  label: string;
  feeding: number;
  weight: number;
  shed: number;
  health: number;
  behaviour: number;
  husbandry: number;
  note: number;
};

type WeightPoint = {
  date: string;
  label: string;
  weight: number;
};

const TYPES: RescueCareRecordType[] = ["feeding", "weight", "shed", "health", "behaviour", "husbandry", "note"];
const TYPE_LABELS: Record<RescueCareRecordType, string> = {
  feeding: "Feeding",
  weight: "Weight",
  shed: "Shed",
  health: "Health",
  behaviour: "Behaviour",
  husbandry: "Husbandry",
  note: "Notes",
};
const TYPE_COLOURS: Record<RescueCareRecordType, string> = {
  feeding: "#f6c453",
  weight: "#60a5fa",
  shed: "#a78bfa",
  health: "#fb7185",
  behaviour: "#34d399",
  husbandry: "#4ade80",
  note: "#94a3b8",
};

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(value));
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function safeTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export default function RescueLogIntelligence({ records = [], animalName = "this animal" }: RescueLogIntelligenceProps) {
  const analysis = useMemo(() => {
    const valid = records
      .filter((record) => record && TYPES.includes(record.type) && safeTime(record.occurredAt) > 0)
      .sort((a, b) => safeTime(a.occurredAt) - safeTime(b.occurredAt));

    const activityMap = new Map<string, ActivityPoint>();
    for (const record of valid) {
      const day = record.occurredAt.slice(0, 10);
      const existing = activityMap.get(day) ?? {
        date: day,
        label: shortDate(record.occurredAt),
        feeding: 0,
        weight: 0,
        shed: 0,
        health: 0,
        behaviour: 0,
        husbandry: 0,
        note: 0,
      };
      existing[record.type] += 1;
      activityMap.set(day, existing);
    }

    const weightRecords = valid
      .filter((record) => record.type === "weight" && typeof record.value === "number" && Number.isFinite(record.value))
      .map((record) => ({
        date: record.occurredAt,
        label: shortDate(record.occurredAt),
        weight: Number(record.value),
      } as WeightPoint));

    const feedingRecords = valid.filter((record) => record.type === "feeding");
    const decidedFeedings = feedingRecords.filter((record) => record.accepted !== null && record.accepted !== undefined);
    const acceptedFeedings = decidedFeedings.filter((record) => record.accepted === true).length;
    const latest = valid[valid.length - 1] ?? null;
    const firstWeight = weightRecords[0]?.weight ?? null;
    const latestWeight = weightRecords[weightRecords.length - 1]?.weight ?? null;
    const weightDelta = firstWeight !== null && latestWeight !== null ? latestWeight - firstWeight : null;
    const distinctDays = activityMap.size;
    const total = valid.length;
    const mostCommonType = TYPES
      .map((type) => ({ type, count: valid.filter((record) => record.type === type).length }))
      .sort((a, b) => b.count - a.count)[0];

    return {
      valid,
      activity: Array.from(activityMap.values()).slice(-30),
      weights: weightRecords.slice(-30),
      feedingCount: feedingRecords.length,
      feedingRate: decidedFeedings.length ? Math.round((acceptedFeedings / decidedFeedings.length) * 100) : null,
      latest,
      firstWeight,
      latestWeight,
      weightDelta,
      distinctDays,
      total,
      mostCommonType: mostCommonType?.count ? TYPE_LABELS[mostCommonType.type] : null,
    };
  }, [records]);

  if (!analysis.valid.length) {
    return (
      <section className="rescue-card rescue-log-intelligence" aria-label="Log intelligence">
        <div className="rescue-log-intelligence-heading">
          <div>
            <span className="rescue-eyebrow">🧠 LOG INTELLIGENCE · ALL TIERS</span>
            <h2>No pattern yet</h2>
            <p>As care records accumulate, Tiny Titans will turn the same timeline into visual trends and observed patterns.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rescue-card rescue-log-intelligence" aria-label={`Log intelligence for ${animalName}`}>
      <div className="rescue-log-intelligence-heading">
        <div>
          <span className="rescue-eyebrow">🧠 LOG INTELLIGENCE · ALL TIERS</span>
          <h2>Patterns in {animalName}'s care history</h2>
          <p>Descriptive trends are calculated from the existing care timeline. This does not diagnose illness or replace veterinary assessment.</p>
        </div>
        <span className="rescue-log-intelligence-badge">No tier gate</span>
      </div>

      <div className="rescue-log-intelligence-stats">
        <div><span>Recorded events</span><strong>{analysis.total}</strong><small>{analysis.distinctDays} logging days</small></div>
        <div><span>Feeding response</span><strong>{analysis.feedingRate === null ? "—" : `${analysis.feedingRate}%`}</strong><small>{analysis.feedingCount} feeding records with response data where available</small></div>
        <div><span>Weight change</span><strong>{analysis.weightDelta === null ? "—" : `${analysis.weightDelta >= 0 ? "+" : ""}${analysis.weightDelta.toFixed(1)} g`}</strong><small>{analysis.latestWeight === null ? "Add weight records to trend this" : `${analysis.latestWeight.toFixed(1)} g latest recorded`}</small></div>
        <div><span>Latest activity</span><strong>{analysis.latest ? TYPE_LABELS[analysis.latest.type] : "—"}</strong><small>{analysis.latest ? longDate(analysis.latest.occurredAt) : "No record"}</small></div>
      </div>

      <div className="rescue-log-intelligence-grid">
        <article className="rescue-log-chart-panel">
          <div className="rescue-log-chart-heading">
            <div><strong>Care activity</strong><span>Record volume by day and category</span></div>
            <span>{analysis.activity.length} plotted days</span>
          </div>
          <div className="rescue-log-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.activity} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.18} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  cursor={{ opacity: 0.08 }}
                  contentStyle={{ background: "#15111f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}
                  labelStyle={{ color: "#f8fafc" }}
                />
                {TYPES.map((type) => (
                  <Bar key={type} dataKey={type} stackId="care" fill={TYPE_COLOURS[type]} name={TYPE_LABELS[type]} radius={type === "note" ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rescue-log-chart-panel">
          <div className="rescue-log-chart-heading">
            <div><strong>Weight trajectory</strong><span>Recorded weight values from the same care log</span></div>
            <span>{analysis.weights.length} plotted weights</span>
          </div>
          <div className="rescue-log-chart">
            {analysis.weights.length >= 2 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysis.weights}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.18} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis unit=" g" tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)} g`, "Weight"]}
                    contentStyle={{ background: "#15111f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}
                    labelStyle={{ color: "#f8fafc" }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#60a5fa" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="rescue-log-chart-empty"><strong>One weight point logged.</strong><span>Add another dated weight record and Tiny Titans will plot the trajectory here.</span></div>
            )}
          </div>
        </article>
      </div>

      <div className="rescue-log-intelligence-observation">
        <span>Observed pattern</span>
        <strong>
          {analysis.mostCommonType
            ? `${analysis.mostCommonType} is currently the most frequently logged care category.`
            : "Keep logging consistently to build a useful longitudinal pattern."}
        </strong>
        <small>Patterns update from the same records shown in the Rescue timeline, so there is no separate intelligence dataset to maintain.</small>
      </div>
    </section>
  );
}
