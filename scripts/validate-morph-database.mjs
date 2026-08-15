import { readFile } from "node:fs/promises";

const sourcePath = new URL("../src/data/morphs.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");

// Static guard: keep the stable genetic identity layer safe without executing
// TypeScript during the build. This catches selector/calculator corruption such
// as duplicate IDs, duplicate names, alias collisions and invalid gene metadata.
const records = [...source.matchAll(/\{\s*geneId\s*:\s*["'`]([^"'`]+)["'`][\s\S]*?\n\s*\},/g)].map((match) => match[0]);
const errors = [];
const geneIds = new Map();
const names = new Map();
const aliases = new Map();

const normalise = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");

function value(record, key) {
  const pattern = "\\b" + key + "\\s*:\\s*[\"'`]([^\"'`]*)[\"'`]";
  return record.match(new RegExp(pattern))?.[1]?.trim() ?? "";
}

function booleanValue(record, key) {
  return record.match(new RegExp(`\\b${key}\\s*:\\s*(true|false)`))?.[1] === "true";
}

for (const record of records) {
  const geneId = value(record, "geneId");
  const name = value(record, "name");
  const kind = value(record, "kind");
  const inheritance = value(record, "inheritance");
  const isGene = booleanValue(record, "isGene");

  if (!geneId) {
    errors.push("Morph record is missing geneId.");
    continue;
  }

  if (!name) errors.push(`${geneId} is missing a canonical display name.`);

  const idKey = normalise(geneId);
  if (geneIds.has(idKey)) errors.push(`Duplicate geneId '${geneId}'.`);
  else geneIds.set(idKey, geneId);

  if (name) {
    const nameKey = normalise(name);
    if (names.has(nameKey)) errors.push(`Duplicate canonical morph name '${name}'.`);
    else names.set(nameKey, geneId);
  }

  if (kind === "Gene" && !isGene) errors.push(`${geneId} is kind 'Gene' but isGene is not true.`);
  if (kind !== "Gene" && isGene) errors.push(`${geneId} is marked isGene=true but kind is '${kind || "missing"}'.`);
  if (!inheritance) errors.push(`${geneId} is missing inheritance metadata.`);

  const aliasBlock = record.match(/aliases\s*:\s*\[([\s\S]*?)\]/);
  if (!aliasBlock) continue;

  for (const aliasMatch of aliasBlock[1].matchAll(/["'`]([^"'`]+)["'`]/g)) {
    const alias = aliasMatch[1].trim();
    const aliasKey = normalise(alias);
    if (!aliasKey || aliasKey === idKey || aliasKey === normalise(name)) continue;

    if (aliases.has(aliasKey) && aliases.get(aliasKey) !== geneId) {
      errors.push(`Alias '${alias}' is assigned to multiple morphs.`);
    } else {
      aliases.set(aliasKey, geneId);
    }

    if (names.has(aliasKey) && names.get(aliasKey) !== geneId) {
      errors.push(`Alias '${alias}' for '${geneId}' collides with another canonical morph name.`);
    }
  }
}

if (!records.length) errors.push("No morph records were discovered. Check morphs.ts formatting.");

if (errors.length) {
  console.error(`Morph database validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Morph database validation passed: ${records.length} morph records checked.`);
