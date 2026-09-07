import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const updates = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "communityUpdates.json"), "utf8"));

const errors = [];
const ids = new Set();
const versions = new Set();

if (!Array.isArray(updates) || updates.length === 0) {
  errors.push("Community update registry must contain at least one published update.");
}

for (const [index, update] of (Array.isArray(updates) ? updates : []).entries()) {
  const prefix = `Update #${index + 1}`;
  for (const field of ["id", "version", "releasedAt", "title", "summary", "icon"]) {
    if (typeof update?.[field] !== "string" || !update[field].trim()) errors.push(`${prefix}: missing ${field}.`);
  }
  if (typeof update?.releasedAt === "string" && Number.isNaN(Date.parse(`${update.releasedAt}T00:00:00`))) errors.push(`${prefix}: releasedAt is not a valid date.`);
  if (typeof update?.id === "string") {
    if (ids.has(update.id)) errors.push(`${prefix}: duplicate id ${update.id}.`);
    ids.add(update.id);
  }
  if (typeof update?.version === "string") {
    if (versions.has(update.version)) errors.push(`${prefix}: duplicate release version ${update.version}.`);
    versions.add(update.version);
  }
  if (!Array.isArray(update?.details) || update.details.length === 0 || update.details.some((item) => typeof item !== "string" || !item.trim())) errors.push(`${prefix}: details must contain at least one non-empty item.`);
  if (!Array.isArray(update?.whereToFind) || update.whereToFind.length === 0) errors.push(`${prefix}: whereToFind must contain at least one destination.`);
  for (const [destinationIndex, destination] of (Array.isArray(update?.whereToFind) ? update.whereToFind : []).entries()) {
    if (typeof destination?.label !== "string" || !destination.label.trim()) errors.push(`${prefix}: destination #${destinationIndex + 1} is missing label.`);
    if (typeof destination?.path !== "string" || !destination.path.startsWith("/")) errors.push(`${prefix}: destination #${destinationIndex + 1} needs an in-app path beginning with /.`);
    if (typeof destination?.hint !== "string" || !destination.hint.trim()) errors.push(`${prefix}: destination #${destinationIndex + 1} is missing hint text.`);
  }
}

const latest = [...(Array.isArray(updates) ? updates : [])].sort((a, b) => String(b.releasedAt).localeCompare(String(a.releasedAt)))[0];
if (latest && String(latest.version) !== String(packageJson.version)) {
  errors.push(`Latest published Community update is version ${latest.version}, but package.json is ${packageJson.version}. Bump the update entry for each shipped release.`);
}

if (errors.length) {
  console.error("Tiny Titans Community update validation FAILED:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Community update validation passed: ${updates.length} published update${updates.length === 1 ? "" : "s"}; latest version ${latest?.version ?? packageJson.version}.`);
