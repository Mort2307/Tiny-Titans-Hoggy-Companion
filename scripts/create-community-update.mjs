import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "src", "data", "communityUpdates.json");
const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? String(args[index + 1] ?? fallback).trim() : fallback;
}

function readRepeatedArg(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === `--${name}` && args[index + 1]) values.push(String(args[index + 1]).trim());
  }
  return values;
}

function fail(message) {
  console.error(`Community update generator: ${message}`);
  process.exit(1);
}

const version = readArg("version");
const title = readArg("title");
const summary = readArg("summary");
const icon = readArg("icon", "📢");
const kind = readArg("kind", "improvement");
const releasedAt = readArg("date", new Date().toISOString().slice(0, 10));
const details = readRepeatedArg("detail");
const whereToFind = readRepeatedArg("where").map((value) => {
  const [label, route, hint = label] = value.split("|");
  return { label: label?.trim(), path: route?.trim(), hint: hint?.trim() };
});

if (!version) fail("--version is required.");
if (!title) fail("--title is required.");
if (!summary) fail("--summary is required.");
if (details.length === 0) fail("Provide at least one --detail. Repeat --detail for more changes.");
if (whereToFind.length === 0 || whereToFind.some((item) => !item.label || !item.path?.startsWith("/") || !item.hint)) {
  fail("Provide at least one --where in the form \"Label|/route|Where users find it\".");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(releasedAt) || Number.isNaN(Date.parse(`${releasedAt}T00:00:00`))) fail("--date must be YYYY-MM-DD.");

let updates;
try {
  updates = JSON.parse(fs.readFileSync(registryPath, "utf8"));
} catch (error) {
  fail(`Unable to read ${registryPath}: ${error instanceof Error ? error.message : String(error)}`);
}
if (!Array.isArray(updates)) fail("Community update registry is not a JSON array.");

if (updates.some((update) => update?.version === version)) fail(`Version ${version} already exists in the registry.`);

const id = `${releasedAt}-${version.replace(/[^a-zA-Z0-9]+/g, "-")}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const introByKind = {
  feature: "Tiny Titans introduces",
  improvement: "Tiny Titans has improved",
  bugfix: "Tiny Titans has fixed",
  genetics: "Tiny Titans has updated the genetics tools for",
  husbandry: "Tiny Titans has updated husbandry tools for",
  community: "Tiny Titans has updated the Community experience with",
  security: "Tiny Titans has strengthened security around",
  performance: "Tiny Titans has improved performance for",
};
const intro = introByKind[kind] ?? introByKind.improvement;
const messageTitle = title.replace(/^Tiny Titans\s+/i, "").replace(/\.$/, "");
const autoMessage = `${intro} ${messageTitle}.${whereToFind[0] ? ` Find it here: ${whereToFind[0].hint}.` : ""}`;

updates.push({ id, version, releasedAt, kind, icon, title, summary, autoMessage, details, whereToFind });
updates.sort((a, b) => String(b.releasedAt).localeCompare(String(a.releasedAt)));
fs.writeFileSync(registryPath, `${JSON.stringify(updates, null, 2)}\n`, "utf8");

console.log(`Created Community update ${id}.`);
console.log(autoMessage);
console.log(`Run: npm run validate:community-updates`);
