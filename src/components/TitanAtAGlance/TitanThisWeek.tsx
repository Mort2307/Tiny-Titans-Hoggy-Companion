import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Snake } from "../../types/Snake";
import { getCurrentTitanWeek, getRecordCountForWeek } from "../../utils/titanWeek";
import { TITAN_WEEKLY_METRIC_OPTIONS, useEasyNav, type TitanWeeklyMetricId } from "../../context/EasyNavContext";
import "./TitanThisWeek.css";

type Props = { snakes: Snake[]; selectedSnake?: Snake };

type MetricView = { id: TitanWeeklyMetricId; label: string; icon: string; value: string; detail: string };

function routeForMetric(metric: TitanWeeklyMetricId, snakeId?: string): string {
  switch (metric) {
    case "feed": return snakeId ? `/snakes/${snakeId}/feeding?action=log` : "/feeding";
    case "weight": return snakeId ? `/snakes/${snakeId}/weights?action=log` : "/weights";
    case "shed": return snakeId ? `/snakes/${snakeId}/shedding` : "/shedding";
    case "health": return snakeId ? `/snakes/${snakeId}/health` : "/health";
    case "behaviour": return snakeId ? `/snakes/${snakeId}/behaviour` : "/behaviour";
    case "breeding": return "/breeding";
    case "reminders": return "/reminders";
    case "intelligence": return "/titan-intelligence";
  }
}

export default function TitanThisWeek({ snakes, selectedSnake }: Props) {
  const { weekStartDay, weeklyMetrics } = useEasyNav();
  const range = useMemo(() => getCurrentTitanWeek(new Date(), weekStartDay), [weekStartDay]);
  const scopeSnake = selectedSnake;
  const scopedSnakes = scopeSnake ? [scopeSnake] : snakes;

  const views = useMemo<MetricView[]>(() => weeklyMetrics.map((metric) => {
    const option = TITAN_WEEKLY_METRIC_OPTIONS.find((item) => item.id === metric)!;
    if (metric === "reminders") return { id: metric, label: option.label, icon: option.icon, value: "Review", detail: "Open current reminders" };
    if (metric === "intelligence") return { id: metric, label: option.label, icon: option.icon, value: "Live", detail: "Open current intelligence" };
    const count = scopedSnakes.reduce((sum, snake) => {
      switch (metric) {
        case "feed": return sum + getRecordCountForWeek(snake.feedingHistory, range);
        case "weight": return sum + getRecordCountForWeek(snake.weightHistory, range);
        case "shed": return sum + getRecordCountForWeek(snake.shedHistory, range);
        case "health": return sum + getRecordCountForWeek(snake.healthHistory, range);
        case "behaviour": return sum + getRecordCountForWeek(snake.timeline?.filter((event) => event.type?.toLowerCase().includes("behav")), range);
        case "breeding": return sum + getRecordCountForWeek(snake.breedingHistory?.map((item) => ({ date: item.date ?? item.updatedAt ?? "" })), range);
        default: return sum;
      }
    }, 0);
    return { id: metric, label: option.label, icon: option.icon, value: String(count), detail: count === 1 ? "record this week" : "records this week" };
  }), [weeklyMetrics, scopedSnakes, range]);

  const totalRecords = views.reduce((sum, item) => sum + (item.id === "reminders" || item.id === "intelligence" ? 0 : Number(item.value)), 0);
  const scopeLabel = scopeSnake ? scopeSnake.name : "all Tiny Titans";
  const title = selectedSnake ? `${selectedSnake.name} · This Week` : "This Week";

  return <section className="tt-this-week" aria-label="Titan This Week">
    <header className="tt-this-week-head">
      <div><span className="tt-this-week-eyebrow">📅 TITAN WEEK</span><h2>{title}</h2><p>{range.label} · starts {new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(range.start)}</p></div>
      <span className="tt-this-week-scope">{scopeLabel}</span>
    </header>
    <div className="tt-this-week-grid">
      {views.map((view) => <Link key={view.id} to={routeForMetric(view.id, scopeSnake?.id)} className="tt-this-week-metric"><span className="tt-this-week-icon">{view.icon}</span><span><strong>{view.label}</strong><b>{view.value}</b><small>{view.detail}</small></span></Link>)}
    </div>
    <footer className="tt-this-week-foot"><span>{totalRecords} tracked records from your existing keeper history · nothing duplicated</span><Link to="/account/personalise?easy-nav=1#this-week">Configure week</Link></footer>
  </section>;
}
