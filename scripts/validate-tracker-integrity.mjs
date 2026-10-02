import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const errors = [];

const routes = read("src", "routes", "AuthenticatedRoutes.tsx");
const weightIndex = read("src", "pages", "WeightIndex.tsx");
const weightRecords = read("src", "pages", "WeightRecords.tsx");
const weightChart = read("src", "components", "WeightChart.tsx");
const weightMiniChart = read("src", "components", "WeightMiniChart.tsx");
const weightHook = read("src", "hooks", "useWeightRecords.ts");
const weightCss = read("src", "styles", "weight-tracker.css");
const feeding = read("src", "pages", "FeedingTracker.tsx");
const shed = read("src", "pages", "ShedTrackerIntelligent.tsx");
const health = read("src", "pages", "HealthTracker.tsx");
const behaviour = read("src", "pages", "BehaviourTracker.tsx");
const homeCurrentAnimal = read("src", "components", "Home", "HomeCurrentAnimalSection.tsx");
const profileQuickActions = read("src", "components", "SnakeProfile", "SnakeProfileQuickActions.tsx");
const quickNavigation = read("src", "data", "quickNavigation.ts");
const pageRegistry = read("src", "config", "tinyTitansPageRegistry.ts");
const packageJson = JSON.parse(read("package.json"));

function requireSource(source, pattern, message) {
  const ok = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (!ok) errors.push(message);
}

const routeContracts = [
  ['path="/weights"', "Weight index route is missing."],
  ['path="/weights/:id"', "Weight detail route is missing."],
  ['path="/snakes/:id/weights"', "Snake weight alias route is missing."],
  ['path="/feeding"', "Feeding index route is missing."],
  ['path="/snakes/:id/feeding"', "Snake feeding route is missing."],
  ['path="/shedding"', "Shed index route is missing."],
  ['path="/snakes/:id/shedding"', "Snake shed route is missing."],
  ['path="/health"', "Health index route is missing."],
  ['path="/snakes/:id/health"', "Snake health route is missing."],
  ['path="/behaviour"', "Behaviour index route is missing."],
  ['path="/snakes/:id/behaviour"', "Snake behaviour route is missing."],
];
for (const [route, message] of routeContracts) requireSource(routes, route, message);

for (const trackerPath of ["/weights", "/feeding", "/shedding", "/health", "/behaviour"]) {
  requireSource(quickNavigation, `path: "${trackerPath}"`, `Quick View must keep ${trackerPath} discoverable.`);
  requireSource(pageRegistry, `path: "${trackerPath}"`, `Page registry must keep ${trackerPath} discoverable.`);
}

requireSource(weightIndex, 'import WeightMiniChart from "../components/WeightMiniChart"', "Weight overview must import WeightMiniChart.");
requireSource(weightIndex, 'data-chart="weight-mini"', "Weight overview cards must expose the mini-chart surface.");
requireSource(weightIndex, /history\.length\s*>=\s*2\s*\?\s*<WeightMiniChart/, "Weight overview must render a mini trend when two or more records exist.");

requireSource(weightRecords, 'import WeightChart from "../components/WeightChart"', "Weight detail must import WeightChart.");
requireSource(weightRecords, 'import "../styles/weight-tracker.css"', "Weight detail must import the dedicated weight-chart stylesheet.");
requireSource(weightRecords, 'data-chart="weight-growth"', "Weight detail must expose the main growth-chart surface.");
requireSource(weightRecords, 'id="weight-chart"', "Weight detail must keep a direct Trend navigation target.");
requireSource(weightRecords, /chartHistory\.length\s*>=\s*2\s*\?\s*<WeightChart/, "Weight detail must render the trend chart when two or more plotted points exist.");
if (weightRecords.indexOf('id="weight-chart"') > weightRecords.indexOf('id="weight-log"')) {
  errors.push("Weight growth chart must remain above the logging form in the tracker hierarchy.");
}

requireSource(weightChart, 'from "recharts"', "WeightChart must use the chart renderer.");
requireSource(weightChart, "<ResponsiveContainer", "WeightChart must remain responsive.");
requireSource(weightChart, 'className="weight-chart-container weight-chart-container--detail"', "WeightChart must retain its measurable detail-chart container.");
requireSource(weightChart, 'role="img"', "WeightChart must expose chart semantics.");

