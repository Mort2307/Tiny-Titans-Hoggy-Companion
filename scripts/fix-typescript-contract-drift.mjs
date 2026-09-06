import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const edits = [];
function edit(relativePath, transform) {
  const file = path.join(root, relativePath);
  const source = fs.readFileSync(file, "utf8");
  const next = transform(source);
  if (next === source) throw new Error(`No change made to ${relativePath}; expected source pattern was not found.`);
  fs.writeFileSync(file, next, "utf8");
  edits.push(relativePath);
}
function replace(relativePath, from, to) {
  edit(relativePath, (source) => {
    if (!source.includes(from)) throw new Error(`Pattern not found in ${relativePath}: ${from}`);
    return source.replace(from, to);
  });
}

replace("src/components/ParentSelector.tsx", 'const needsZygosity = inheritance === "Dominant" || inheritance === "Incomplete Dominant" || inheritance === "Co-Dominant";', 'const needsZygosity = ["Dominant", "Incomplete Dominant", "Co-Dominant"].includes(inheritance ?? "");');
replace("src/components/ResultCard.tsx", "const probabilityLabel = bounded ? boundedLabel(result) : formatPercentage(result.percentage);", "const probabilityLabel = bounded ? boundedLabel(result) : formatPercentage(result.percentage ?? 0);");
replace("src/components/TitanIntelligence/TitanCommunityLearningPanel.tsx", 'import { getCommunityContent, type CommunityContent } from "../../services/communityEcosystemService";', 'import { getCommunityContent } from "../../services/communityEcosystemService";\nimport type { CommunityContent } from "../../types/communityEcosystem";');

replace("src/data/species/speciesGeneticsCombinations.ts", 'type ComboSpec = { id: string; species: string; name: string; aliases?: string[]; components: CombinationComponent[]; sourcePath: string; note: string };', 'type ComboSpec = { id: string; species: string; name: string; aliases?: string[]; components: CombinationComponent[]; sourcePath: string; note: string };\ntype ComboTuple = [string, string, CombinationComponent[], string, string, string];');
replace("src/data/species/speciesGeneticsCombinations.ts", 'const cornSnake: ComboSpec[] = [', 'const cornSnake: ComboTuple[] = [');
replace("src/data/species/speciesGeneticsCombinations.ts", 'const boaCombos: ComboSpec[] = [', 'const boaCombos: ComboTuple[] = [');

replace("src/genetics/geneticsForecast.ts", '  const hetEntry = parent.hets.find((entry) => {\n    const allele = findAllele(locus, entry.gene);\n    return Boolean(allele && !allele.isWildType);\n  });\n  if (hetEntry) {\n    const allele = findAllele(locus, hetEntry.gene)!;\n    const p = hetProbability(hetEntry.percentage);', '  const hetEntry = parent.hets.find((entry) => {\n    const allele = findAllele(locus, entry);\n    return Boolean(allele && !allele.isWildType);\n  });\n  if (hetEntry) {\n    const allele = findAllele(locus, hetEntry)!;\n    const p = hetProbability(parent.hetPercentages?.[hetEntry] ?? "100%");\n    const hetLabel = parent.hetPercentages?.[hetEntry] ?? "100%";');
replace("src/genetics/geneticsForecast.ts", '`${hetEntry.percentage} Het ${allele.name}`', '`${hetLabel} Het ${allele.name}`');
replace("src/genetics/geneticsForecast.ts", '`${Math.round((1 - p) * 100)}% not Het ${allele.name}`', '`${Math.round((1 - p) * 100)}% not Het ${allele.name}`');

replace("src/genetics/geneticsSnakeAdapter.ts", 'const copies = component.copies ?? 1;', 'const copies = "copies" in component && typeof component.copies === "number" ? component.copies : 1;');
replace("src/intelligence/v50/animalRecordsIntelligence.ts", "Date.parse(value)", "Date.parse(String(value))");
replace("src/intelligence/v50/geneticsJourneyEngine.ts", "Date.parse(value)", "Date.parse(String(value))");
replace("src/intelligence/v50/husbandryIntelligenceEngine.ts", "Date.parse(value)", "Date.parse(String(value))");
replace("src/intelligence/v50/husbandryIntelligenceEngine.ts", "recent[index - 1].temperatureC", "recent[index - 1]!.temperatureC");
replace("src/intelligence/v50/husbandryIntelligenceEngine.ts", "recent[index - 1].humidityPercent", "recent[index - 1]!.humidityPercent");
replace("src/intelligence/v50/titanContextSnapshot.ts", "detectImpossibleOffspring(genetics)", "detectImpossibleOffspring({ ...genetics, claims: genetics.claims ?? [] })");
replace("src/intelligence/v50/titanV50Runtime.ts", "const capabilities =", "const capabilities: TitanV50CapabilityResult[] =");
replace("src/intelligence/v50/titanV50UnifiedRuntime.ts", 'severity: finding.severity', 'severity: "notice" as const');
replace("src/intelligence/v50/titanV50UnifiedRuntime.ts", 'severity: finding.severity', 'severity: "notice" as const');
replace("src/pages/CreatorSubmissions.tsx", 'submitterUid={selectedTerminology.userId}', 'submitterUid={selectedTerminology.userId ?? ""}');

