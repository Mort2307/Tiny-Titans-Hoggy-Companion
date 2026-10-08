#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const baselinePath = path.resolve("scripts/iconography-baseline.json");
const strict = process.argv.includes("--strict");
const writeBaseline = process.argv.includes("--write-baseline");
const excluded = new Set([
  path.resolve("src/components/TinyTitansIcon.tsx"),
  path.resolve("src/types/tinyTitansIcon.ts"),
  // Reserved 3D Room source is intentionally retained in-repo but is not part of the live product.
  // Keep it outside the production iconography boundary until the feature is re-enabled for QA.
  path.resolve("src/pages/ReptileRoom3D.tsx"),
  path.resolve("src/pages/ReptileRoomFirstPerson3D.tsx"),
  path.resolve("src/pages/StableReptileRoomBuilder.tsx"),
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
const hardKinds = new Set(["invalid-icon-name", "legacy-icon-component-alias"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

function fingerprint(finding) {
  return `${finding.file}|${finding.kind}|${finding.text}`;
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) return new Set();
  const parsed = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const fingerprints = Array.isArray(parsed) ? parsed : parsed.fingerprints;
  if (!Array.isArray(fingerprints)) throw new Error("Iconography baseline is malformed.");
  return new Set(fingerprints);
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
    const intentionalGeneticsCross =
      file.endsWith(path.join("components", "morph-reversal", "MorphReversalResults.tsx")) &&
      /className=["']morph-reversal-route-x["'][^>]*>\s*×\s*</u.test(line);
    const rawControlGlyph =
      isTsx && (legacyUiGlyph.test(line) || (rawCloseGlyph.test(line) && !intentionalGeneticsCross));
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
      invalidIconName: invalidLiteralIcon ?? null,
    });
  });
}

const byKind = findings.reduce((acc, finding) => {
  acc[finding.kind] = (acc[finding.kind] ?? 0) + 1;
  return acc;
}, {});

const hardFindings = findings.filter((finding) => hardKinds.has(finding.kind));

if (writeBaseline) {
  const fingerprints = findings
    .filter((finding) => !hardKinds.has(finding.kind))
    .map(fingerprint)
    .sort();
  const baselineByKind = findings
    .filter((finding) => !hardKinds.has(finding.kind))
    .reduce((acc, finding) => {
      acc[finding.kind] = (acc[finding.kind] ?? 0) + 1;
      return acc;
    }, {});
  fs.writeFileSync(
    baselinePath,
    JSON.stringify({
      version: 1,
      purpose: "Known legacy iconography debt. Strict validation fails on any new fingerprint.",
      findings: fingerprints.length,
      byKind: baselineByKind,
      fingerprints,
    }, null, 2) + "\n",
  );
}

const baseline = readBaseline();
const newFindings = findings.filter((finding) => !baseline.has(fingerprint(finding)));
const resolvedBaselineCount = [...baseline].filter(
  (known) => !findings.some((finding) => fingerprint(finding) === known),
).length;

const orderedDetails = [
  ...hardFindings,
  ...newFindings.filter((finding) => !hardKinds.has(finding.kind)),
  ...findings.filter((finding) => baseline.has(fingerprint(finding))),
];

const hasStrictFailure = hardFindings.length > 0 || newFindings.length > 0;
const status = hasStrictFailure
  ? "FAIL"
  : findings.length > 0
    ? "PASS_WITH_BASELINE"
    : "PASS";

console.log(JSON.stringify({
  test: "iconography-boundary",
  strict,
  writeBaseline,
  scannedFiles: files.length,
  findings: findings.length,
  byKind,
  baselineFindings: baseline.size,
  newFindings: newFindings.length,
  hardFindings: hardFindings.length,
  resolvedBaselineCount,
  status,
  details: orderedDetails.slice(0, 120),
}, null, 2));

if (hardFindings.length > 0) process.exit(1);
if (strict && newFindings.length > 0) process.exit(1);
