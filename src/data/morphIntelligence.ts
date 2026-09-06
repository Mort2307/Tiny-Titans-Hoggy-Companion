import type { MorphComponent, MorphDefinition } from "./morphs";

export type MorphEvidenceLevel =
  | "unknown"
  | "reported"
  | "supported"
  | "well-documented"
  | "established";

export type MorphCompositionStatus = "exact" | "inferred" | "unresolved";

export interface MorphIntelligenceMetadata {
  geneticSignature?: string;
  geneticFormula?: string;
  directFormula?: string;
  inheritanceSummary?: string;
  recognisedNames?: string[];
  recognitionSummary?: string;
  searchTerms?: string[];
  evidenceLevel?: MorphEvidenceLevel;
  compositionStatus?: MorphCompositionStatus;
  unresolvedComponents?: string[];
}

export type IntelligentMorphDefinition = MorphDefinition & MorphIntelligenceMetadata & {
  contains?: string[];
};

const normalise = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[×✕]/g, "x")
    .replace(/[+&,/]/g, " ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const identityKey = (value: string): string => normalise(value).replace(/\s+/g, "");

function buildIdentityIndex(entries: MorphDefinition[]): Map<string, MorphDefinition> {
  const index = new Map<string, MorphDefinition>();
  for (const entry of entries) {
    for (const value of [entry.geneId, entry.name, ...(entry.aliases ?? [])]) {
      const key = identityKey(value);
      if (key && !index.has(key)) index.set(key, entry);
    }
  }
  return index;
}

function resolveEntry(value: string, index: Map<string, MorphDefinition>): MorphDefinition | undefined {
  return index.get(identityKey(value));
}

function multiplyComponent(component: MorphComponent, factor: number): MorphComponent {
  return { ...component, copies: (component.copies ?? 1) * factor };
}

function mergeComponents(components: MorphComponent[]): MorphComponent[] {
  const merged = new Map<string, MorphComponent>();
  for (const component of components) {
    const key = `${component.type}:${component.morphId}`;
    const existing = merged.get(key);
    if (existing) existing.copies = (existing.copies ?? 1) + (component.copies ?? 1);
    else merged.set(key, { ...component, copies: component.copies ?? 1 });
  }
  return [...merged.values()].sort((a, b) => a.morphId.localeCompare(b.morphId));
}

function expandEntry(
  entry: MorphDefinition,
  index: Map<string, MorphDefinition>,
  stack: Set<string> = new Set(),
): MorphComponent[] {
  const identity = identityKey(entry.geneId);
  if (stack.has(identity)) return [{ morphId: entry.geneId, type: "Combination", copies: 1 }];
  if (entry.kind === "Gene" && entry.isGene) return [{ morphId: entry.geneId, type: "Gene", copies: 1 }];

  const nextStack = new Set(stack);
  nextStack.add(identity);

  if (entry.components?.length) {
    const expanded: MorphComponent[] = [];
    for (const component of entry.components) {
      const child = resolveEntry(component.morphId, index);
      const factor = component.copies ?? 1;
      if (child) expanded.push(...expandEntry(child, index, nextStack).map((item) => multiplyComponent(item, factor)));
      else expanded.push({ ...component, copies: factor });
    }
    return mergeComponents(expanded);
  }

  if (entry.kind === "Super" && entry.superFormId) {
    const base = resolveEntry(entry.superFormId, index);
    if (base) return expandEntry(base, index, nextStack).map((item) => multiplyComponent(item, 2));
  }

  return [{ morphId: entry.geneId, type: entry.kind === "Gene" ? "Gene" : entry.kind, copies: 1 } as MorphComponent];
}

function componentDisplayName(component: MorphComponent, index: Map<string, MorphDefinition>): string {
  const entry = resolveEntry(component.morphId, index);
  const name = entry?.name ?? component.morphId;
  const copies = component.copies ?? 1;
  return copies === 1 ? name : `${name} ×${copies}`;
}

function compactFormula(names: string[]): string {
  return names.join(" ");
}

function formulaVariants(names: string[]): string[] {
  const variants = new Set<string>();
  const add = (value: string) => { if (normalise(value)) variants.add(value.trim()); };
  add(names.join(" + "));
  add(names.join(" x "));
  add(names.join(" × "));
  add(compactFormula(names));
  if (names.length === 2) {
    const reversed = [...names].reverse();
    add(reversed.join(" + "));
    add(reversed.join(" x "));
    add(reversed.join(" × "));
    add(compactFormula(reversed));
  }
  return [...variants];
}

function evidenceLevel(entry: MorphDefinition & { evidenceStatus?: string }): MorphEvidenceLevel {
  const status = entry.evidenceStatus?.trim().toLowerCase();
  if (status === "confirmed" || entry.verification === "Confirmed") return "established";
  if (status === "well-documented" || status === "well documented") return "well-documented";
  if (entry.verification === "Recognised" || status === "recognised") return "supported";
  if (entry.verification === "Unverified" || status === "reported") return "reported";
  return "unknown";
}

function inheritedProfiles(components: MorphComponent[], index: Map<string, MorphDefinition>): string[] {
  return [...new Set(
    components
      .map((component) => resolveEntry(component.morphId, index)?.inheritance)
      .filter((value): value is MorphDefinition["inheritance"] => Boolean(value) && value !== "Unknown"),
  )].sort((a, b) => a.localeCompare(b));
}

function isGeneticallyResolvable(entry: MorphDefinition, index: Map<string, MorphDefinition>): boolean {
  if (entry.kind === "Gene" && entry.isGene) return true;
  return expandEntry(entry, index).some((component) => component.type === "Gene");
}

/**
 * Resolve a whitespace-separated combination name without inventing genetics.
 * Only complete tokenisations into existing genetic genes/supers/known genetic
 * combinations are accepted. Line-bred, polygenic, project and unknown terms
 * deliberately stop inference rather than being silently promoted to loci.
 */
function inferNameComponents(entry: MorphDefinition, index: Map<string, MorphDefinition>): MorphComponent[] | undefined {
  if (entry.kind !== "Combination" || entry.components?.length) return entry.components;

  const source = normalise(entry.name);
  if (!source || !source.includes(" ")) return undefined;

  const candidates = [...new Set([...index.values()])]
    .filter((candidate) => candidate.geneId !== entry.geneId)
    .filter((candidate) => candidate.kind === "Gene" || candidate.kind === "Super" || candidate.kind === "Combination")
    .filter((candidate) => isGeneticallyResolvable(candidate, index))
    .flatMap((candidate) => [candidate.name, ...(candidate.aliases ?? [])].map((label) => ({ candidate, label: normalise(label) })))
    .filter((item) => item.label.length > 0)
    .sort((a, b) => b.label.length - a.label.length);

  const memo = new Map<number, MorphComponent[] | null>();
  function solve(position: number): MorphComponent[] | null {
    if (position === source.length) return [];
    if (memo.has(position)) return memo.get(position)!;

    for (const { candidate, label } of candidates) {
      if (!source.startsWith(label, position)) continue;
      const end = position + label.length;
      if (end < source.length && source[end] !== " ") continue;
      const nextPosition = end < source.length ? end + 1 : end;
      const tail = solve(nextPosition);
      if (!tail) continue;
      const factorComponents = candidate.components?.length
        ? candidate.components.map((component) => ({ ...component, copies: component.copies ?? 1 }))
        : candidate.kind === "Super" && candidate.superFormId
          ? [{ morphId: candidate.superFormId, type: "Gene" as const, copies: 2 }]
          : [{ morphId: candidate.geneId, type: "Gene" as const, copies: 1 }];
      const result = mergeComponents([...factorComponents, ...tail]);
      memo.set(position, result);
      return result;
    }
    memo.set(position, null);
    return null;
  }

  return solve(0) ?? undefined;
}

function compositionForEntry(entry: MorphDefinition, index: Map<string, MorphDefinition>): {
  components: MorphComponent[];
  status: MorphCompositionStatus;
} {
  if (entry.kind === "Gene" && entry.isGene) return { components: [{ morphId: entry.geneId, type: "Gene", copies: 1 }], status: "exact" };
  if (entry.components?.length) return { components: expandEntry(entry, index), status: "exact" };
  const inferred = inferNameComponents(entry, index);
  if (inferred?.length) return { components: expandEntry({ ...entry, components: inferred }, index), status: "inferred" };
  return { components: [], status: "unresolved" };
}

function isRecognisedCombination(entry: MorphDefinition): boolean {
  return (entry.kind === "Combination" || entry.isCombination === true) && entry.verification !== "Disputed" && entry.verification !== "Unverified";
}

export function enrichMorphDatabase<T extends MorphDefinition & { evidenceStatus?: string; contains?: string[] }>(entries: T[]): Array<T & MorphIntelligenceMetadata> {
  const index = buildIdentityIndex(entries);
  const compositions = new Map<string, { names: string[]; status: MorphCompositionStatus }>();

  for (const entry of entries) {
    const composition = compositionForEntry(entry, index);
    const geneticComponents = composition.components.filter((component) => component.type === "Gene");
    const signature = geneticComponents.map((component) => `${component.morphId}:${component.copies ?? 1}`).sort().join("|");
    if (!signature) continue;
    const current = compositions.get(signature) ?? { names: [], status: composition.status };
    if (composition.status === "exact") current.status = "exact";
    if (isRecognisedCombination(entry) && !current.names.some((name) => identityKey(name) === identityKey(entry.name))) current.names.push(entry.name);
    compositions.set(signature, current);
  }

  return entries.map((entry) => {
    const composition = compositionForEntry(entry, index);
    const geneticComponents = composition.components.filter((component) => component.type === "Gene");
    const geneticSignature = geneticComponents.map((component) => `${component.morphId}:${component.copies ?? 1}`).sort().join("|");
    const directComponents = entry.components ?? [];
    const directNames = directComponents.map((component) => componentDisplayName(component, index));
    const geneticNames = geneticComponents.map((component) => componentDisplayName(component, index));
    const recognisedNames = compositions.get(geneticSignature)?.names ?? [];
    const inheritance = inheritedProfiles(geneticComponents, index);
    const geneticFormula = geneticNames.length ? geneticNames.join(" + ") : undefined;
    const directFormula = directNames.length ? directNames.join(" + ") : undefined;
    const aliases = [...new Set([
      ...(entry.aliases ?? []),
      ...formulaVariants(geneticNames.length ? geneticNames : directNames),
      ...recognisedNames.filter((name) => identityKey(name) !== identityKey(entry.name)),
    ].filter(Boolean))];
    const recognitionSummary = recognisedNames.length > 0
      ? `Recognised combination name${recognisedNames.length === 1 ? "" : "s"}: ${recognisedNames.join(", ")}.`
      : undefined;
    const generatedDescription = entry.kind === "Combination" && geneticFormula
      ? `${entry.description ?? "A recognised Western Hognose combination."} Genetic composition: ${geneticFormula}.`
      : entry.description;
    const educationParts = [
      geneticFormula ? `Genetic composition: ${geneticFormula}.` : undefined,
      recognitionSummary,
      inheritance.length > 0 ? `Component inheritance: ${inheritance.join(" + ")}.` : undefined,
      composition.status === "inferred" ? "Composition inferred from the published combination name and existing canonical genetic terms; review the source before treating the structure as authoritative." : undefined,
      composition.status === "unresolved" && entry.kind === "Combination" ? "Genetic composition is not yet encoded in the canonical database; this name is retained for search and review without inventing a locus." : undefined,
      entry.kind === "Combination" ? "This name describes a combination of underlying genetics, not a separate locus." : undefined,
    ].filter((part): part is string => Boolean(part));
    const enrichedInheritance = entry.kind === "Combination" ? "Unknown" : entry.inheritance;
    const contains = entry.kind === "Combination" || entry.kind === "Super"
      ? (directNames.length ? directNames : geneticNames.length ? geneticNames : entry.contains)
      : entry.contains;

    return {
      ...entry,
      inheritance: enrichedInheritance,
      aliases,
      contains,
      description: generatedDescription,
      educationalNotes: educationParts.length ? [entry.educationalNotes, ...educationParts].filter(Boolean).join(" ") : entry.educationalNotes,
      geneticSignature: geneticSignature || undefined,
      geneticFormula,
      directFormula,
      inheritanceSummary: inheritance.length ? inheritance.join(" + ") : undefined,
      recognisedNames,
      recognitionSummary,
      searchTerms: [...new Set([
        entry.name,
        entry.geneId,
        ...(entry.aliases ?? []),
        ...aliases,
        ...(geneticFormula ? formulaVariants(geneticNames) : []),
      ])],
      evidenceLevel: evidenceLevel(entry),
      compositionStatus: composition.status,
      unresolvedComponents: composition.status === "unresolved" ? [entry.name] : undefined,
    };
  });
}

export function getMorphIntelligence<T extends MorphDefinition & { evidenceStatus?: string; contains?: string[] }>(entries: T[], value: string): (T & MorphIntelligenceMetadata) | undefined {
  const query = identityKey(value);
  const enriched = enrichMorphDatabase(entries);
  return enriched.find((entry) =>
    identityKey(entry.geneId) === query ||
    identityKey(entry.name) === query ||
    (entry.searchTerms ?? []).some((term) => identityKey(term) === query),
  );
}

export function resolveMorphComposition<T extends MorphDefinition & { evidenceStatus?: string; contains?: string[] }>(entries: T[], value: string): (T & MorphIntelligenceMetadata) | undefined {
  return getMorphIntelligence(entries, value);
}
