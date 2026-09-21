#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["src"];
const EXTENSIONS = new Set([".tsx", ".ts"]);
const IGNORE = new Set(["node_modules", "dist", ".git", "retirement"]);

const iconGlyphPattern = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const explicitLegacy = new Set([
  "🏠","⌂","🐍","💬","📨","📥","🔔","🌡️","⚖️","📊","🍽️","🥄","❤️","◉","👁️",
  "🔭","🔎","⌘","🏡","🧬","∑","🥚","📦","▣","🎓","📋","📖","📚","▤","◆","✓",
  "🏆","★","🌍","👥","◌","◈","↔","🤝","🛒","⚙️","👤","📝","＋","✦","✨","🧠",
  "🔐","🛡️","🌱","🧪","🛠️","⚒","🖼️","◇","●","✏️","✏","🗑","🗑️","💧","📅",
  "🩺","💾","⬆","←","→","×","✕","🔗","🔒","🔓","➕","➖","🔬","🧮","🐛","🧰",
  "👋","🦎","👀","⏰","📐","🧲","🔄","↶","↷","⬇","⬆"
]);

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else if (EXTENSIONS.has(path.extname(entry.name))) results.push(full);
  }
  return results;
}

const files = ROOTS.flatMap((root) => walk(path.resolve(root))).sort();
const findings = [];

for (const file of files) {
  if (file.endsWith(path.join("components", "TinyTitansIcon.tsx"))) continue;
  const text = fs.readFileSync(file, "utf8");
  const glyphs = new Set(
    [...text.matchAll(iconGlyphPattern)]
      .map((match) => match[0])
      .filter((glyph) => explicitLegacy.has(glyph)),
  );
  if (glyphs.size) {
    findings.push({
      file: path.relative(process.cwd(), file).replaceAll(path.sep, "/"),
      glyphs: [...glyphs],
    });
  }
}

console.log(JSON.stringify({
  test: "canonical-icon-system-audit",
  status: findings.length ? "warning" : "pass",
  filesScanned: files.length,
  filesWithLegacyGlyphs: findings.length,
  findings,
}, null, 2));
