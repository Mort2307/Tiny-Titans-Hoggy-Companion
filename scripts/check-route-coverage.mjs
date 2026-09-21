import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const routerPath = path.join(srcRoot, "routes", "AuthenticatedRoutes.tsx");
const router = fs.readFileSync(routerPath, "utf8");

const LAYOUT_SPECIAL_ROUTES = [
  "/plans",
  "/account/billing",
  "/paid",
  "/paid/analytics",
  "/paid/timeline",
  "/paid/export",
  "/paid/seller",
  "/paid/marketplace",
  "/paid/business",
  "/paid/team",
  "/paid/automation",
  "/paid/support",
  "/paid/api",
  "/paid/branding",
  "/rescue/log",
];

const routes = [];
for (const match of router.matchAll(/<Route\s+path=["']([^"']+)["']/g)) routes.push(match[1]);

const uniqueRoutes = [...new Set([...routes, ...LAYOUT_SPECIAL_ROUTES])];
const dynamicRoutes = uniqueRoutes.filter((route) => /:[^/]+|\*/.test(route));
const redirects = routes.filter((route) => {
  const start = router.indexOf(`<Route path="${route}"`);
  const end = start >= 0 ? router.indexOf(" />", start) : -1;
  return start >= 0 && end >= 0 && router.slice(start, end).includes("<Navigate");
});

const sourceFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", "dist"].includes(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(srcRoot);

const navigationTargets = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  for (const match of text.matchAll(/\bnavigate\(\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g)) navigationTargets.push({ file: relative, target: match[1] ?? match[2] ?? match[3] });
  for (const match of text.matchAll(/\bhref=["']([^"']+)["']/g)) if (match[1].startsWith("/")) navigationTargets.push({ file: relative, target: match[1] });
}

function routeRegex(route) {
  const tokens = route.split(/(:[^/]+|\*)/g);
  const escaped = tokens.map((token) => token === "*" ? ".*" : /^:[^/]+$/.test(token) ? "[^/]+" : token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("");
  return new RegExp(`^${escaped}/?$`);
}

const patterns = uniqueRoutes.filter((route) => route !== "*").map((route) => ({ route, regex: routeRegex(route) }));
const unresolvedTargets = navigationTargets.filter(({ target }) => target && target.startsWith("/") && !target.includes("${") && !patterns.some(({ regex }) => regex.test(target.split(/[?#]/)[0])));
const allowedConditionalDuplicates = new Set(["/login", "/account-setup", "/rescue/animals/:animalId", "*"]);
const duplicateRoutes = [...new Set(routes.filter((route, index) => routes.indexOf(route) !== index))].filter((route) => !allowedConditionalDuplicates.has(route));

const findings = [];
if (!uniqueRoutes.length) findings.push({ severity: "critical", message: "No routes detected." });
if (duplicateRoutes.length) findings.push({ severity: "high", message: `Duplicate route declarations detected: ${duplicateRoutes.join(", ")}` });
if (unresolvedTargets.length) findings.push({ severity: "high", message: `${unresolvedTargets.length} internal navigation target(s) do not match a declared or layout-special route.` });

console.log(JSON.stringify({
  test: "app-route-coverage",
  evidence: {
    declaredRoutes: uniqueRoutes.length,
    routerRouteOccurrences: routes.length,
    layoutSpecialRoutes: LAYOUT_SPECIAL_ROUTES.length,
    dynamicRoutes: dynamicRoutes.length,
    redirects: redirects.length,
    inspectedNavigationTargets: navigationTargets.length,
    unresolvedNavigationTargets: unresolvedTargets.length,
    unresolvedTargets: unresolvedTargets.map(({ file, target }) => ({ file, target })),
    allowedConditionalDuplicates: [...allowedConditionalDuplicates],
  },
  status: findings.length ? "fail" : "pass",
  findings,
  limitation: "This is static route-contract evidence only. Layout-special routes are intentionally resolved by src/components/Layout/Layout.tsx before the nested Router outlet.",
}, null, 2));

if (findings.length) process.exit(1);