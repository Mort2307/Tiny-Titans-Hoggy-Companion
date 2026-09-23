import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const EXCLUDED = new Set(["node_modules", "dist", ".firebase"]);
const LEGACY_EMOJI_RE = /\p{Extended_Pictographic}/u;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name) || entry.name === "retirement") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function lineEntries(content) {
  return content.split(/\r?\n/).map((value, index) => ({ line: index + 1, value }));
}

function iconNames() {
  const source = fs.readFileSync(
    path.join(ROOT, "types", "tinyTitansIcon.ts"),
    "utf8",
  );
  return new Set(
    [...source.matchAll(/\|\s*"([^"]+)"/g)].map((match) => match[1]),
  );
}

const names = iconNames();
const errors = [];
const warnings = [];

for (const file of walk(ROOT)) {
  const relative = path.relative(process.cwd(), file).replaceAll("\\", "/");
  const content = fs.readFileSync(file, "utf8");

  for (const { line, value } of lineEntries(content)) {
    const iconProps = [...value.matchAll(/TinyTitansIcon\s+[^>]*\bname=["']([^"']+)["']/g)];
    for (const match of iconProps) {
      if (!names.has(match[1])) {
        errors.push({ file: relative, line, kind: "unknown-icon-name", value: match[1] });
      }
    }

    const iconFields = [...value.matchAll(/\bicon\s*:\s*["']([^"']+)["']/g)];
    for (const match of iconFields) {
      if (!names.has(match[1])) {
        errors.push({ file: relative, line, kind: "non-canonical-icon-field", value: match[1] });
      }
      if (LEGACY_EMOJI_RE.test(match[1])) {
        errors.push({ file: relative, line, kind: "emoji-icon-field", value: match[1] });
      }
    }

    if (LEGACY_EMOJI_RE.test(value)) {
      const iconContext =
        /aria-hidden=["']true["']/.test(value) ||
        /className=["'][^"']*(icon|avatar|badge|logo|kicker)[^"']*["']/.test(value) ||
        /<button\b/.test(value) ||
        /<summary\b/.test(value);
      if (iconContext) {
        warnings.push({ file: relative, line, kind: "emoji-in-icon-context", value: value.trim().slice(0, 180) });
      }
    }
  }
}

console.log(JSON.stringify({
  test: "iconography-contract",
  status: errors.length ? "fail" : warnings.length ? "warning" : "pass",
  canonicalIconCount: names.size,
  errors,
  warnings,
  totals: { errors: errors.length, warnings: warnings.length },
}, null, 2));

process.exit(errors.length ? 1 : 0);
