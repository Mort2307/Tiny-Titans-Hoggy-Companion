import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const routerPath = path.join(srcRoot, "routes", "AppRouter.tsx");
const router = fs.readFileSync(routerPath, "utf8");
const errors = [];

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
];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const sourceFiles = walk(srcRoot);
const routes = [];

for (const match of router.matchAll(/<Route\s+path=["']([^"']+)["']\s+element=\{(?:<([A-Za-z][A-Za-z0-9]*)[^>]*>|<Navigate[^>]*to=["']([^"']+)["'])/g)) {
  const [, route, component, redirect] = match;
  routes.push({ route, component, redirect });
}

if (!routes.length) errors.push("No application routes were detected in AppRouter.tsx.");

const importedComponents = new Set();

// Default imports: import Component from "../pages/Component";
for (const match of router.matchAll(/\bimport\s+([A-Za-z][A-Za-z0-9]*)\s+from\s+["']\.\.(?:\/pages|\/components)\/[^"']+["']/g)) {
  importedComponents.add(match[1]);
}

// Named imports: import { Foo, Bar as Baz } from "../pages/Module";
// Keep this deliberately syntax-tolerant: AppRouter has grown large and import
// formatting should not change whether a route is considered locally imported.
for (const match of router.matchAll(/\bimport\s*\{([\s\S]*?)\}\s*from\s*["']\.\.(?:\/pages|\/components)\/[^"']+["']/g)) {
  const specifiers = match[1]
    .split(",")
    .map((specifier) => specifier.replace(/\/\*[\s\S]*?\*\//g, "").trim())
    .filter(Boolean);

  for (const specifier of specifiers) {
    const withoutType = specifier.replace(/^type\s+/, "");
    const localName = withoutType.includes(" as ")
      ? withoutType.split(/\s+as\s+/i).pop()?.trim()
      : withoutType.trim();
    if (localName && /^[A-Za-z][A-Za-z0-9]*$/.test(localName)) importedComponents.add(localName);
  }
}

for (const route of routes) {
  if (route.component && !importedComponents.has(route.component) && route.component !== "Navigate") errors.push(`Route ${route.route} references <${route.component}> but that component is not imported locally in AppRouter.tsx.`);
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function routeToRegex(route) {
  const tokens = route.split(/(:[^/]+|\*)/g);
  const pattern = tokens.map((token) => token === "*" ? ".*" : /^:[^/]+$/.test(token) ? "[^/]+" : escapeRegex(token)).join("");
  return new RegExp(`^${pattern}$`);
}
const routePatterns = routes.filter(({ route }) => route !== "*").map(({ route }) => ({ route, regex: routeToRegex(route) }));
const allKnownRoutes = [...new Set([...routes.map(({ route }) => route), ...LAYOUT_SPECIAL_ROUTES])];
const allKnownPatterns = [...routePatterns, ...LAYOUT_SPECIAL_ROUTES.map((route) => ({ route, regex: routeToRegex(route) }))];

function normaliseDynamicPath(value) { return value.replace(/\$\{[^}]+\}/g, ":dynamic"); }
function isKnownPath(value) {
  if (!value.startsWith("/")) return true;
  const clean = normaliseDynamicPath(value).split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  return allKnownPatterns.some(({ regex }) => regex.test(clean));
}

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  for (const match of text.matchAll(/\bnavigate\(\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g)) {
    const target = match[1] ?? match[2] ?? match[3];
    if (target && !isKnownPath(target)) errors.push(`${relative}: navigate("${target}") does not match any declared application route.`);
  }
  for (const match of text.matchAll(/\bhref=["']([^"']+)["']/g)) {
    const target = match[1];
    if (target.startsWith("/") && !isKnownPath(target)) errors.push(`${relative}: href="${target}" does not match any declared application route.`);
  }
}
for (const redirect of routes.filter((route) => route.redirect)) if (!isKnownPath(redirect.redirect)) errors.push(`Redirect ${redirect.route} -> ${redirect.redirect} targets an undeclared route.`);

if (errors.length) {
  console.error("\nTiny Titans route contract check FAILED:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Tiny Titans route contract check passed: ${allKnownRoutes.length} declared or layout-special routes and internal navigation targets resolve.`);
