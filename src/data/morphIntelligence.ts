import type { MorphComponent, MorphDefinition } from "./morphs";

export type MorphEvidenceLevel =
  | "unknown"
  | "reported"
  | "supported"
  | "well-documented"
  | "established";

export interface MorphIntelligenceMetadata {
  geneticSignature?: string;
  geneticFormula?: string;
  directFormula?: string;
  inheritanceSummary?: string;
  recognisedNames?: string[];
  recognitionSummary?: string;
  searchTerms?: string[];
  evidenceLevel?: MorphEvidenceLevel;
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
    const values = [entry.geneId, entry.name, ...(entry.aliases ?? [])];
    for (const value of values) {
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
    if (existing) {
      existing.copies = (existing.copies ?? 1) + (component.copies ?? 1);
    } else {
      merged.set(key, { ...component, copies: component.copies ?? 1 });
    }
  }
  return [...merged.values()].sort((a, b) => a.morphId.localeCompare(b.morphId));
}

function expandEntry(
  entry: MorphDefinition,
  index: Map<string, MorphDefinition>,
  stack: Set<string> = new Set(),
): MorphComponent[] {
  const identity = identityKey(entry.geneId);
  if (stack.has(identity)) {
    return [{ morphId: entry.geneId, type: entry.kind === "Gene" ? "Gene" : "Combination", copies: 1 }];
  }

  if (entry.kind === "Gene" && entry.isGene) {
    return [{ morphId: entry.geneId, type: "Gene", copies: 1 }];
  }

  const nextStack = new Set(stack);
  nextStack.add(identity);

  if (entry.components?.length) {
    const expanded: MorphComponent[] = [];
    for (const component of entry.components) {
      const child = resolveEntry(component.morphId, index);
      const factor = component.copies ?? 1;
      if (child) {
        expanded.push(...expandEntry(child, index, nextStack).map((item) => multiplyComponent(item, factor)));
      } else {
        expanded.push({ ...component, copies: factor });
      }
    }
    return mergeComponents(expanded);
  }

  if (entry.kind === "Super" && entry.superFormId) {
    const base = resolveEntry(entry.superFormId, index);
    if (base) return expandEntry(base, index, nextStack).map((item) => multiplyComponent(item, 2));
  }

  return [{
    morphId: entry.geneId,
    type: entry.kind === "Gene" ? "Gene" : entry.kind,
    copies: 1,
  } as MorphComponent];
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
  const add = (value: string) => {
    const key = normalise(value);
    if (key) variants.add(value.trim());
  };

  add(names.join(" + "));
  add(names.join(" x "));
  add(compactFormula(names));
  add(names.join(" × "));
  if (names.length === 2) {
    const reversed = [...names].reverse();
    add(reversed.join(" + "));
    add(reversed.join(" x "));
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

function isRecognisedCombination(entry: MorphDefinition): boolean {
  return (entry.kind === "Combination" || entry.isCombination === true) && entry.verification !== "Disputed" && entry.verification !== "Unverified";
}

export function enrichMorphDatabase<T extends MorphDefinition & { evidenceStatus?: string; contains?: string[] }>(entries: T[]): Array<T & MorphIntelligenceMetadata> {
  const index = buildIdentityIndex(entries);
  const signatures = new Map<string, string[]>();

  for (const entry of entries) {
    const expanded = expandEntry(entry, index).filter((component) => component.type === "Gene");
    const signature = expanded
      .map((component) => `${component.morphId}:${component.copies ?? 1}`)
      .sort()
      .join("|");
    if (!signature) continue;
    const names = signatures.get(signature) ?? [];
    if (isRecognisedCombination(entry) && !names.some((name) => identityKey(name) === identityKey(entry.name))) names.push(entry.name);
    signatures.set(signature, names);
  }

  return entries.map((entry) => {
    const directComponents = entry.components ?? [];
    const expanded = expandEntry(entry, index);
    const geneticComponents = expanded.filter((component) => component.type === "Gene");
    const geneticSignature = geneticComponents
      .map((component) => `${component.morphId}:${component.copies ?? 1}`)
      .sort()
      .join("|");
    const directNames = directComponents.map((component) => componentDisplayName(component, index));
    const geneticNames = geneticComponents.map((component) => componentDisplayName(component, index));
    const recognisedNames = signatures.get(geneticSignature) ?? [];
    const inheritance = inheritedProfiles(geneticComponents, index);
    const directFormula = directNames.length ? directNames.join(" + ") : undefined;
    const geneticFormula = geneticNames.length ? geneticNames.join(" + ") : undefined;
    const aliases = [...new Set([
      ...(entry.aliases ?? []),
      ...formulaVariants(directNames.length ? directNames : geneticNames),
      ...recognisedNames.filter((name) => identityKey(name) !== identityKey(entry.name)),
    ].filter(Boolean))];

    const recognitionSummary = recognisedNames.length > 0
      ? `Recognised combination name${recognisedNames.length === 1 ? "" : "s"}: ${recognisedNames.join(", ")}.`
      : undefined;

    const generatedDescription = entry.kind === "Combination" && geneticFormula
      ? `A recognised Western Hognose combination expressed as ${geneticFormula}.`
      : entry.description;

    const educationParts = [
      geneticFormula ? `Genetic composition: ${geneticFormula}.` : undefined,
      recognitionSummary,
      inheritance.length > 0 ? `Component inheritance: ${inheritance.join(" + ")}.` : undefined,
      entry.kind === "Combination" ? "This name describes a combination of underlying genetics, not a separate locus." : undefined,
    ].filter((part): part is string => Boolean(part));

    const enrichedInheritance = entry.kind === "Combination" ? "Unknown" : entry.inheritance;
    const contains = entry.kind === "Combination" || entry.kind === "Super"
      ? (directNames.length ? directNames : entry.contains)
      : entry.contains;

    return {
      ...entry,
      inheritance: enrichedInheritance,
      aliases,
      contains,
      description: generatedDescription,
      educationalNotes: educationParts.length
        ? [entry.educationalNotes, ...educationParts].filter(Boolean).join(" ")
        : entry.educationalNotes,
      geneticSignature: geneticSignature || undefined,
      geneticFormula,
      directFormula,
      inheritanceSummary: inheritance.length ? inheritance.join(" + ") : undefined,
      recognisedNames,
      recognitionSummary,
      searchTerms: [...new Set([
        entry.name,
        ...(entry.aliases ?? []),
        ...aliases,
        ...(geneticFormula ? formulaVariants(geneticNames) : []),
      ])],
      evidenceLevel: evidenceLevel(entry),
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
