import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = join(process.cwd(), "src");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json"]);
const suspicious = [
  /ðŸ/g,
  /â[\x80-\xBF]/g,
  /Ã[\x80-\xBF]/g,
  /Â[\x80-\xBF]/g,
  /ï¸/g,
  /�/g,
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (extensions.has(path.slice(path.lastIndexOf(".")))) files.push(path);
  }
  return files;
}

const failures = [];
for (const file of await walk(root)) {
  const content = await readFile(file, "utf8");
  const matches = suspicious.filter((pattern) => pattern.test(content));
  suspicious.forEach((pattern) => pattern.lastIndex = 0);
  if (matches.length) failures.push(relative(process.cwd(), file));
}

if (failures.length) {
  console.error("\nTiny Titans mojibake check FAILED:\n");
  failures.forEach((file) => console.error(`- ${file}`));
  console.error("\nFix the source encoding before building production.\n");
  process.exit(1);
}

console.log("Tiny Titans mojibake check passed: no known encoding corruption found in src.");
