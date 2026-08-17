import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const routerPath = path.join(srcRoot, "routes", "AppRouter.tsx");

const router = fs.readFileSync(routerPath, "utf8");
const errors = [];

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const sourceFiles = walk(srcRoot);
const routes = [];
const routePages = new Set();

for (const match of router.matchAll(/<Route\s+path=["']([^"']+)["']\s+element=\{(?:<([A-Za-z][A-Za-z0-9]*)[^>]*>|<Navigate[^>]*to=["']([^"']+)["'])/g)) {
  const [, route, component, redirect] = match;
  routes.push({ route, component, redirect });
  if (component) routePages.add(component);
}

if (!routes.length) errors.push("No application routes were detected in AppRouter.tsx.");

const importedPages = new Set();
for (const match of router.matchAll(/import\s+([A-Za-z][A-Za-z0-9]*)\s+from\s+["']\.\.\/pages\/([^"']+)["']/g)) {
  importedPages.add(match[1]);
}

for (const route of routes) {
  if (route.component && !importedPages.has(route.component) && !["Navigate", "Layout"].includes(route.component)) {
    errors.push(`Route ${route.route} references <${route.component}> but that page is not imported in AppRouter.tsx.`);
  }
}

const routePatterns = routes.map(({ route }) => ({
  route,
  regex: new RegExp(`^${route.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&").replace(/:[^/]+/g, "[^/]+")}$`),
}));

function isKnownPath(value) {
  if (!value.startsWith("/")) return true;
  const clean = value.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  return routePatterns.some(({ regex }) => regex.test(clean));
}

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll(path.sep, "/");

  for (const match of text.matchAll(/\bnavigate\(\s*["'`]([^"'`$]+)["'`]/g)) {
    const target = match[1];
    if (!isKnownPath(target)) errors.push(`${relative}: navigate("${target}") does not match any declared application route.`);
  }

  for (const match of text.matchAll(/\bhref=["']([^"']+)["']/g)) {
    const target = match[1];
    if (target.startsWith("/") && !isKnownPath(target)) errors.push(`${relative}: href="${target}" does not match any declared application route.`);
  }
}

const redirects = routes.filter((route) => route.redirect);
for (const redirect of redirects) {
  if (!isKnownPath(redirect.redirect)) errors.push(`Redirect ${redirect.route} -> ${redirect.redirect} targets an undeclared route.`);
}

if (errors.length) {
  console.error("\nTiny Titans route contract check FAILED:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Tiny Titans route contract check passed: ${routes.length} routes declared and internal navigation targets resolve to declared routes.`);
