import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src", "data", "quickNavigation.ts"), "utf8");
const navigationSource = fs.readFileSync(path.join(root, "src", "components", "Layout", "Navigation.tsx"), "utf8");
const quickViewSource = fs.readFileSync(path.join(root, "src", "components", "Layout", "QuickModeNavigation.tsx"), "utf8");
const layoutSource = fs.readFileSync(path.join(root, "src", "components", "Layout", "LayoutChrome.tsx"), "utf8");
const errors = [];

function walkSource(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSource(full);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const required = [
  "/", "/animals", "/species", "/reminders", "/husbandry", "/weights", "/feeding", "/shedding", "/health", "/behaviour",
  "/enclosure-intelligence", "/morph-library", "/calculator", "/breeding", "/breeding/academy", "/breeding/readiness", "/breeding/timeline",
  "/breeding/cycle", "/breeding/production", "/titan-intelligence", "/keeper-handbook", "/behaviour-observatory", "/knowledge-base",
  "/learn", "/adaptive-learning", "/challenge", "/learn/achievements", "/community", "/community/features", "/community/mentorship",
  "/community/vivarium-showcase", "/community/wall-of-titans", "/make-contribution", "/report-bug", "/feedback", "/account",
  "/account/personalise", "/account/family", "/account/security", "/account/data-privacy", "/account/intelligence", "/become-a-titan",
  "/founder", "/sandbox",
];

for (const route of required) {
  if (!source.includes(`path: "${route}"`)) errors.push(`Missing Quick View destination: ${route}`);
}

const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);\nconst paths = [...source.matchAll(/path: "([^"]+)"/g)].map((match) => match[1]);
if (new Set(ids).size !== ids.length) errors.push("Quick View feature registry contains duplicate IDs.");
if (new Set(paths).size !== paths.length) errors.push("Quick View feature registry contains duplicate destination paths.");
if (source.includes('path: "/reptile-room"')) errors.push("Quick View must not expose the retired /reptile-room route.");
if (/\bClassic\b|\bQuick Mode\b/.test(source)) errors.push("Quick View registry contains retired navigation-mode terminology.");
if (ids.length < required.length) errors.push(`Quick View registry contains ${ids.length} items but requires at least ${required.length}.`);
if (/StandardNavigation|MobileNavigation/.test(navigationSource + quickViewSource + layoutSource)) errors.push("Active app chrome must not depend on retired navigation components.");
if (!layoutSource.includes('data-navigation-mode="quick"')) errors.push("Layout chrome must declare Quick View as the canonical navigation mode.");
if (layoutSource.includes('data-navigation-mode={')) errors.push("Layout chrome must not dynamically switch navigation modes.");

const retiredPaths = [
  path.join(root, "src", "components", "Layout", "StandardNavigation.tsx"),
  path.join(root, "src", "components", "MobileNavigation.tsx"),
  path.join(root, "src", "styles", "mobileNavigation.css"),
];
for (const retiredPath of retiredPaths) {
  if (fs.existsSync(retiredPath)) errors.push(`Retired navigation file still exists: ${path.relative(root, retiredPath).replaceAll("\\", "/")}.`);
}

const retiredComponentFiles = new Set([
  path.join(root, "src", "components", "Layout", "StandardNavigation.tsx"),
  path.join(root, "src", "components", "MobileNavigation.tsx"),
]);
for (const file of walkSource(path.join(root, "src"))) {
  if (retiredComponentFiles.has(file)) continue;
  const fileSource = fs.readFileSync(file, "utf8");
  if (/\b(?:StandardNavigation|MobileNavigation)\b/.test(fileSource)) {
    errors.push(`Retired navigation reference found in ${path.relative(root, file).replaceAll("\\", "/")}.`);
  }
}

if (errors.length) {
  console.error("Tiny Titans Quick Navigation validation FAILED:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Quick Navigation validation passed: ${ids.length} full-app destinations registered.`);
