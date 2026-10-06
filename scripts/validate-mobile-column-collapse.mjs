import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const findings = [];
const cssAdvisories = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  }));
  return nested.flat();
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function fixedPixelMinimums(value) {
  const minimums = [];

  for (const match of value.matchAll(/minmax\(\s*(\d+(?:\.\d+)?)px\s*,/gi)) {
    minimums.push(Number(match[1]));
  }

  const withoutMinmax = value.replace(/minmax\([^)]*\)/gi, " ");
  for (const match of withoutMinmax.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)px(?=\s|$)/gi)) {
    minimums.push(Number(match[1]));
  }

  return minimums.filter(Number.isFinite);
}

function isRiskyGridTemplate(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (/repeat\(\s*auto-(?:fit|fill)\s*,/i.test(normalized)) return false;

  const hasFlexibleTrack =
    /minmax\(\s*0(?:px)?\s*,/i.test(normalized) ||
    /(?:^|\s)\d*\.?\d+fr(?=\s|$|\))/i.test(normalized);

  const fixedMinimums = fixedPixelMinimums(normalized);
  return hasFlexibleTrack && fixedMinimums.some((pixels) => pixels >= 220);
}

function excerpt(source, index) {
  const start = Math.max(0, source.lastIndexOf("\n", index) + 1);
  const endIndex = source.indexOf("\n", index);
  const end = endIndex === -1 ? source.length : endIndex;
  return source.slice(start, end).trim().slice(0, 320);
}

const files = await walk(sourceRoot);

for (const file of files) {
  const ext = path.extname(file);
  const relative = path.relative(root, file).replaceAll(path.sep, "/");

  if (sourceExtensions.has(ext)) {
    const source = await fs.readFile(file, "utf8");
    const literalPattern = /gridTemplateColumns\s*:\s*(["'`])([\s\S]*?)\1/g;
    for (const match of source.matchAll(literalPattern)) {
      const template = match[2];
      if (!isRiskyGridTemplate(template)) continue;
      findings.push({
        file: relative,
        line: lineNumberAt(source, match.index ?? 0),
        template: template.replace(/\s+/g, " ").trim(),
        excerpt: excerpt(source, match.index ?? 0),
      });
    }
  }

  if (ext === ".css") {
    const source = await fs.readFile(file, "utf8");
    const declarationPattern = /grid-template-columns\s*:\s*([^;}{]+)/gi;
    for (const match of source.matchAll(declarationPattern)) {
      const template = match[1].replace(/\s+/g, " ").trim();
      if (!isRiskyGridTemplate(template)) continue;
      cssAdvisories.push({
        file: relative,
        line: lineNumberAt(source, match.index ?? 0),
        template,
      });
    }
  }
}

if (cssAdvisories.length) {
  console.log(
    `Mobile column-collapse audit: reviewed ${cssAdvisories.length} fixed-minimum CSS grid declaration${cssAdvisories.length === 1 ? "" : "s"}; route-local media rules remain responsible for their phone stacking.\n`,
  );
}

if (findings.length) {
  console.error("Tiny Titans mobile column-collapse audit FAILED.\n");
  console.error(
    "Inline grid templates that combine a flexible track with a fixed >=220px track can crush sibling text into a one-character-wide column on phones. Move the layout to a class with a phone breakpoint.\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line}`);
    console.error(`  gridTemplateColumns: ${finding.template}`);
    console.error(`  ${finding.excerpt}\n`);
  }
  process.exit(1);
}

console.log("Tiny Titans mobile column-collapse audit passed: no dangerous fixed-minimum inline grids found across src/.");
