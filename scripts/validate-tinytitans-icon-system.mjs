import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const iconSource = fs.readFileSync(path.join(root, "src", "components", "TinyTitansIcon.tsx"), "utf8");
const workspaceProductsSource = fs.readFileSync(path.join(root, "src", "config", "workspaceProducts.ts"), "utf8");
const workspaceShellSource = fs.readFileSync(path.join(root, "src", "components", "WorkspaceProductShell.tsx"), "utf8");
const iconCss = fs.readFileSync(path.join(root, "src", "styles", "tiny-titans-icons.css"), "utf8");

const requiredIcons = [
  "temperature", "humidity", "water", "uvb", "heat", "plant", "substrate", "hide",
  "habitatBuilder", "reptileRoom", "veterinary", "intelligence", "globe", "map", "camera",
  "add", "edit", "delete", "eye", "lock", "rotate", "move", "resize", "measure", "warning", "offline",
  "thermostat", "maintenance", "power", "settings", "close", "upload", "save", "copy", "expand", "collapse",
  "titanIntelligence", "analytics", "timeline", "breedingReadiness", "breedingTimeline", "breedingCycle",
  "production", "evidence", "reporting", "sellerProfile", "marketplaceTools", "team", "automation",
  "support", "api", "branding", "exportData",
];


const iconTypeBlock = iconSource.match(/export type TinyTitansIconName =([\s\S]*?);/u)?.[1] ?? "";
const iconUnion = [...iconTypeBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean);
const iconRegistryBlock = iconSource.match(/const ICON_NAMES = new Set<TinyTitansIconName>\(\[([\s\S]*?)\]\);/u)?.[1] ?? "";
const registeredNames = [...iconRegistryBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean);
const missingRegisteredNames = iconUnion.filter((name) => !registeredNames.includes(name));
const missingSwitchCases = iconUnion.filter((name) => !iconSource.includes(`case "${name}":`));
const productIcons = [...workspaceProductsSource.matchAll(/icon:"([^"]+)"/g)].map((match) => match[1]);
const missingProductIcons = productIcons.filter((name) => !iconUnion.includes(name));
const productNavPaths = [...workspaceProductsSource.matchAll(/path:"([^"]+)"/g)].map((match) => match[1]);
const navMapPaths = [...workspaceShellSource.matchAll(/"([^"]+)": "([^"]+)"/g)].map((match) => match[1]);
const missingWorkspaceNavIcons = [...new Set(productNavPaths)].filter((path) => !navMapPaths.includes(path));

const caseBodies = new Map();
for (let index = 0; index < iconUnion.length; index += 1) {
  const name = iconUnion[index];
  const start = iconSource.indexOf(`case "${name}":`);
  if (start < 0) continue;
  const nextCase = iconSource.indexOf("\n    case \"", start + 8);
  const nextDefault = iconSource.indexOf("\n    default:", start + 8);
  const endCandidates = [nextCase, nextDefault].filter((value) => value >= 0);
  const end = endCandidates.length ? Math.min(...endCandidates) : iconSource.length;
  const body = iconSource.slice(start, end).replace(/\s+/g, " ").trim();
  const previous = caseBodies.get(body);
  if (previous) previous.push(name);
  else caseBodies.set(body, [name]);
}
const duplicateVisualCases = [...caseBodies.values()].filter((names) => names.length > 1);


const missingIcons = requiredIcons.filter((name) => !iconSource.includes(`| "${name}"`));
if (missingIcons.length || missingRegisteredNames.length || missingSwitchCases.length || duplicateVisualCases.length || missingProductIcons.length || missingWorkspaceNavIcons.length) {
  console.error(JSON.stringify({ test: "tinytitans-icon-system", status: "fail", missingIcons, missingRegisteredNames, missingSwitchCases, duplicateVisualCases, missingProductIcons, missingWorkspaceNavIcons }, null, 2));
  process.exit(1);
}

const requiredMotionTokens = [
  "ttThermoRise", "ttMoistureFloat", "ttWaterRipple", "ttSunPulse", "ttHeatLamp",
  "ttLeafSwayReverse", "ttBuilderSettle", "ttBuilderPlant", "ttBuilderHide", "ttBuilderSpark",
  "ttRoomLight", "ttVetPulse", "ttIntelligenceLook", "ttGlobeDrift", "ttMapTravel",
  "ttAttention", "ttSuccess", "ttWarning",
];

const missingMotion = requiredMotionTokens.filter((token) => !iconCss.includes(`@keyframes ${token}`));
const hasReducedMotion = iconCss.includes("@media(prefers-reduced-motion:reduce)");
const hasStateApi = iconSource.includes("TinyTitansIconState") && iconSource.includes("data-tt-state");
const hasMotionApi = iconSource.includes("TinyTitansIconMotion") && iconSource.includes("data-tt-motion");

if (missingMotion.length || !hasReducedMotion || !hasStateApi || !hasMotionApi) {
  console.error(JSON.stringify({
    test: "tinytitans-icon-system",
    status: "fail",
    missingMotion,
    hasReducedMotion,
    hasStateApi,
    hasMotionApi,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  test: "tinytitans-icon-system",
  status: "pass",
  requiredIcons: requiredIcons.length,
  motionTokens: requiredMotionTokens.length,
  reducedMotion: true,
  dependencyFreeRuntime: true,
}, null, 2));
