#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const FUNCTIONS_ROOT = path.resolve("functions");
const ROOT_FILES = [
  path.resolve("index.html"),
  path.resolve("vite.config.ts"),
  path.resolve("package.json"),
];

const LEGACY_PATTERNS = [
  /Tiny Titans Reptile Companion/gi,
  /TinyTitans Reptile Companion/gi,
  /Hoggy Companion/gi,
  /My Reptiles/gi,
  /My Snakes/gi,
  /Tiny Titans Hoggy Companion/gi,
  /your snake['’]s own history/gi,
  /your snakes/gi,
  /Personal Reptile Companion/gi,
  /TinyTitans Hoggy Companion/gi,
  /professional reptile businesses/gi,
  /reptile marketplace listings/gi,
  /I keep and care for reptiles/gi,
  /Select your species/gi,
  /species-safe context/gi,
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:tsx|ts|css|html|json|js)$/.test(entry.name) ? [full] : [];
  });
}

const files = [...walk(ROOT), ...ROOT_FILES].filter((file, index, all) => all.indexOf(file) === index);
const functionFiles = walk(FUNCTIONS_ROOT).filter((file) => /\.js$/.test(file));
const scannedFiles = [...files, ...functionFiles].filter((file, index, all) => all.indexOf(file) === index);
const findings = [];

for (const file of scannedFiles) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of LEGACY_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        findings.push({
          file: path.relative(process.cwd(), file).replaceAll(path.sep, "/"),
          line: index + 1,
          pattern: pattern.source,
          text: line.trim().slice(0, 240),
        });
      }
    }
  });
}

console.log(JSON.stringify({
  test: "keeper-companion-branding-contract",
  scannedFiles: scannedFiles.length,
  findings: findings.length,
  status: findings.length === 0 ? "PASS" : "FAIL",
  requiredActiveBrand: "Tiny Titans Keeper Companion",
  collectionLabel: "My Animals",
  details: findings.slice(0, 120),
}, null, 2));

if (findings.length > 0) process.exit(1);
