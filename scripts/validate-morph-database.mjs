import { readFile } from "node:fs/promises";

const sourcePath = new URL("../src/data/morphs.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");

// This lightweight CI guard deliberately avoids executing TypeScript at build time.
// It catches the most dangerous accidental database edits while keeping the normal
// Vite build pipeline unchanged.
const geneIds = [...source.matchAll(/geneId\s*:\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1].trim());
const missingGeneIdCount = (source.match(/\b(?:name|kind|inheritance)\s*:/g) ?? []).length - geneIds.length;
const duplicates = [...new Set(geneIds.filter((id, index) => geneIds.indexOf(id) !== index))];

const errors = [];
if (duplicates.length) errors.push(`Duplicate geneId(s): ${duplicates.join(", ")}`);
if (missingGeneIdCount > 0) errors.push(`Potential morph records without geneId detected: ${missingGeneIdCount}`);

if (errors.length) {
  console.error("Morph database validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Morph database validation passed (${geneIds.length} geneId entries checked).`);
