import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src", "data", "quickNavigation.ts"), "utf8");
const errors = [];

const required = [
  "/", "/snakes", "/reptile-room", "/reminders", "/husbandry", "/weights", "/feeding", "/shedding", "/health", "/behaviour",
  "/enclosure-intelligence", "/morph-library", "/calculator", "/breeding", "/breeding/academy", "/breeding/readiness", "/breeding/timeline",
  "/breeding/cycle", "/breeding/production", "/titan-intelligence", "/keeper-handbook", "/behaviour-observatory", "/knowledge-base",
  "/learn", "/adaptive-learning", "/challenge", "/learn/achievements", "/community", "/community/features", "/community/mentorship",
  "/community/vivarium-showcase", "/community/wall-of-titans", "/make-contribution", "/report-bug", "/feedback", "/account",
  "/account/personalise", "/account/family", "/account/security", "/account/data-privacy", "/account/intelligence", "/become-a-titan",
  "/founder", "/sandbox",
];

for (const route of required) {
  if (!source.includes(`path: "${route}"`)) errors.push(`Missing Quick Mode destination: ${route}`);
}

const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
if (new Set(ids).size !== ids.length) errors.push("Quick Mode feature registry contains duplicate IDs.");
if (ids.length < required.length) errors.push(`Quick Mode registry contains ${ids.length} items but requires at least ${required.length}.`);

if (errors.length) {
  console.error("Tiny Titans Quick Navigation validation FAILED:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Quick Navigation validation passed: ${ids.length} full-app destinations registered.`);
