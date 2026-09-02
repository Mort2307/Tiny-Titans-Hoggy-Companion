import {
  findMorph,
  getCombinations,
  getMorphByGeneId,
  type InheritanceType,
  type MorphDefinition,
  type MorphComponent,
} from "../data/morphs";
import { expandMorphToComponents, resolveMorphSelection } from "./morphResolver";
import { calculatorNamedCombinations, componentSignature, findCalculatorNamedCombination } from "../data/geneticsComboRegistry";

export type ReverseParentState = {
  copies: 0 | 1 | 2;
  label: string;
};

export type ReverseParentRoute = {
  mother: ReverseParentState;
  father: ReverseParentState;
  childProbability: number;
};

export type ReverseLocusRequirement = {
  geneId: string;
  name: string;
  inheritance: InheritanceType;
  copies: 1 | 2;
  expressedState: "Het" | "Visual" | "Super" | "Trait";
  routes: ReverseParentRoute[];
};

export type ReverseTreeNode = {
  id: string;
  name: string;
  kind: MorphDefinition["kind"] | "Unknown";
  copies: number;
  children: ReverseTreeNode[];
};

export type MorphReversalResult = {
  query: string;
  canonicalName: string;
  target: MorphDefinition;
  recognised: boolean;
  directComponents: Array<{ morphId: string; name: string; copies: number }>;
  underlyingLoci: ReverseLocusRequirement[];
  tree: ReverseTreeNode;
  alternateNames: string[];
  caveat: string;
};

const EPSILON = 0.000001;

function mutationAlleleProbability(copies: 0 | 1 | 2): number {
  return copies / 2;
}

function childProbability(mother: 0 | 1 | 2, father: 0 | 1 | 2, target: 0 | 1 | 2): number {
  const m = mutationAlleleProbability(mother);
  const f = mutationAlleleProbability(father);
  const probabilities = [
    (1 - m) * (1 - f),
    m * (1 - f) + (1 - m) * f,
    m * f,
  ];
  return probabilities[target] * 100;
}

function stateLabel(inheritance: InheritanceType, copies: 0 | 1 | 2): string {
  if (copies === 0) return "Clear";
  if (inheritance === "Recessive") return copies === 2 ? "Visual" : "Het";
  if (inheritance === "Incomplete Dominant") return copies === 2 ? "Super" : "Visual";
  if (inheritance === "Dominant") return "Visual";
  if (inheritance === "Polygenic") return "Trait";
  if (inheritance === "Line-bred") return "Trait";
  return "Trait";
}

function supportsMendelianRoutes(inheritance: InheritanceType): boolean {
  return inheritance === "Recessive" || inheritance === "Incomplete Dominant" || inheritance === "Dominant";
}

function routeState(inheritance: InheritanceType, copies: 0 | 1 | 2): ReverseParentState {
  return { copies, label: stateLabel(inheritance, copies) };
}

