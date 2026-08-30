import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const scanRoots = [path.join(rootDir, "src"), path.join(rootDir, "functions")];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ignoredDirs = new Set(["node_modules", "dist", ".git"]);

const issues = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) continue;
    inspectFile(fullPath);
  }
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function addIssue(file, index, kind, value) {
  issues.push({
    file: path.relative(rootDir, file).replaceAll(path.sep, "/"),
    line: lineNumber(fs.readFileSync(file, "utf8"), index),
    kind,
    value: value.trim().slice(0, 180),
  });
}

function inspectFile(file) {
  const source = fs.readFileSync(file, "utf8");

  // Deterministic spacing problems that can be caught without understanding
  // the surrounding React/JavaScript expression.
  for (const match of source.matchAll(/([.!?…])([A-Za-z])/g)) {
    const index = match.index ?? 0;
    const surrounding = source.slice(Math.max(0, index - 90), Math.min(source.length, index + 90));
    if (/https?:\/\//.test(surrounding)) continue;
    addIssue(file, index, "punctuation-without-space", match[0]);
  }

  // Sentence-like source strings that do not have terminal punctuation.
  // This is intentionally advisory: headings, labels and intentionally
  // fragmentary copy are valid and should be reviewed by a human.
  for (const match of source.matchAll(/(["'`])([^"'`\n]{48,})\1/g)) {
    const text = match[2].trim();
    if (text.includes("${") || /=>|==|https?:\/\//.test(text)) continue;
    if (!/[A-Za-z]$/.test(text)) continue;
    if (/[.!?…][\"'»”’)]?$/.test(text)) continue;

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 8) continue;
    if (!/\b(?:the|and|or|but|to|of|for|with|your|you|is|are|can|will|has|have|from|into|this|that|when|where|keep|record|use)\b/i.test(text)) continue;

    addIssue(file, match.index ?? 0, "possible-missing-terminal-punctuation", text);
  }
}

for (const root of scanRoots) walk(root);

console.log(`UI copy audit: ${issues.length} advisory issue${issues.length === 1 ? "" : "s"} found.`);

for (const issue of issues.slice(0, 200)) {
  console.log(`- ${issue.file}:${issue.line} [${issue.kind}] ${issue.value}`);
}

if (issues.length > 200) {
  console.log(`- … ${issues.length - 200} additional issue(s) omitted from console output.`);
}

console.log("Review findings before release; this audit is advisory and never changes application data.");
