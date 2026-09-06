import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changed = [];

function patch(file, transform, label) {
  const full = path.join(root, file);
  const source = fs.readFileSync(full, "utf8");
  const next = transform(source);
  if (next !== source) {
    fs.writeFileSync(full, next, "utf8");
    changed.push(`${file} — ${label}`);
  }
}

patch("src/components/TitanIntelligence/TitanLiveIntelligencePanel.tsx", (source) => source.replace(
  /function observationList\(value: unknown, fallbackLabel: string\) \{ return records\(value\)\.map\(\(record\) => \(\{ date: recordDate\(record\), category: typeof record\.category === "string" \? record\.category : undefined, label: typeof record\.label === "string" \? record\.label : fallbackLabel, detail: typeof record\.detail === "string" \? record\.detail : undefined \}\)\)\.filter\(\(item\): item is \{ date: string \| number; category\?: string; label: string; detail\?: string \} => item\.date != null\); \}/,
  'function observationList(value: unknown, fallbackLabel: string) { return records(value).map((record) => ({ date: recordDate(record), category: typeof record.category === "string" ? record.category : undefined, label: typeof record.label === "string" ? record.label : fallbackLabel, detail: typeof record.detail === "string" ? record.detail : undefined })).filter((item): item is { date: string | number | undefined; category: string | undefined; label: string; detail: string | undefined } => item.date != null); }'
));

patch("src/data/species/speciesGeneticsCombinations.ts", (source) => source
  .replace('type ComboTuple = [string, string, CombinationComponent[], string, string, string];\ntype ComboTuple = [string, string, CombinationComponent[], string, string, string];', 'type ComboTuple = [string, string, CombinationComponent[], string, string, string];')
  .replace('const cornSnake: ComboTuple[] = [', 'const cornSnake = ([', 1)
  .replace('const boaCombos: ComboTuple[] = [', 'const boaCombos = ([', 1)
  .replace(/(\n\]\)\.map\(\(\[id, name, components, alias, source, note\]\) => \(\{ id, name, species: "Pantherophis guttatus", components, aliases: alias \? \[alias\] : undefined, sourcePath: `corn-snakes\/\$\{source\}\/`, note \}\)\);)/, '\n] as ComboTuple[]).map(([id, name, components, alias, source, note]) => ({ id, name, species: "Pantherophis guttatus", components, aliases: alias ? [alias] : undefined, sourcePath: `corn-snakes/${source}/`, note }));')
  .replace(/(\n\]\)\.map\(\(\[id, name, components, alias, source, note\]\) => \(\{ id: `boa-constrictor-\$\{id\}`, name, species: "Boa constrictor", components, aliases: alias \? \[alias\] : undefined, sourcePath: `boa-constrictors\/\$\{source\}\/`, note \}\)\);)/, '\n] as ComboTuple[]).map(([id, name, components, alias, source, note]) => ({ id: `boa-constrictor-${id}`, name, species: "Boa constrictor", components, aliases: alias ? [alias] : undefined, sourcePath: `boa-constrictors/${source}/`, note }));')
);

patch("src/genetics/geneticsForecast.ts", (source) => source
  .replace(/const hetEntry = parent\.hets\.find\(\(entry\) => \{[\s\S]*?if \(hetEntry\) \{[\s\S]*?const p = hetProbability\(hetEntry\.percentage\);/, `const hetEntry = parent.hets.find((entry) => {\n    const geneId = typeof entry === "string" ? entry : entry.gene;\n    const allele = findAllele(locus, geneId);\n    return Boolean(allele && !allele.isWildType);\n  });\n  if (hetEntry) {\n    const geneId = typeof hetEntry === "string" ? hetEntry : hetEntry.gene;\n    const allele = findAllele(locus, geneId)!;\n    const hetPercentage: HetPercentage = typeof hetEntry === "string" ? (parent.hetPercentages?.[hetEntry] ?? "100%") : hetEntry.percentage;\n    const p = hetProbability(hetPercentage);`)
  .replace(/\$\{hetPercentage\} Het/g, '${hetPercentage} Het')
  .replace(/findAllele\(locus, het\.gene\)/g, 'findAllele(locus, het)')
  .replace(/findAllele\(locus, het\.gene\)\?\.isWildType/g, 'findAllele(locus, het)?.isWildType')
  .replace(/\bhet\.gene\b/g, 'het')
);

patch("src/intelligence/v50/animalMasterRecordEngine.ts", (source) => source.replace(
  'domain: domainForType(event.type),',
  'domain: domainForType(event.type) as TitanDomainEvent["domain"],'
));

patch("src/intelligence/v50/husbandryIntelligenceEngine.ts", (source) => source
  .replace(/recent\[index - 1\]!\.temperatureC/g, 'recent[index - 1]?.temperatureC')
  .replace(/recent\[index - 1\]!\.humidityPercent/g, 'recent[index - 1]?.humidityPercent')
);

patch("src/pages/CreatorSubmissions.tsx", (source) => source.replace(
  /submitterUid=\{selected\.userId\}/g,
  'submitterUid={selected.userId ?? ""}'
));

patch("src/pages/SnakeTitanIntelligencePage.tsx", (source) => {
  const marker = '  const key = user && snakeId ? `${user.uid}:${snakeId}` : null;';
  if (!source.includes(marker)) return source;
  return source
    .replace('const allowed = await hasFullIntelligenceAccess(authenticatedUser.uid).catch(() => false);', 'const allowed = await hasFullIntelligenceAccess(user.uid).catch(() => false);')
    .replace('const result = await getSnakeMasterRecord(authenticatedUser.uid, selectedSnakeId);', 'const result = await getSnakeMasterRecord(user.uid, snakeId);');
});

patch("src/services/healthService.ts", (source) => source.replace(
  'emitTitanIntelligenceEvent({ uid, animalId: record.snakeId, type: "HealthRecordCreated", action: operation });',
  'emitTitanIntelligenceEvent({ uid, animalId: record.snakeId, type: "HealthRecordCreated", action: operation === "create" ? "created" : "updated" });'
));

patch("src/utils/breedingGenetics.ts", (source) => source
  .replace(/offspring\.percentage \/ 100/g, '(offspring.percentage ?? offspring.probabilityRange?.max ?? 0) / 100')
  .replace(/existing\.percentage \+= result\.percentage \?\? result\.probabilityRange\?\.max \?\? 0/g, 'existing.percentage += result.percentage ?? result.probabilityRange?.max ?? 0')
  .replace(/item\.percentage \/ 100/g, '(item.percentage ?? item.probabilityRange?.max ?? 0) / 100')
);

patch("src/utils/geneticsCalculator.ts", (source) => source
  .replace(/existing\.percentage \+=\(result\.percentage \?\? 0\)/g, 'existing.percentage += (result.percentage ?? 0)')
  .replace(/else existing\.percentage \+= offspring\.percentage/g, 'else existing.percentage += offspring.percentage ?? 0')
);

console.log(changed.length ? changed.map((item) => `OK  ${item}`).join("\n") : "No second-pass edits were necessary.");
console.log(`\nSecond-pass TypeScript repair touched ${changed.length} file(s).`);
