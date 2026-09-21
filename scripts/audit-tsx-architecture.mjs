import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXCLUDED = new Set(["node_modules", "dist", ".git", ".firebase"]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) files.push(fullPath);
  }
  return files;
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function classify(file) {
  const p = relative(file);
  if (p.startsWith("retirement/")) return "retirement";
  if (p.startsWith("src/pages/")) return "page";
  if (p.startsWith("src/routes/")) return "route";
  if (p.startsWith("src/context/")) return "context";
  if (p.startsWith("src/intelligence/")) return "intelligence";
  if (p.endsWith("/main.tsx") || p === "src/main.tsx") return "bootstrap";
  if (p.startsWith("src/components/")) return "component";
  return "other";
}

function audit(file) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/).length;
  const category = classify(file);
  const functionDeclarations = [...content.matchAll(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/gm)].length;
  const exportedFunctions = [...content.matchAll(/^export\s+(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/gm)].length;
  const hookCount = [...content.matchAll(/\buse(?:State|Effect|Memo|Callback|Reducer|Ref|LayoutEffect|Id|DeferredValue|Transition|SyncExternalStore)\b/g)].length;
  const hasJsx = /<([A-Za-z][A-Za-z0-9.]*)[\s/>]/.test(content) || /<>/.test(content);
  const importsServices = /(?:from\s+|import\s*\()["'][^"']*\/services\//.test(content);
  const importsFirebase = /(?:from\s+|import\s*\()["'][^"']*firebase/.test(content);
  const importsNavigation = /from\s+["'][^"']*react-router/.test(content);
  const importsData = /(?:from\s+|import\s*\()["'][^"']*\/(?:data|lib|utils)\//.test(content);
  const flags = [];

  if (category === "retirement") flags.push("LEGACY_RETIRED");
  if (hasJsx && importsFirebase) flags.push("UI_DIRECT_FIREBASE");
  if (hasJsx && importsServices && hookCount >= 2 && lines >= 120) flags.push("UI_SERVICE_STATE_MIX");
  if (category === "page" && lines >= 180) flags.push("LARGE_PAGE");
  if (category === "component" && lines >= 150) flags.push("LARGE_COMPONENT");
  if (category !== "retirement" && functionDeclarations >= 7) flags.push("MANY_LOCAL_FUNCTIONS");
  if (exportedFunctions >= 3) flags.push("MULTIPLE_EXPORTED_FUNCTIONS");
  if (category === "context" && importsServices && lines >= 150) flags.push("CONTEXT_SERVICE_MIX");
  if (category === "route" && lines >= 150) flags.push("ROUTE_TOO_LARGE");
  if (importsServices && importsData && lines >= 180) flags.push("MULTI_LAYER_MIX");

  let classification = "coherent";
  if (flags.includes("LEGACY_RETIRED")) classification = "retirement";
  else if (flags.some((x) => ["UI_DIRECT_FIREBASE", "UI_SERVICE_STATE_MIX", "ROUTE_TOO_LARGE", "MULTI_LAYER_MIX"].includes(x))) classification = "needs-review";
  else if (flags.length) classification = "watch";

  return {
    path: relative(file),
    category,
    lines,
    hasJsx,
    functionDeclarations,
    exportedFunctions,
    hookCount,
    importsServices,
    importsFirebase,
    importsNavigation,
    importsData,
    flags,
    classification,
  };
}

const results = walk(path.join(ROOT, "src")).concat(walk(path.join(ROOT, "retirement"))).map(audit).sort((a,b) => b.lines - a.lines || a.path.localeCompare(b.path));
const active = results.filter((item) => item.category !== "retirement");
const flagged = active.filter((item) => item.flags.length > 0);
const needsReview = active.filter((item) => item.classification === "needs-review");

const summary = {
  totalTsx: results.length,
  activeTsx: active.length,
  retirementTsx: results.length - active.length,
  flaggedActive: flagged.length,
  needsReview: needsReview.length,
  activeByCategory: Object.fromEntries(["page","component","route","context","intelligence","bootstrap","other"].map((category) => [category, active.filter((item) => item.category === category).length])),
  topActiveFiles: active.slice(0, 30),
  needsReview: needsReview.slice(0, 80),
};

console.log(JSON.stringify(summary, null, 2));

if (needsReview.length) {
  console.error(`TSX ARCHITECTURE AUDIT: ${needsReview.length} active file(s) need review.`);
  for (const item of needsReview) console.error(` - ${item.path}: ${item.flags.join(", ")}`);
} else {
  console.log("TSX ARCHITECTURE AUDIT: no active mixed-responsibility heuristics flagged.");
}
