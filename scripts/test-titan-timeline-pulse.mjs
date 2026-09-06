import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/intelligence/v50/titanTimelinePulse.ts"), "utf8");

const required = [
  "buildTitanTimelinePulse",
  "<= 30 * 86_400_000",
  "timestamp(event.date)",
  "event.type",
  "Long gap between records",
  "waiting for more temporal evidence",
];

for (const token of required) {
  if (!source.includes(token)) throw new Error(`Timeline pulse contract missing: ${token}`);
}

const forbidden = [
  "Date.parse(String(event.date))",
  "Date.parse(String(latest.date))",
];

for (const token of forbidden) {
  if (source.includes(token)) throw new Error(`Timeline pulse still contains string timestamp parsing: ${token}`);
}

console.log("Titan timeline pulse contract: PASS");
