#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const strict = process.argv.includes("--strict");
const excluded = new Set([
  path.resolve("src/components/TinyTitansIcon.tsx"),
  path.resolve("src/types/tinyTitansIcon.ts"),
]);
const iconGlyph = /\p{Extended_Pictographic}/u;
const legacyMetadata = /\bicon\s*:/u;
const legacyUiGlyph =
  /<(?:button|a|Link|span|b|strong|h1|h2|h3|h4|h5|option)[^>]*>[^<]{0,180}[←→↻☰✕✓⚠＋][^<]{0,180}<\/(?:button|a|Link|span|b|strong|h1|h2|h3|h4|h5|option)>/u;
const rawCloseGlyph = /<(?:button|span)[^>]*>\s*×\s*<\/(?:button|span)>/u;
const pictographicUi =
  /<(?:button|a|Link|span|b|strong|h1|h2|h3|h4|h5|option|div)[^>]*>[^<]{0,220}\p{Extended_Pictographic}/u;
const pictographicStatus = /\bset(?:Message|Error|Success|Status)\s*\([^\n]*\p{Extended_Pictographic}/u;
const legacyIconProp = /<TinyTitansIcon\b[^>]*\bname\s*=\s*["'][^"']*\p{Extended_Pictographic}[^"']*["']/u;
const iconTypeSource = fs.readFileSync(path.resolve("src/types/tinyTitansIcon.ts"), "utf8");
const canonicalIconNames = new Set([...iconTypeSource.matchAll(/\|\s*"([^"]+)"/g)].map((match) => match[1]));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

const files = walk(root).filter((file) => !excluded.has(file));
const findings = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const hasIconGlyph = iconGlyph.test(line);
    const isTsx = file.endsWith(".tsx");
    const metadata = hasIconGlyph && legacyMetadata.test(line);
    const rawPictographicUi = isTsx && hasIconGlyph && (pictographicUi.test(line) || pictographicStatus.test(line));
    const rawControlGlyph = isTsx && (legacyUiGlyph.test(line) || rawCloseGlyph.test(line));
    const legacyComponentAlias = isTsx && legacyIconProp.test(line);
    const literalIconNames = isTsx
      ? [...line.matchAll(/<TinyTitansIcon\b[^>]*\bname\s*=\s*"([^"]+)"/g)].map((match) => match[1])
      : [];
    const invalidLiteralIcon = literalIconNames.find((name) => !canonicalIconNames.has(name));
    if (!metadata && !rawPictographicUi && !rawControlGlyph && !legacyComponentAlias && !invalidLiteralIcon) return;
    findings.push({
      file: path.relative(process.cwd(), file).replaceAll(path.sep, "/"),
      line: index + 1,
      kind: metadata
        ? "legacy-icon-metadata"
        : legacyComponentAlias
          ? "legacy-icon-component-alias"
          : invalidLiteralIcon
            ? "invalid-icon-name"
            : rawPictographicUi
              ? "raw-pictographic-ui"
              : "raw-ui-glyph",
      text: line.trim().slice(0, 220),
    });
  });
}

const byKind = findings.reduce((acc, finding) => {
  acc[finding.kind] = (acc[finding.kind] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  test: "iconography-boundary",
  strict,
  scannedFiles: files.length,
  findings: findings.length,
  byKind,
  status: findings.length === 0 ? "PASS" : "WARN",
  details: findings.slice(0, 120),
}, null, 2));

if (strict && findings.length > 0) process.exit(1);
