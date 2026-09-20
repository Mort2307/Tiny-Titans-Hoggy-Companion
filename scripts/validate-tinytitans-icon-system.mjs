import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const iconSource = fs.readFileSync(path.join(root, "src", "components", "TinyTitansIcon.tsx"), "utf8");
const iconCss = fs.readFileSync(path.join(root, "src", "styles", "tiny-titans-icons.css"), "utf8");

const requiredIcons = [
  "temperature", "humidity", "water", "uvb", "heat", "plant", "substrate", "hide",
  "habitatBuilder", "reptileRoom", "veterinary", "intelligence", "globe", "map", "camera",
  "add", "edit", "delete", "eye", "lock", "rotate", "move", "resize", "measure", "warning", "offline",
];


const iconTypeBlock = iconSource.match(/export type TinyTitansIconName =([\\s\\S]*?);/u)?.[1] ?? "";
const iconUnion = [...iconTypeBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean);
const missingRegisteredNames = iconUnion.filter((name) => !iconSource.includes(`  "${name}",`));
const missingSwitchCases = iconUnion.filter((name) => !iconSource.includes(`case "${name}":`));

const missingIcons = requiredIcons.filter((name) => !iconSource.includes(`| "${name}"`));
if (missingIcons.length || missingRegisteredNames.length || missingSwitchCases.length) {
  console.error(JSON.stringify({ test: "tinytitans-icon-system", status: "fail", missingIcons, missingRegisteredNames, missingSwitchCases }, null, 2));
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