function buildRoutes(inheritance: InheritanceType, targetCopies: 1 | 2): ReverseParentRoute[] {
  if (!supportsMendelianRoutes(inheritance)) return [];

  const routes: ReverseParentRoute[] = [];
  const seen = new Set<string>();

  for (const mother of [0, 1, 2] as const) {
    for (const father of [0, 1, 2] as const) {
      const probability = childProbability(mother, father, targetCopies);
      if (probability <= EPSILON) continue;
      const pairKey = `${Math.min(mother, father)}:${Math.max(mother, father)}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      routes.push({
        mother: routeState(inheritance, mother),
        father: routeState(inheritance, father),
        childProbability: probability,
      });
    }
  }

  return routes.sort((a, b) =>
    b.childProbability - a.childProbability
    || (a.mother.copies + a.father.copies) - (b.mother.copies + b.father.copies),
  );
}

function aggregateComponents(components: MorphComponent[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const component of components) {
    map.set(component.morphId, (map.get(component.morphId) ?? 0) + (component.copies ?? 1));
  }
  return map;
}

function buildTreeFromDefinition(definition: MorphDefinition, copies = 1, visited = new Set<string>()): ReverseTreeNode {
  const children: ReverseTreeNode[] = [];
  const nextVisited = new Set(visited);
  nextVisited.add(definition.geneId);

  for (const component of definition.components ?? []) {
    const referenced = getMorphByGeneId(component.morphId);
    const componentCopies = (component.copies ?? 1) * copies;
    if (!referenced || nextVisited.has(component.morphId)) {
      children.push({ id: component.morphId, name: referenced?.name ?? component.morphId, kind: referenced?.kind ?? "Unknown", copies: componentCopies, children: [] });
      continue;
    }
    children.push(buildTreeFromDefinition(referenced, componentCopies, nextVisited));
  }

  return { id: definition.geneId, name: definition.name, kind: definition.kind, copies, children };
}

function signature(definition: MorphDefinition): string {
  return componentSignature(expandMorphToComponents(definition));
}

function getAllRecognisedCombinations(): MorphDefinition[] {
  const all = [...getCombinations(), ...calculatorNamedCombinations];
  const bySignature = new Map<string, MorphDefinition[]>();
  for (const candidate of all) {
    const key = signature(candidate);
    const group = bySignature.get(key) ?? [];
    if (!group.some((entry) => entry.geneId === candidate.geneId)) group.push(candidate);
    bySignature.set(key, group);
  }
  return [...bySignature.values()].flat();
}

function sortCombinations(a: MorphDefinition, b: MorphDefinition): number {
  const verificationRank = (value: MorphDefinition["verification"]): number => value === "Confirmed" ? 0 : value === "Recognised" ? 1 : value === "Unverified" ? 2 : 3;
  return verificationRank(a.verification) - verificationRank(b.verification)
    || (b.components?.length ?? 0) - (a.components?.length ?? 0)
    || a.name.localeCompare(b.name);
}

function getCanonicalCombination(definition: MorphDefinition): { canonical: MorphDefinition; alternateNames: string[] } {
  const matches = getAllRecognisedCombinations()
    .filter((candidate) => signature(candidate) === signature(definition))
    .sort(sortCombinations);
  return { canonical: matches[0] ?? definition, alternateNames: matches.slice(1).map((candidate) => candidate.name) };
}

function resolveTarget(query: string): {
  target?: MorphDefinition;
  displayName: string;
  recognised: boolean;
  alternateNames: string[];
  components: MorphComponent[];
} {
  const named = findCalculatorNamedCombination(query);
  if (named) {
    const canonicalised = getCanonicalCombination(named);
    return {
      target: canonicalised.canonical,
      displayName: canonicalised.canonical.name,
      recognised: true,
      alternateNames: canonicalised.alternateNames,
      components: canonicalised.canonical.components ?? [],
    };
  }

  const exact = findMorph(query);
  if (exact) {
    const canonicalised = exact.kind === "Combination" || exact.isCombination
      ? getCanonicalCombination(exact)
      : { canonical: exact, alternateNames: [] };
    return {
      target: canonicalised.canonical,
      displayName: canonicalised.canonical.name,
      recognised: Boolean(canonicalised.canonical.isCombination || canonicalised.canonical.kind === "Combination"),
      alternateNames: canonicalised.alternateNames,
      components: canonicalised.canonical.components ?? [],
    };
  }

  const parts = query.split("+").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const resolved = resolveMorphSelection(parts);
    if (resolved.components.length === 0) return { displayName: query.trim(), recognised: false, alternateNames: [], components: [] };

    const virtualTarget: MorphDefinition = {
      geneId: `virtual:${resolved.components.map((component) => `${component.morphId}-${component.copies ?? 1}`).join("+")}`,
      name: resolved.displayName,
      aliases: [],
      kind: "Combination",
      isGene: false,
      isCombination: true,
      category: "Calculated combination",
      inheritance: "Unknown",
      hetPossible: false,
      components: resolved.components,
      verification: "Recognised",
      description: "A calculated component combination not yet assigned a dedicated database name.",
    };
    const canonicalised = getCanonicalCombination(virtualTarget);
    return {
      target: canonicalised.canonical,
      displayName: canonicalised.canonical.name,
      recognised: getAllRecognisedCombinations().some((candidate) => signature(candidate) === signature(virtualTarget)),
      alternateNames: canonicalised.alternateNames,
      components: canonicalised.canonical.components ?? virtualTarget.components ?? [],
    };
  }

  return { displayName: query.trim(), recognised: false, alternateNames: [], components: [] };
}

export function reverseMorph(query: string): MorphReversalResult | null {
  const clean = query.trim();
  if (!clean) return null;
  const resolved = resolveTarget(clean);
  if (!resolved.target || resolved.components.length === 0) return null;

  const loci = aggregateComponents(expandMorphToComponents(resolved.target));
  const underlyingLoci: ReverseLocusRequirement[] = [];

  for (const [geneId, copiesValue] of loci) {
    const definition = getMorphByGeneId(geneId);
    if (!definition || !definition.isGene) continue;
    const copies = Math.max(1, Math.min(2, copiesValue)) as 1 | 2;
    const nonMendelian = !supportsMendelianRoutes(definition.inheritance);
    underlyingLoci.push({
      geneId,
      name: definition.name,
      inheritance: definition.inheritance,
      copies,
      expressedState: nonMendelian ? "Trait" : stateLabel(definition.inheritance, copies) as "Het" | "Visual" | "Super",
      routes: buildRoutes(definition.inheritance, copies),
    });
  }

  const directComponents = Array.from(aggregateComponents(resolved.target.components ?? resolved.components).entries()).map(([morphId, copies]) => ({
    morphId,
    name: getMorphByGeneId(morphId)?.name ?? morphId,
    copies,
  }));

  const hasNonMendelian = underlyingLoci.some((locus) => !supportsMendelianRoutes(locus.inheritance));

  return {
    query: clean,
    canonicalName: resolved.displayName,
    target: resolved.target,
    recognised: resolved.recognised,
    directComponents,
    underlyingLoci,
    tree: buildTreeFromDefinition(resolved.target),
    alternateNames: resolved.alternateNames,
    caveat: hasNonMendelian
      ? "Genetic reconstruction only. Mendelian parent routes are shown only for supported single-locus inheritance; polygenic, line-bred and unresolved traits are not assigned artificial probabilities. A combination name does not create a new gene."
      : "Genetic reconstruction only. A combo phenotype can have multiple valid breeding routes; each listed locus must be satisfied for the complete phenotype. This does not establish unique historical parentage.",
  };
}
