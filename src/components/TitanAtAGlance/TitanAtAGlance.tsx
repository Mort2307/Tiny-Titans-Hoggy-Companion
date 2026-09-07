import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getUserSnakes } from "../../services/snakeService";
import type { Snake } from "../../types/Snake";
import type { FeedingRecord } from "../../types/Feeding";
import type { WeightRecord } from "../../types/Weight";
import type { ShedRecord } from "../../types/Shed";
import { TITAN_AT_A_GLANCE_OPTIONS, useEasyNav, type TitanAtAGlanceSliceId } from "../../context/EasyNavContext";
import TitanThisWeek from "./TitanThisWeek";
import "./TitanAtAGlance.css";

type Point = { x: number; y: number };
type SliceView = { label: string; value: string; secondary?: string; route: string; opensWeek?: boolean };

function polar(cx: number, cy: number, radius: number, angle: number): Point {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function sectorPath(cx: number, cy: number, outer: number, inner: number, startAngle: number, endAngle: number): string {
  const startOuter = polar(cx, cy, outer, endAngle);
  const endOuter = polar(cx, cy, outer, startAngle);
  const startInner = polar(cx, cy, inner, endAngle);
  const endInner = polar(cx, cy, inner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [`M ${endOuter.x} ${endOuter.y}`, `A ${outer} ${outer} 0 ${largeArc} 1 ${startOuter.x} ${startOuter.y}`, `L ${startInner.x} ${startInner.y}`, `A ${inner} ${inner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`, "Z"].join(" ");
}

function dateValue(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value: string | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function latest<T extends { date: string }>(records: T[] | undefined): T | undefined {
  return records?.slice().sort((a, b) => dateValue(b.date) - dateValue(a.date))[0];
}

const ANIMAL_ROUTE_PREFIXES = ["/snakes", "/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry", "/enclosure-intelligence"];

function currentSnakeId(pathname: string): string | undefined {
  const prefix = ANIMAL_ROUTE_PREFIXES.find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
  if (!prefix || pathname === prefix) return undefined;
  const remainder = pathname.slice(prefix.length + 1);
  const [segment] = remainder.split("/");
  return segment ? decodeURIComponent(segment) : undefined;
}

function routeFor(slice: TitanAtAGlanceSliceId, snakeId?: string): string {
  switch (slice) {
    case "feed": return snakeId ? `/snakes/${snakeId}/feeding?action=log` : "/feeding?action=log";
    case "weight": return snakeId ? `/snakes/${snakeId}/weights?action=log` : "/weights";
    case "shed": return snakeId ? `/snakes/${snakeId}/shedding` : "/shedding";
    case "health": return snakeId ? `/snakes/${snakeId}/health` : "/health";
    case "behaviour": return snakeId ? `/snakes/${snakeId}/behaviour` : "/behaviour";
    case "husbandry": return snakeId ? `/husbandry/${snakeId}` : "/husbandry";
    case "intelligence": return "/titan-intelligence";
    case "genetics": return "/morph-library";
    case "breeding": return "/breeding";
    case "snakes": return "/snakes";
    case "learning": return "/challenge";
    case "community": return "/community";
    case "room": return "/reptile-room";
    case "knowledge": return "/knowledge-base";
    case "contribution": return "/make-contribution";
    case "goals": return "/become-a-titan";
    case "account": return "/account/personalise";
    case "reminders": return "/reminders";
    case "thisWeek": return "/";
    default: return "/";
  }
}

function buildView(slice: TitanAtAGlanceSliceId, snake: Snake | undefined): SliceView {
  const id = snake?.id;
  const feed = latest<FeedingRecord>(snake?.feedingHistory);
  const weight = latest<WeightRecord>(snake?.weightHistory);
  const shed = latest<ShedRecord>(snake?.shedHistory);
  switch (slice) {
    case "feed": return { label: "Last Feed", value: feed ? formatDate(feed.date) : "Not yet", secondary: feed ? feed.foodType : "Log a feed", route: routeFor(slice, id) };
    case "weight": return { label: "Last Weight", value: weight ? `${weight.weight}${weight.unit}` : "Not yet", secondary: weight ? formatDate(weight.date) : "Record one", route: routeFor(slice, id) };
    case "shed": return { label: "Last Shed", value: shed ? formatDate(shed.date) : "Not yet", secondary: shed?.status ?? "Record one", route: routeFor(slice, id) };
    case "reminders": return { label: "Reminders", value: "Open", secondary: "See what's due", route: routeFor(slice, id) };
    case "thisWeek": return { label: "This Week", value: "Open", secondary: "Your keeper week", route: routeFor(slice, id), opensWeek: true };
    case "health": return { label: "Health", value: snake?.healthHistory?.length ? `${snake.healthHistory.length} records` : "No records", secondary: "Health & Vet", route: routeFor(slice, id) };
    case "behaviour": return { label: "Behaviour", value: "Open", secondary: "Journal & observations", route: routeFor(slice, id) };
    case "husbandry": return { label: "Husbandry", value: "Open", secondary: "Environment & care", route: routeFor(slice, id) };
    case "intelligence": return { label: "Titan Intelligence", value: "Live", secondary: "Open command centre", route: routeFor(slice, id) };
    case "genetics": return { label: "Genetics", value: snake?.morphs?.length ? snake.morphs.slice(0, 1).join(", ") : "Library", secondary: snake?.morphs?.length ? "Morph profile" : "Explore morphs", route: routeFor(slice, id) };
    case "breeding": return { label: "Breeding", value: snake?.breedingEligible ? "Eligible" : "Planner", secondary: "Open breeding tools", route: routeFor(slice, id) };
    case "snakes": return { label: "My Snakes", value: "Open", secondary: "Your collection", route: routeFor(slice, id) };
    case "learning": return { label: "Learn", value: "Open", secondary: "Continue learning", route: routeFor(slice, id) };
    case "community": return { label: "Community", value: "Open", secondary: "Keeper community", route: routeFor(slice, id) };
    case "room": return { label: "Reptile Room", value: "Open", secondary: "Your room", route: routeFor(slice, id) };
    case "knowledge": return { label: "Knowledge Base", value: "Open", secondary: "Find an answer", route: routeFor(slice, id) };
    case "contribution": return { label: "Contribute", value: "Open", secondary: "Help Tiny Titans", route: routeFor(slice, id) };
    case "goals": return { label: "Titan Goals", value: "Open", secondary: "Your progress", route: routeFor(slice, id) };
    case "account": return { label: "Account", value: "Open", secondary: "Personalise Tiny Titans", route: routeFor(slice, id) };
  }
}

export default function TitanAtAGlance() {
  const { user } = useAuth();
  const { isEasyNav, slices, loading } = useEasyNav();
  const location = useLocation();
  const navigate = useNavigate();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(false);
  const [showThisWeek, setShowThisWeek] = useState(false);
  const activeSnakeId = currentSnakeId(location.pathname);

  useEffect(() => {
    if (!user || !isEasyNav) return undefined;
    let active = true;
    setLoadingSnakes(true);
    void getUserSnakes(user.uid).then((records) => {
      if (active) setSnakes(records.filter((snake) => snake.status !== "Deceased"));
    }).catch(() => {
      if (active) setSnakes([]);
    }).finally(() => {
      if (active) setLoadingSnakes(false);
    });
    return () => { active = false; };
  }, [user, isEasyNav]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === activeSnakeId) ?? snakes[0], [snakes, activeSnakeId]);
  const views = useMemo(() => slices.map((slice) => ({ id: slice, ...buildView(slice, selectedSnake) })), [slices, selectedSnake]);

  if (!isEasyNav || loading) return null;

  const size = 360;
  const centre = size / 2;
  const outer = 158;
  const inner = 83;
  const angleStep = 360 / views.length;
  const gap = Math.min(3, angleStep / 10);

  return <section className="tt-at-glance" aria-label="Titan At A Glance">
    <div className="tt-at-glance-head"><div><span className="tt-at-glance-eyebrow">TITAN AT A GLANCE</span><h1>{selectedSnake ? selectedSnake.name : "Your Tiny Titans"}</h1><p>{loadingSnakes ? "Loading your latest records…" : selectedSnake ? "Tap a slice to view, update or review it." : "Tap a slice to open what you need."}</p></div><Link className="tt-at-glance-customise" to="/account/personalise?easy-nav=1">⚙ Customise</Link></div>
    <div className="tt-at-glance-stage"><svg className="tt-at-glance-wheel" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Customisable Tiny Titans quick navigation wheel">
      {views.map((view, index) => {
        const start = index * angleStep + gap;
        const end = (index + 1) * angleStep - gap;
        const mid = (start + end) / 2;
        const labelPoint = polar(centre, centre, 122, mid);
        const activate = () => { if (view.opensWeek) setShowThisWeek((current) => !current); else navigate(view.route); };
        return <g key={view.id} className={`tt-at-glance-sector${view.opensWeek && showThisWeek ? " selected" : ""}`} onClick={activate} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } }} aria-label={`${view.label}: ${view.value}. ${view.secondary ?? ""}`}>
          <path d={sectorPath(centre, centre, outer, inner, start, end)} className="tt-at-glance-sector-shape" />
          <text x={labelPoint.x} y={labelPoint.y - 6} className="tt-at-glance-icon" textAnchor="middle">{TITAN_AT_A_GLANCE_OPTIONS.find((option) => option.id === view.id)?.icon}</text>
          <text x={labelPoint.x} y={labelPoint.y + 15} className="tt-at-glance-label" textAnchor="middle">{view.label}</text>
          <text x={labelPoint.x} y={labelPoint.y + 34} className="tt-at-glance-value" textAnchor="middle">{view.value}</text>
        </g>;
      })}
      <circle cx={centre} cy={centre} r={inner - 4} className="tt-at-glance-centre" />
      <text x={centre} y={centre - 8} className="tt-at-glance-centre-icon" textAnchor="middle">🐍</text>
      <text x={centre} y={centre + 18} className="tt-at-glance-centre-name" textAnchor="middle">{selectedSnake?.name ?? "Tiny Titans"}</text>
    </svg></div>
    {showThisWeek && <TitanThisWeek snakes={snakes} selectedSnake={selectedSnake} />}
    <div className="tt-at-glance-foot"><span>Showing {views.length} personalised shortcuts</span><Link to="/snakes">Switch Titan</Link></div>
  </section>;
}