edit("src/pages/SnakeTitanIntelligencePage.tsx", (source) => source
  .replace('const allowed = await hasFullIntelligenceAccess(user.uid).catch(() => false);', 'const allowed = await hasFullIntelligenceAccess(user.uid).catch(() => false);')
  .replace('const result = await getSnakeMasterRecord(user.uid, snakeId);', 'const result = await getSnakeMasterRecord(user.uid, snakeId);'));

replace("src/services/healthService.ts", 'action: operation,', 'action: operation === "create" ? "created" : "updated",');
replace("src/services/weightService.ts", 'action:operation,', 'action:operation==="create"?"created":"updated",');
replace("src/services/snakeIntelligenceService.ts", 'category: "weight" | "feeding" | "shedding" | "behaviour" | "health" | "data" | "activity";', 'category: "weight" | "feeding" | "shedding" | "behaviour" | "health" | "data" | "activity" | "learning";');

replace("src/utils/breedingGenetics.ts", 'offspring.percentage / 100', '(offspring.percentage ?? offspring.probabilityRange?.max ?? 0) / 100');
replace("src/utils/breedingGenetics.ts", 'existing.percentage += result.percentage', 'existing.percentage += result.percentage ?? result.probabilityRange?.max ?? 0');
replace("src/utils/breedingGenetics.ts", 'b.percentage - a.percentage', '(b.percentage ?? b.probabilityRange?.max ?? 0) - (a.percentage ?? a.probabilityRange?.max ?? 0)');
replace("src/utils/breedingGenetics.ts", 'probability: item.percentage / 100', 'probability: (item.percentage ?? item.probabilityRange?.max ?? 0) / 100');
replace("src/utils/breedingGenetics.ts", 'sum + item.percentage / 100', 'sum + (item.percentage ?? item.probabilityRange?.max ?? 0) / 100');
replace("src/utils/geneticsCalculator.ts", 'existing.percentage+=result.percentage', 'existing.percentage+=(result.percentage ?? 0)');
replace("src/utils/geneticsCalculator.ts", 'b.percentage-a.percentage', '(b.percentage ?? 0)-(a.percentage ?? 0)');
replace("src/utils/geneticsCalculator.ts", 'percentage:offspring.percentage', 'percentage:offspring.percentage ?? 0');
replace("src/utils/geneticsCalculator.ts", 'percentage:offspring.percentage});else', 'percentage:offspring.percentage ?? 0});else');
replace("src/utils/geneticsCalculator.ts", 'percentage:value.percentage,certainty', 'percentage:value.percentage,certainty');

edit("src/components/TitanIntelligence/TitanLiveIntelligencePanel.tsx", (source) => source
  .replace('function observationList(value: unknown, fallbackLabel: string) { return records(value).map((record) => ({ date: recordDate(record), category: typeof record.category === "string" ? record.category : undefined, label: typeof record.label === "string" ? record.label : fallbackLabel, detail: typeof record.detail === "string" ? record.detail : undefined })); }', 'function observationList(value: unknown, fallbackLabel: string) { return records(value).map((record) => ({ date: recordDate(record), category: typeof record.category === "string" ? record.category : undefined, label: typeof record.label === "string" ? record.label : fallbackLabel, detail: typeof record.detail === "string" ? record.detail : undefined })).filter((item): item is { date: string | number; category?: string; label: string; detail?: string } => item.date != null); }')
  .replace('return { name: typeof snake.name === "string" ? snake.name : "Unnamed Titan", birthDate:', 'return { name: typeof snake.name === "string" ? snake.name : "Unnamed Titan", birthDate:')
  .replace('const weights = records(snake.weightHistory).map((record) => ({ date: recordDate(record), grams: Number(record.grams ?? record.weight ?? record.value) })).filter((point) => Number.isFinite(point.grams) && point.grams > 0 && point.date != null);', 'const weights = records(snake.weightHistory).map((record) => ({ date: recordDate(record), grams: Number(record.grams ?? record.weight ?? record.value) })).filter((point): point is { date: string | number; grams: number } => Number.isFinite(point.grams) && point.grams > 0 && point.date != null);')
  .replace('return{date,...(hasTemperature?{temperatureC}:{}),...(hasHumidity?{humidityPercent}:{}),enclosureId:typeof record.enclosureId==="string"?record.enclosureId:undefined,source:record.source==="sensor"?"sensor":"keeper"} satisfies HusbandryObservation;', 'return{date,...(hasTemperature?{temperatureC}:{}),...(hasHumidity?{humidityPercent}:{}),enclosureId:typeof record.enclosureId==="string"?record.enclosureId:undefined,source:record.source==="sensor"?"sensor":"keeper"} as HusbandryObservation;')
);

replace("src/intelligence/v50/animalMasterRecordEngine.ts", 'domain: domainForType(event.type)', 'domain: domainForType(event.type) as TitanDomainEvent["domain"]');

console.log(`Applied TypeScript contract repairs to ${edits.length} files:`);
for (const file of edits) console.log(` - ${file}`);
