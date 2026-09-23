import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getUserSnakes } from "../../services/snakeService";
import type { Snake } from "../../types/Snake";
import { getUserAnimals } from "../../services/universalAnimalService";
import { formatDaysSinceFeeding, latestFeedingAttempt, latestSuccessfulFeed } from "../../utils/feedingSummary";
import type { WeightRecord } from "../../types/Weight";
import type { ShedRecord } from "../../types/Shed";
import { TITAN_AT_A_GLANCE_OPTIONS, useEasyNav, type TitanAtAGlanceSliceId } from "../../context/EasyNavContext";
import "./TitanAtAGlance.css";

type Point = { x: number; y: number };
type AtAGlanceAnimal = {
  id: string;
  name: string;
  species?: string;
  animalGroup?: string;
  recordSource: "universal" | "legacy-snake";
  weightRecords: number;
  feedingRecords: number;
  shedRecords: number;
  healthRecords: number;
  legacySnake?: Snake;
};
type SliceView = { label: string; value: string; secondary?: string; route: string; feedSecondary?: string };

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
  return [
    `M ${endOuter.x} ${endOuter.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${startOuter.x} ${startOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
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

const ANIMAL_ROUTE_PREFIXES = ["/animals", "/snakes", "/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry", "/enclosure-intelligence"];

function currentAnimalId(pathname: string): string | undefined {
  const prefix = ANIMAL_ROUTE_PREFIXES.find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
  if (!prefix || pathname === prefix) return undefined;
  const remainder = pathname.slice(prefix.length + 1);
  const [segment] = remainder.split("/");
  return segment ? decodeURIComponent(segment) : undefined;
}

function routeFor(slice: TitanAtAGlanceSliceId, animal?: AtAGlanceAnimal): string {
  const snakeId = animal?.recordSource === "legacy-snake" ? animal.id : undefined;
  const universalPath = animal?.recordSource === "universal" ? `/animals/${animal.id}` : undefined;
  switch (slice) {
    case "feed": return snakeId ? `/snakes/${snakeId}/feeding?action=log` : universalPath ?? "/feeding?action=log";
    case "weight": return snakeId ? `/snakes/${snakeId}/weights?action=log` : universalPath ?? "/weights";
    case "shed": return snakeId ? `/snakes/${snakeId}/shedding` : universalPath ?? "/shedding";
    case "health": return snakeId ? `/snakes/${snakeId}/health` : universalPath ?? "/health";
    case "behaviour": return snakeId ? `/snakes/${snakeId}/behaviour` : universalPath ?? "/behaviour";
    case "husbandry": return snakeId ? `/husbandry/${snakeId}` : universalPath ?? "/husbandry";
    case "intelligence": return "/titan-intelligence";
    case "genetics": return "/morph-library";
    case "breeding": return "/breeding";
    case "snakes": return "/animals";
    case "learning": return "/challenge";
    case "community": return "/community";
    case "room": return "/reptile-room";
    case "knowledge": return "/knowledge-base";
    case "contribution": return "/make-contribution";
    case "goals": return "/become-a-titan";
    case "account": return "/account/personalise";
    case "reminders": return "/reminders";
    case "thisWeek": return snakeId ? `/titan-intelligence/feature/this-week?snake=${encodeURIComponent(snakeId)}` : universalPath ?? "/titan-intelligence/feature/this-week";
    case "creatorCentre": return "/creator";
    default: return "/";
  }
}

function buildView(slice: TitanAtAGlanceSliceId, animal: AtAGlanceAnimal | undefined): SliceView {
  const legacy = animal?.legacySnake;
  switch (slice) {
    case "feed": {
      const attempt = latestFeedingAttempt(legacy?.feedingHistory);
      const successful = latestSuccessfulFeed(legacy?.feedingHistory);
      return {
        label: "Last feed attempt",
        value: attempt?.date ? formatDaysSinceFeeding(attempt.date) : "Not recorded",
        secondary: attempt ? "Latest recorded feeding attempt" : animal?.recordSource === "universal" ? "Open animal record" : "Log a feeding attempt",
        feedSecondary: successful?.date ? `Successful: ${formatDaysSinceFeeding(successful.date)}` : "Successful: Not recorded",
        route: routeFor(slice, animal),
      };
    }
    case "weight": {
      const weight = latest<WeightRecord>(legacy?.weightHistory);
      return { label: "Last Weight", value: weight ? `${weight.weight}${weight.unit}` : animal?.recordSource === "universal" ? "Open record" : "Not yet", secondary: weight ? formatDate(weight.date) : animal?.recordSource === "universal" ? "Universal animal record" : "Record one", route: routeFor(slice, animal) };
    }
    case "shed": {
      const shed = latest<ShedRecord>(legacy?.shedHistory);
      return { label: "Last Shed", value: shed ? formatDate(shed.date) : animal?.recordSource === "universal" ? "Open record" : "Not yet", secondary: shed?.status ?? (animal?.recordSource === "universal" ? "Universal animal record" : "Record one"), route: routeFor(slice, animal) };
    }
    case "reminders": return { label: "Reminders", value: "Open", secondary: "See what's due", route: routeFor(slice, animal) };
    case "thisWeek": return { label: "This Week", value: "Command Centre", secondary: "Your keeper week", route: routeFor(slice, animal) };
    case "health": return { label: "Health", value: legacy?.healthHistory?.length ? `${legacy.healthHistory.length} records` : animal?.recordSource === "universal" ? "Open record" : "No records", secondary: "Health & Vet", route: routeFor(slice, animal) };
    case "behaviour": return { label: "Behaviour", value: "Open", secondary: "Journal & observations", route: routeFor(slice, animal) };
    case "husbandry": return { label: "Husbandry", value: "Open", secondary: "Environment & care", route: routeFor(slice, animal) };
    case "intelligence": return { label: "Titan Intelligence", value: "Live", secondary: "Open command centre", route: routeFor(slice, animal) };
    case "genetics": return { label: "Genetics", value: legacy?.morphs?.length ? legacy.morphs.slice(0, 1).join(", ") : "Library", secondary: legacy?.morphs?.length ? "Morph profile" : "Explore genetics", route: routeFor(slice, animal) };
    case "breeding": return { label: "Breeding", value: legacy?.breedingEligible ? "Eligible" : animal?.recordSource === "universal" ? "Open planner" : "Planner", secondary: "Open breeding tools", route: routeFor(slice, animal) };
    case "snakes": return { label: "My Animals", value: "Open", secondary: "Your collection", route: routeFor(slice, animal) };
    case "learning": return { label: "Learn", value: "Open", secondary: "Continue learning", route: routeFor(slice, animal) };
    case "community": return { label: "Community", value: "Open", secondary: "Keeper community", route: routeFor(slice, animal) };
    case "room": return { label: "Keeper Room", value: "Open", secondary: "Your keeper room", route: routeFor(slice, animal) };
    case "knowledge": return { label: "Knowledge Base", value: "Open", secondary: "Find an answer", route: routeFor(slice, animal) };
    case "contribution": return { label: "Contribute", value: "Open", secondary: "Help Tiny Titans", route: routeFor(slice, animal) };
    case "goals": return { label: "Titan Goals", value: "Open", secondary: "Your progress", route: routeFor(slice, animal) };
    case "account": return { label: "Account", value: "Open", secondary: "Personalise Tiny Titans", route: routeFor(slice, animal) };
    case "creatorCentre": return { label: "Creator Centre", value: "Private", secondary: "Creator tools", route: routeFor(slice, animal) };
  }
}

function animalPhoto(animal: AtAGlanceAnimal | undefined): string | undefined {
  return animal?.legacySnake?.photo || animal?.legacySnake?.imageUrl || animal?.legacySnake?.photoUrl || undefined;
}
function animalFallbackIcon(animal: AtAGlanceAnimal | undefined): string {
  const group = (animal?.animalGroup || "").toLowerCase();
  if (animal?.recordSource === "legacy-snake" || group.includes("reptile") || group.includes("snake") || group.includes("lizard")) return "/animal-icons/snake.svg";
  if (group.includes("arachnid") || group.includes("spider") || group.includes("scorpion")) return "/animal-icons/spider.svg";
  if (group.includes("bird")) return "/animal-icons/bird.svg";
  if (group.includes("fish")) return "/animal-icons/fish.svg";
  if (group.includes("amphib")) return "/animal-icons/amphibian.svg";
  if (group.includes("insect")) return "/animal-icons/insect.svg";
  if (group.includes("mammal")) return "/animal-icons/mammal.svg";
  if (group.includes("cephalopod")) return "/animal-icons/cephalopod.svg";
  if (group.includes("crustacean")) return "/animal-icons/crustacean.svg";
  if (group.includes("mollusc")) return "/animal-icons/mollusc.svg";
  if (group.includes("myriapod")) return "/animal-icons/myriapod.svg";
  return "/animal-icons/amphibian.svg";
}


export default function TitanAtAGlance() {
  const { user } = useAuth();
  const { isEasyNav, slices, loading } = useEasyNav();
  const location = useLocation();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<AtAGlanceAnimal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [animalPickerOpen, setAnimalPickerOpen] = useState(false);
  const [selectedAnimalOverride, setSelectedAnimalOverride] = useState<AtAGlanceAnimal | undefined>(undefined);
  const activeAnimalId = currentAnimalId(location.pathname);

  useEffect(() => {
    if (!user || !isEasyNav) return undefined;
    let active = true;
    setLoadingAnimals(true);
    void Promise.all([getUserSnakes(user.uid), getUserAnimals(user.uid)]).then(([records, universalAnimals]) => {
      if (!active) return;
      const legacy: AtAGlanceAnimal[] = records.filter((snake) => snake.status !== "Deceased").map((snake) => ({
        id: snake.id,
        name: snake.name,
        species: snake.species,
        animalGroup: "reptile",
        recordSource: "legacy-snake",
        weightRecords: snake.weightHistory?.length ?? 0,
        feedingRecords: snake.feedingHistory?.length ?? 0,
        shedRecords: snake.shedHistory?.length ?? 0,
        healthRecords: snake.healthHistory?.length ?? 0,
        legacySnake: snake,
      }));
      const universal: AtAGlanceAnimal[] = universalAnimals.filter((animal) => !["deceased", "archived"].includes(animal.status)).map((animal) => ({
        id: animal.id,
        name: animal.name,
        species: animal.speciesCommonName || animal.scientificName,
        animalGroup: animal.animalGroup,
        recordSource: "universal",
        weightRecords: 0,
        feedingRecords: 0,
        shedRecords: 0,
        healthRecords: 0,
      }));
      setAnimals([...legacy, ...universal].sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(() => {
      if (active) setAnimals([]);
    }).finally(() => {
      if (active) setLoadingAnimals(false);
    });
    return () => { active = false; };
  }, [user, isEasyNav]);

  useEffect(() => {
    if (activeAnimalId) {
      setSelectedAnimalOverride(undefined);
      setAnimalPickerOpen(false);
    }
  }, [activeAnimalId]);

  const selectedAnimal = useMemo(
    () => selectedAnimalOverride ?? animals.find((animal) => animal.id === activeAnimalId) ?? animals[0],
    [selectedAnimalOverride, animals, activeAnimalId],
  );
  const views = useMemo(
    () => slices.map((slice) => ({ id: slice, ...buildView(slice, selectedAnimal) })),
    [slices, selectedAnimal],
  );

  if (!isEasyNav || loading) return null;

  const size = 360;
  const centre = size / 2;
  const outer = 158;
  const inner = 83;
  const angleStep = 360 / views.length;
  const gap = Math.min(3, angleStep / 10);

  const selectedPhoto = animalPhoto(selectedAnimal);
  const openAnimalPicker = () => {
    if (loadingAnimals || animals.length === 0) {
      navigate("/animals");
      return;
    }
    setAnimalPickerOpen((open) => !open);
  };
  const activateAnimal = (animal: AtAGlanceAnimal) => {
    setSelectedAnimalOverride(animal);
    setAnimalPickerOpen(false);
  };

  return (
    <section className="tt-at-glance" aria-label="Titan At A Glance">
      <div className="tt-at-glance-head">
        <div>
          <span className="tt-at-glance-eyebrow">TITAN AT A GLANCE</span>
          <h1>{selectedAnimal ? selectedAnimal.name : "Your Tiny Titans"}</h1>
          <p>{loadingAnimals ? "Loading your latest records…" : selectedAnimal ? "Tap a slice to view, update or review it." : "Tap a slice to open what you need."}</p>
        </div>
        <Link className="tt-at-glance-customise" to="/account/personalise?easy-nav=1">⚙ Customise</Link>
      </div>

      <div className="tt-at-glance-stage">
        <svg className="tt-at-glance-wheel" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Customisable Tiny Titans quick navigation wheel">
          <defs>
            <clipPath id="tt-at-glance-centre-clip">
              <circle cx={centre} cy={centre} r={inner - 5} />
            </clipPath>
          </defs>
          {views.map((view, index) => {
            const start = index * angleStep + gap;
            const end = (index + 1) * angleStep - gap;
            const mid = (start + end) / 2;
            const labelPoint = polar(centre, centre, 122, mid);
            const activate = () => navigate(view.route);
            return (
              <g key={view.id} className="tt-at-glance-sector" onClick={activate} role="button" tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                  }
                }}
                aria-label={`${view.label}: ${view.value}. ${view.secondary ?? ""}`}
              >
                <path d={sectorPath(centre, centre, outer, inner, start, end)} className="tt-at-glance-sector-shape" />
                <text x={labelPoint.x} y={labelPoint.y - 6} className="tt-at-glance-icon" textAnchor="middle">{TITAN_AT_A_GLANCE_OPTIONS.find((option) => option.id === view.id)?.icon}</text>
                <text x={labelPoint.x} y={labelPoint.y + 15} className="tt-at-glance-label" textAnchor="middle">{view.label}</text>
                <text x={labelPoint.x} y={labelPoint.y + 34} className="tt-at-glance-value" textAnchor="middle">{view.value}</text>
                {view.feedSecondary && <text x={labelPoint.x} y={labelPoint.y + 50} className="tt-at-glance-secondary tt-at-glance-feed-secondary" textAnchor="middle">{view.feedSecondary}</text>}
              </g>
            );
          })}

          <g
            className={`tt-at-glance-centre-action${animalPickerOpen ? " open" : ""}`}
            onClick={openAnimalPicker}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openAnimalPicker();
              }
            }}
            aria-label={selectedAnimal ? `Select animal. Currently ${selectedAnimal.name}` : "Select an animal"}
            aria-expanded={animalPickerOpen}
          >
            <circle cx={centre} cy={centre} r={inner - 4} className="tt-at-glance-centre" />
            {selectedPhoto ? (
              <image href={selectedPhoto} x={centre - (inner - 5)} y={centre - (inner - 5)} width={(inner - 5) * 2} height={(inner - 5) * 2}
                preserveAspectRatio="xMidYMid slice" clipPath="url(#tt-at-glance-centre-clip)" className="tt-at-glance-centre-photo" aria-hidden="true" />
            ) : (
              <image
                href={animalFallbackIcon(selectedAnimal)}
                x={centre - 24}
                y={centre - 24}
                width="48"
                height="48"
                className="tt-at-glance-centre-icon"
                aria-hidden="true"
              />
            )}
            <circle cx={centre} cy={centre} r={inner - 4} className="tt-at-glance-centre-ring" />
            <text x={centre} y={centre + 18} className="tt-at-glance-centre-name" textAnchor="middle">{selectedAnimal?.name ?? "Tiny Titans"}</text>
          </g>
        </svg>

        {animalPickerOpen && (
          <div className="tt-at-glance-snake-picker" role="dialog" aria-label="Select an animal">
            <div className="tt-at-glance-snake-picker-head">
              <strong>Select your animal</strong>
              <button type="button" onClick={() => setAnimalPickerOpen(false)} aria-label="Close animal selector">×</button>
            </div>
            <div className="tt-at-glance-snake-picker-list">
              {animals.map((animal) => {
                const photo = animalPhoto(animal);
                return (
                  <button type="button" key={`${animal.recordSource}:${animal.id}`} className={animal.id === selectedAnimal?.id ? "selected" : ""} onClick={() => activateAnimal(animal)}>
                    <span className="tt-at-glance-snake-avatar">
                      {photo ? <img src={photo} alt="" loading="lazy" /> : <span aria-hidden="true">🐾</span>}
                    </span>
                    <span>
                      <strong>{animal.name}</strong>
                      <small>{animal.species || animal.animalGroup || "Species awaiting identification"}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            {animals.length > 0 && <Link to="/animals" onClick={() => setAnimalPickerOpen(false)} className="tt-at-glance-snake-picker-all">Manage all animals →</Link>}
          </div>
        )}
      </div>

      <div className="tt-at-glance-foot">
        <span>Showing {views.length} personalised shortcuts</span>
        <Link to="/animals">Switch animal</Link>
      </div>
    </section>
  );
}
