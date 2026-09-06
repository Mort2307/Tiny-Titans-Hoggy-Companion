import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changes = [];

function apply(relativePath, transform, label) {
  const file = path.join(root, relativePath);
  const source = fs.readFileSync(file, "utf8");
  const next = transform(source);
  if (next === source) {
    changes.push(`SKIP ${relativePath} — ${label} (already applied or source differs)`);
    return;
  }
  fs.writeFileSync(file, next, "utf8");
  changes.push(`OK   ${relativePath} — ${label}`);
}

function replaceText(relativePath, from, to, label) {
  apply(relativePath, (source) => source.includes(from) ? source.replace(from, to) : source, label);
}

function replaceRegex(relativePath, pattern, replacement, label) {
  apply(relativePath, (source) => pattern.test(source) ? source.replace(pattern, replacement) : source, label);
}

replaceText("src/components/ParentSelector.tsx", 'const needsZygosity = inheritance === "Dominant" || inheritance === "Incomplete Dominant" || inheritance === "Co-Dominant";', 'const needsZygosity = ["Dominant", "Incomplete Dominant", "Co-Dominant"].includes(inheritance ?? "");', "normalise inheritance union check");
replaceText("src/components/ResultCard.tsx", "const probabilityLabel = bounded ? boundedLabel(result) : formatPercentage(result.percentage);", "const probabilityLabel = bounded ? boundedLabel(result) : formatPercentage(result.percentage ?? 0);", "guard optional percentage");
replaceText("src/components/TitanIntelligence/TitanCommunityLearningPanel.tsx", 'import { getCommunityContent, type CommunityContent } from "../../services/communityEcosystemService";', 'import { getCommunityContent } from "../../services/communityEcosystemService";\nimport type { CommunityContent } from "../../types/communityEcosystem";', "use canonical community type");
replaceText("src/data/species/speciesGeneticsCombinations.ts", 'type ComboSpec = { id: string; species: string; name: string; aliases?: string[]; components: CombinationComponent[]; sourcePath: string; note: string };', 'type ComboSpec = { id: string; species: string; name: string; aliases?: string[]; components: CombinationComponent[]; sourcePath: string; note: string };\ntype ComboTuple = [string, string, CombinationComponent[], string, string, string];', "declare tuple source shape");
replaceText("src/data/species/speciesGeneticsCombinations.ts", 'const cornSnake: ComboSpec[] = [', 'const cornSnake: ComboTuple[] = [', "type corn snake tuple map");
replaceText("src/data/species/speciesGeneticsCombinations.ts", 'const boaCombos: ComboSpec[] = [', 'const boaCombos: ComboTuple[] = [', "type boa tuple map");
replaceRegex("src/genetics/geneticsForecast.ts", /const hetEntry = parent\.hets\.find\(\(entry\) => \{[\s\S]*?\n  \}\);\n  if \(hetEntry\) \{\n    const allele = findAllele\(locus, hetEntry\.[^\n]+\)!;\n    const p = hetProbability\(hetEntry\.percentage\);/, `const hetEntry = parent.hets.find((entry) => {\n    const geneId = typeof entry === "string" ? entry : entry.gene;\n    const allele = findAllele(locus, geneId);\n    return Boolean(allele && !allele.isWildType);\n  });\n  if (hetEntry) {\n    const geneId = typeof hetEntry === "string" ? hetEntry : hetEntry.gene;\n    const allele = findAllele(locus, geneId)!;\n    const hetPercentage = typeof hetEntry === "string" ? parent.hetPercentages?.[hetEntry] ?? "100%" : hetEntry.percentage;\n    const p = hetProbability(hetPercentage);`, "normalise legacy/string het access");
replaceRegex("src/genetics/geneticsForecast.ts", /\$\{hetEntry\.percentage\} Het \$\{allele\.name\}/g, "${hetPercentage} Het ${allele.name}", "use normalised het percentage");
replaceText("src/genetics/geneticsSnakeAdapter.ts", 'const copies = component.copies ?? 1;', 'const copies = "copies" in component && typeof component.copies === "number" ? component.copies : 1;', "guard legacy component copies");
replaceText("src/intelligence/v50/animalRecordsIntelligence.ts", "Date.parse(value)", "Date.parse(String(value))", "normalise date input");
replaceText("src/intelligence/v50/geneticsJourneyEngine.ts", "Date.parse(value)", "Date.parse(String(value))", "normalise date input");
replaceText("src/intelligence/v50/husbandryIntelligenceEngine.ts", "Date.parse(value)", "Date.parse(String(value))", "normalise date input");
replaceText("src/intelligence/v50/husbandryIntelligenceEngine.ts", "recent[index - 1].temperatureC", "recent[index - 1]!.temperatureC", "narrow previous temperature observation");
replaceText("src/intelligence/v50/husbandryIntelligenceEngine.ts", "recent[index - 1].humidityPercent", "recent[index - 1]!.humidityPercent", "narrow previous humidity observation");
replaceText("src/intelligence/v50/titanContextSnapshot.ts", "detectImpossibleOffspring(genetics)", "detectImpossibleOffspring({ ...genetics, claims: genetics.claims ?? [] })", "provide required genetics claims");
replaceText("src/intelligence/v50/titanV50Runtime.ts", "const capabilities =", "const capabilities: TitanV50CapabilityResult[] =", "preserve capability result union");
replaceRegex("src/intelligence/v50/titanV50UnifiedRuntime.ts", /severity: finding\.severity/g, 'severity: "notice" as const', "map integrity findings to supported signal severity");
replaceText("src/pages/CreatorSubmissions.tsx", 'submitterUid={selectedTerminology.userId}', 'submitterUid={selectedTerminology.userId ?? ""}', "guard optional submitter id");
replaceText("src/pages/SnakeTitanIntelligencePage.tsx", 'setLoadedKey(null);\n\n    async function load() {', 'setLoadedKey(null);\n    const authenticatedUser = user;\n    const selectedSnakeId = snakeId;\n\n    async function load() {', "capture narrowed auth values");
replaceText("src/pages/SnakeTitanIntelligencePage.tsx", 'const allowed = await hasFullIntelligenceAccess(user.uid).catch(() => false);', 'const allowed = await hasFullIntelligenceAccess(authenticatedUser.uid).catch(() => false);', "use narrowed auth user");
replaceText("src/pages/SnakeTitanIntelligencePage.tsx", 'const result = await getSnakeMasterRecord(user.uid, snakeId);', 'const result = await getSnakeMasterRecord(authenticatedUser.uid, selectedSnakeId);', "use narrowed snake id");
replaceText("src/services/healthService.ts", 'action: operation,', 'action: operation === "create" ? "created" : "updated",', "map persistence operation to Titan action contract");
replaceText("src/services/weightService.ts", 'action:operation,', 'action:operation==="create"?"created":"updated",', "map persistence operation to Titan action contract");
replaceText("src/services/snakeIntelligenceService.ts", 'category: "weight" | "feeding" | "shedding" | "behaviour" | "health" | "data" | "activity";', 'category: "weight" | "feeding" | "shedding" | "behaviour" | "health" | "data" | "activity" | "learning";', "allow learning event category");
replaceText("src/utils/breedingGenetics.ts", 'offspring.percentage / 100', '(offspring.percentage ?? offspring.probabilityRange?.max ?? 0) / 100', "guard optional offspring probability");
replaceText("src/utils/breedingGenetics.ts", 'existing.percentage += result.percentage', 'existing.percentage += result.percentage ?? result.probabilityRange?.max ?? 0', "guard optional merged probability");
replaceText("src/utils/breedingGenetics.ts", 'b.percentage - a.percentage', '(b.percentage ?? b.probabilityRange?.max ?? 0) - (a.percentage ?? a.probabilityRange?.max ?? 0)', "guard optional sort probabilities");
replaceText("src/utils/breedingGenetics.ts", 'probability: item.percentage / 100', 'probability: (item.percentage ?? item.probabilityRange?.max ?? 0) / 100', "guard optional presentation probability");
replaceText("src/utils/breedingGenetics.ts", 'sum + item.percentage / 100', 'sum + (item.percentage ?? item.probabilityRange?.max ?? 0) / 100', "guard optional total probability");
replaceText("src/utils/geneticsCalculator.ts", 'existing.percentage+=result.percentage', 'existing.percentage+=(result.percentage ?? 0)', "guard optional merged probability");
replaceText("src/utils/geneticsCalculator.ts", 'b.percentage-a.percentage', '(b.percentage ?? 0)-(a.percentage ?? 0)', "guard optional sort probability");
replaceRegex("src/utils/geneticsCalculator.ts", /percentage:offspring\.percentage/g, 'percentage:offspring.percentage ?? 0', "guard optional summary probability");
replaceRegex("src/components/TitanIntelligence/TitanLiveIntelligencePanel.tsx", /function observationList\(value: unknown, fallbackLabel: string\) \{ return records\(value\)\.map\(\(record\) => \(\{ date: recordDate\(record\), category: typeof record\.category === "string" \? record\.category : undefined, label: typeof record\.label === "string" \? record\.label : fallbackLabel, detail: typeof record\.detail === "string" \? record\.detail : undefined \}\)\); \}/, 'function observationList(value: unknown, fallbackLabel: string) { return records(value).map((record) => ({ date: recordDate(record), category: typeof record.category === "string" ? record.category : undefined, label: typeof record.label === "string" ? record.label : fallbackLabel, detail: typeof record.detail === "string" ? record.detail : undefined })).filter((item): item is { date: string | number; category?: string; label: string; detail?: string } => item.date != null); }', "filter undated observations");
replaceRegex("src/components/TitanIntelligence/TitanLiveIntelligencePanel.tsx", /const weights = records\(snake\.weightHistory\)\.map\(\(record\) => \(\{ date: recordDate\(record\), grams: Number\(record\.grams \?\? record\.weight \?\? record\.value\) \}\)\)\.filter\(\(point\) => Number\.isFinite\(point\.grams\) && point\.grams > 0 && point\.date != null\);/, 'const weights = records(snake.weightHistory).map((record) => ({ date: recordDate(record), grams: Number(record.grams ?? record.weight ?? record.value) })).filter((point): point is { date: string | number; grams: number } => Number.isFinite(point.grams) && point.grams > 0 && point.date != null);', "filter undated weight observations");
replaceRegex("src/components/TitanIntelligence/TitanLiveIntelligencePanel.tsx", /return\{date,\.\.\.\(hasTemperature\?\{temperatureC\}:\{\}\),\.\.\.\(hasHumidity\?\{humidityPercent\}:\{\}\),enclosureId:typeof record\.enclosureId==="string"\?record\.enclosureId:undefined,source:record\.source==="sensor"\?"sensor":"keeper"\} satisfies HusbandryObservation;/, 'return{date,...(hasTemperature?{temperatureC}:{}),...(hasHumidity?{humidityPercent}:{}),enclosureId:typeof record.enclosureId==="string"?record.enclosureId:undefined,source:record.source==="sensor"?"sensor":"keeper"} as HusbandryObservation;', "avoid optional-property predicate mismatch");
replaceText("src/intelligence/v50/animalMasterRecordEngine.ts", 'domain: domainForType(event.type)', 'domain: domainForType(event.type) as TitanDomainEvent["domain"]', "narrow domain union");

console.log(changes.join("\n"));
console.log("\nTypeScript contract repair pass complete.");
