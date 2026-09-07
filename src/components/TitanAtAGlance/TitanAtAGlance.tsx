import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getUserSnakes } from "../../services/snakeService";
import type { Snake } from "../../types/Snake";
import type { FeedingRecord } from "../../types/Feeding";
import type { WeightRecord } from "../../types/Weight";
import type { ShedRecord } from "../../types/Shed";
import { TITAN_AT_A_GLANCE_OPTIONS, useEasyNav, type TitanAtAGlanceSliceId } from "../../context/EasyNavContext";
import "./TitanAtAGlance.css";

type Point = { x: number; y: number };
type SliceView = { label: string; value: string; secondary?: string; route: string };

function polar(cx: number, cy: number, radius: number, angle: number): Point { const radians = (angle - 90) * Math.PI / 180; return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }; }
function sectorPath(cx: number, cy: number, outer: number, inner: number, startAngle: number, endAngle: number): string { const startOuter = polar(cx, cy, outer, endAngle); const endOuter = polar(cx, cy, outer, startAngle); const startInner = polar(cx, cy, inner, endAngle); const endInner = polar(cx, cy, inner, startAngle); const largeArc = endAngle - startAngle > 180 ? 1 : 0; return [`M ${endOuter.x} ${endOuter.y}`, `A ${outer} ${outer} 0 ${largeArc} 1 ${startOuter.x} ${startOuter.y}`, `L ${startInner.x} ${startInner.y}`, `A ${inner} ${inner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`, "Z"].join(" "); }
function dateValue(value: string | undefined): number { if (!value) return 0; const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? timestamp : 0; }
function formatDate(value: string | undefined): string { if (!value) return "Not recorded"; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleDateString(undefined, { day: "numeric", month: "short" }); }
function latest<T extends { date: string }>(records: T[] | undefined): T | undefined { return records?.slice().sort((a, b) => dateValue(b.date) - dateValue(a.date))[0]; }
const ANIMAL_ROUTE_PREFIXES = ["/snakes", "/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry", "/enclosure-intelligence"];
function currentSnakeId(pathname: string): string | undefined { const prefix = ANIMAL_ROUTE_PREFIXES.find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`)); if (!prefix || pathname === prefix) return undefined; const remainder = pathname.slice(prefix.length + 1); const [segment] = remainder.split("/"); return segment ? decodeURIComponent(segment) : undefined; }
function routeFor(slice: TitanAtAGlanceSliceId, snakeId?: string): string { switch (slice) { case "feed": return snakeId ? `/snakes/${snakeId}/feeding?action=log` : "/feeding?action=log"; case "weight": return snakeId ? `/snakes/${snakeId}/weights?action=log` : "/weights"; case "shed": return snakeId ? `/snakes/${snakeId}/shedding` : "/shedding"; case "health": return snakeId ? `/snakes/${snakeId}/health` : "/health"; case "behaviour": return snakeId ? `/snakes/${snakeId}/behaviour` : "/behaviour"; case "husbandry": return snakeId ? `/husbandry/${snakeId}` : "/husbandry"; case "intelligence": return "/titan-intelligence"; case "genetics": return "/morph-library"; case "breeding": return "/breeding"; case "snakes": return "/snakes"; case "learning": return "/challenge"; case "community": return "/community"; case "room": return "/reptile-room"; case "knowledge": return "/knowledge-base"; case "contribution": return "/make-contribution"; case "goals": return "/become-a-titan"; case "account": return "/account/personalise"; case "reminders": return "/reminders"; case "thisWeek": return snakeId ? `/titan-intelligence/feature/this-week?snake=${encodeURIComponent(snakeId)}` : "/titan-intelligence/feature/this-week"; default: return "/"; } }
function buildFeedSummary(feed: FeedingRecord | undefined): string { if (!feed) return "Log a feed"; const method = feed.feedingMethod ?? "Method not recorded"; const outcome = feed.response === "Accepted" ? "Success" : feed.response; return `${method} · ${outcome}`; }
function buildView(slice: TitanAtAGlanceSliceId, snake: Snake | undefined): SliceView { const id = snake?.id; const feed = latest<FeedingRecord>(snake?.feedingHistory); const weight = latest<WeightRecord>(snake?.weightHistory); const shed = latest<ShedRecord>(snake?.shedHistory); switch (slice) { case "feed": return { label: "Last Feed", value: feed ? formatDate(feed.date) : "Not yet", secondary: buildFeedSummary(feed), route: routeFor(slice, id) }; case "weight": return { label: "Last Weight", value: weight ? `${weight.weight}${weight.unit}` : "Not yet", secondary: weight ? formatDate(weight.date) : "Record one", route: routeFor(slice, id) }; case "shed": return { label: "Last Shed", value: shed ? formatDate(shed.date) : "Not yet", secondary: shed?.status ?? "Record one", route: routeFor(slice, id) }; case "reminders": return { label: "Reminders", value: "Open", secondary: "See what's due", route: routeFor(slice, id) }; case "thisWeek": return { label: "This Week", value: "Command Centre", secondary: "Your keeper week", route: routeFor(slice, id) }; case "health": return { label: "Health", value: snake?.healthHistory?.length ? `${snake.healthHistory.length} records` : "No records", secondary: "Health & Vet", route: routeFor(slice, id) }; case "behaviour": return { label: "Behaviour", value: "Open", secondary: "Journal & observations", route: routeFor(slice, id) }; case "husbandry": return { label: "Husbandry", value: "Open", secondary: "Environment & care", route: routeFor(slice, id) }; case "intelligence": return { label: "Titan Intelligence", value: "Live", secondary: "Open command centre", route: routeFor(slice, id) }; case "genetics": return { label: "Genetics", value: snake?.morphs?.length ? snake.morphs.slice(0, 1).join(", ") : "Library", secondary: snake?.morphs?.length ? "Morph profile" : "Explore morphs", route: routeFor(slice, id) }; case "breeding": return { label: "Breeding", value: snake?.breedingEligible ? "Eligible" : "Planner", secondary: "Open breeding tools", route: routeFor(slice, id) }; case "snakes": return { label: "My Snakes", value: "Open", secondary: "Your collection", route: routeFor(slice, id) }; case "learning": return { label: "Learn", value: "Open", secondary: "Continue learning", route: routeFor(slice, id) }; case "community": return { label: "Community", value: "Open", secondary: "Keeper community", route: routeFor(slice, id) }; case "room": return { label: "Reptile Room", value: "Open", secondary: "Your room", route: routeFor(slice, id) }; case "knowledge": return { label: "Knowledge Base", value: "Open", secondary: "Find an answer", route: routeFor(slice, id) }; case "contribution": return { label: "Contribute", value: "Open", secondary: "Help Tiny Titans", route: routeFor(slice, id) }; case "goals": return { label: "Titan Goals", value: "Open", secondary: "Your progress", route: routeFor(slice, id) }; case "account": return { label: "Account", value: "Open", secondary: "Personalise Tiny Titans", route: routeFor(slice, id) }; } }

export default function TitanAtAGlance() {
  const { user } = useAuth();
  const { isEasyNav, slices, getSlicesForSnake, loading } = useEasyNav();
  const location = useLocation();
  const navigate = useNavigate();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(false);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
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

  useEffect(() => {
    if (activeSnakeId && snakes.some((snake) => snake.id === activeSnakeId)) setSelectedSnakeId(activeSnakeId);
    if (!activeSnakeId && selectedSnakeId && !snakes.some((snake) => snake.id === selectedSnakeId)) setSelectedSnakeId("");
  }, [activeSnakeId, snakes, selectedSnakeId]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const selectedSlices = useMemo(() => selectedSnakeId ? getSlicesForSnake(selectedSnakeId) : slices, [getSlicesForSnake, selectedSnakeId, slices]);
  const views = useMemo(() => selectedSlices.map((slice) => ({ id: slice, ...buildView(slice, selectedSnake) })), [selectedSlices, selectedSnake]);

  function imageFor(snake: Snake): string | undefined { return snake.photoUrl || snake.imageUrl || snake.photo || undefined; }
  function selectSnake(snakeId: string) { setSelectedSnakeId(snakeId); setPickerOpen(false); }

  if (!isEasyNav || loading) return null;
  const size = 360;
  const centre = size / 2;
  const outer = 158;
  const inner = 83;
  const angleStep = 360 / views.length;
  const gap = Math.min(3, angleStep / 10);

  return <section className="tt-at-glance" aria-label="Titan At A Glance">
    <div className="tt-at-glance-head"><div><span className="tt-at-glance-eyebrow">TITAN AT A GLANCE</span><h1>{selectedSnake ? selectedSnake.name : "Your Tiny Titans"}</h1><p>{loadingSnakes ? "Loading your latest records…" : selectedSnake ? "Tap the Titan in the centre to switch animals." : "Tap the centre to choose a Titan."}</p></div><Link className="tt-at-glance-customise" to="/account/personalise?easy-nav=1">⚙ Customise</Link></div>
    <div className="tt-at-glance-stage">
      <div className="tt-at-glance-wheel-wrap">
        <svg className="tt-at-glance-wheel" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={selectedSnake ? `Quick navigation for ${selectedSnake.name}` : "Customisable Tiny Titans quick navigation wheel"}>
          {views.map((view, index) => { const start = index * angleStep + gap; const end = (index + 1) * angleStep - gap; const mid = (start + end) / 2; const labelPoint = polar(centre, centre, 122, mid); const activate = () => navigate(view.route); return <g key={view.id} className="tt-at-glance-sector" onClick={activate} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } }} aria-label={`${view.label}: ${view.value}. ${view.secondary ?? ""}`}><path d={sectorPath(centre, centre, outer, inner, start, end)} className="tt-at-glance-sector-shape" /><text x={labelPoint.x} y={labelPoint.y - 6} className="tt-at-glance-icon" textAnchor="middle">{TITAN_AT_A_GLANCE_OPTIONS.find((option) => option.id === view.id)?.icon}</text><text x={labelPoint.x} y={labelPoint.y + 15} className="tt-at-glance-label" textAnchor="middle">{view.label}</text><text x={labelPoint.x} y={labelPoint.y + 34} className="tt-at-glance-value" textAnchor="middle">{view.value}</text></g>; })}
          <circle cx={centre} cy={centre} r={inner - 4} className="tt-at-glance-centre" />
        </svg>
        <button type="button" className={`tt-at-glance-centre-button${selectedSnake ? " has-titan" : ""}`} onClick={() => setPickerOpen((open) => !open)} aria-haspopup="dialog" aria-expanded={pickerOpen} aria-label={selectedSnake ? `Switch Titan from ${selectedSnake.name}` : "Select a Titan"}>
          {selectedSnake && imageFor(selectedSnake) ? <img src={imageFor(selectedSnake)} alt="" className="tt-at-glance-centre-photo" /> : <span className="tt-at-glance-centre-icon">🐍</span>}
          <span className="tt-at-glance-centre-name">{selectedSnake?.name ?? "Select a Titan"}</span>
          {selectedSnake && <span className="tt-at-glance-centre-meta">{selectedSnake.weight ? `${selectedSnake.weight}${selectedSnake.weightHistory?.[0]?.unit ?? "g"}` : "Tap to switch"}</span>}
        </button>
      </div>
    </div>
    <div className="tt-at-glance-foot"><span>Showing {views.length} Titan shortcuts</span><Link to="/account/personalise?easy-nav=1">Personalise</Link></div>

    {pickerOpen && <div className="tt-at-glance-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setPickerOpen(false); }}>
      <div className="tt-at-glance-picker" role="dialog" aria-modal="true" aria-labelledby="tt-at-glance-picker-title">
        <div className="tt-at-glance-picker-head"><div><span className="tt-at-glance-eyebrow">TITAN SELECTOR</span><h2 id="tt-at-glance-picker-title">Select your Titan</h2><p>Choose the snake whose records and shortcuts you want to see.</p></div><button type="button" className="tt-at-glance-picker-close" onClick={() => setPickerOpen(false)} aria-label="Close Titan selector">×</button></div>
        <button type="button" className={`tt-at-glance-picker-option all${!selectedSnakeId ? " selected" : ""}`} onClick={() => selectSnake("")}><span className="tt-at-glance-picker-avatar">🐍</span><span><strong>Your Tiny Titans</strong><small>Collection view</small></span>{!selectedSnakeId && <span aria-hidden="true">✓</span>}</button>
        <div className="tt-at-glance-picker-list">{snakes.map((snake) => <button type="button" key={snake.id} className={`tt-at-glance-picker-option${selectedSnakeId === snake.id ? " selected" : ""}`} onClick={() => selectSnake(snake.id)}>{imageFor(snake) ? <img src={imageFor(snake)} alt="" className="tt-at-glance-picker-avatar" /> : <span className="tt-at-glance-picker-avatar">🐍</span>}<span><strong>{snake.name}</strong><small>{snake.morphs?.slice(0, 2).join(" · ") || snake.species}</small></span>{selectedSnakeId === snake.id && <span aria-hidden="true">✓</span>}</button>)}</div>
      </div>
    </div>}
  </section>;
}