requireSource(weightMiniChart, 'from "recharts"', "WeightMiniChart must use the chart renderer.");
requireSource(weightMiniChart, "<ResponsiveContainer", "WeightMiniChart must remain responsive.");
requireSource(weightMiniChart, "getSnakeWeights", "WeightMiniChart must retain canonical Firestore reconciliation.");

requireSource(weightHook, "migrateEmbeddedWeights", "Weight tracker must retain migration of legacy embedded history.");
requireSource(weightHook, "const chartHistory = useMemo", "Weight tracker must retain plotted-history construction.");
requireSource(weightHook, "records.push(...history)", "Weight chart history must include canonical recorded weights.");
requireSource(homeCurrentAnimal, "/snakes/${selectedSnake?.id}/weights", "Home current-animal actions must keep Weight directly reachable.");
requireSource(profileQuickActions, 'navigate("/weights/" + snakeId)', "Animal profile quick actions must keep Weight directly reachable.");

requireSource(weightCss, /\.weight-chart-container--detail\s*\{[\s\S]*?height:\s*300px;/, "Weight detail chart must retain a guaranteed desktop height.");
requireSource(weightCss, /@media \(max-width:\s*650px\)[\s\S]*?\.weight-chart-container--detail\s*\{[\s\S]*?height:\s*260px;/, "Weight detail chart must retain a guaranteed mobile height.");
requireSource(weightCss, /\.tt-weight-growth-chart\s*\{[\s\S]*?min-height:/, "Weight chart panel must retain measurable layout height.");

requireSource(feeding, 'useFeedingTracker', "Feeding tracker must retain its canonical tracker hook.");
for (const component of ["FeedingOverviewStats", "FeedingLogForm", "FeedingHistory"]) {
  requireSource(feeding, component, `Feeding tracker must retain ${component}.`);
}
requireSource(feeding, 'className="tt-tracker-page"', "Feeding tracker must retain the shared tracker workspace.");

requireSource(shed, "useShedTrackerIntelligent", "Shed tracker must retain its intelligence-backed tracker hook.");
for (const id of ['id="shed-overview"', 'id="shed-log"', 'id="shed-history"']) {
  requireSource(shed, id, `Shed tracker is missing required section ${id}.`);
}
requireSource(shed, "records.length", "Shed tracker must retain recorded-cycle history.");

requireSource(health, "useHealthTracker", "Health tracker must retain its canonical tracker hook.");
requireSource(health, 'className="tt-tracker-page"', "Health tracker must remain on the unified tracker workspace.");
requireSource(health, 'id="health-overview"', "Health tracker must retain its overview target.");
requireSource(health, 'id="health-record"', "Health tracker must retain its record form target.");
requireSource(health, 'id="health-history"', "Health tracker must retain its auditable history target.");
requireSource(health, "medicationRecords", "Health tracker must retain medication schedule tracking.");
requireSource(health, "/snakes/${snakeId}/weights", "Health tracker must retain direct Weight navigation.");
requireSource(health, "/snakes/${snakeId}/behaviour", "Health tracker must retain direct Behaviour navigation.");

requireSource(behaviour, "getSnakeBehaviourRecords", "Behaviour tracker must load canonical behaviour records.");
requireSource(behaviour, 'className="tt-tracker-page"', "Behaviour tracker must remain on the unified tracker workspace.");
requireSource(behaviour, 'id="behaviour-overview"', "Behaviour tracker must retain its overview target.");
requireSource(behaviour, 'id="behaviour-record"', "Behaviour tracker must retain its journal target.");
requireSource(behaviour, 'id="behaviour-history"', "Behaviour tracker must retain observation history target.");
requireSource(behaviour, "records.map", "Behaviour tracker must retain observation history.");
requireSource(behaviour, "Life Timeline", "Behaviour records must retain timeline deep-link editing support.");
requireSource(behaviour, "/snakes/${snakeId}/weights", "Behaviour tracker must retain direct Weight navigation.");
requireSource(behaviour, "/snakes/${snakeId}/health", "Behaviour tracker must retain direct Health navigation.");

if (!packageJson.dependencies?.recharts) {
  errors.push("The chart renderer dependency recharts is missing.");
}

if (errors.length) {
  console.error("Tiny Titans tracker integrity validation FAILED:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Tiny Titans tracker integrity validation passed.");
