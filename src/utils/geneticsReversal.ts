import {
  findMorph,
  getCombinations,
  getMorphByGeneId,
  type InheritanceType,
  type MorphDefinition,
  type MorphComponent,
} from "../data/morphs";
import { expandMorphToComponents, resolveMorphSelection } from "./morphResolver";

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
  expressedState: "Het" | "Visual" | "Super";
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
  if (copies === 0) return 0;
  if (copies === 1) return 0.5;
  return 1;
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
  if (inheritance === "Dominant") return copies === 2 ? "Visual" : "Het";
  if (inheritance === "Polygenic") return "Trait present";
  if (inheritance === "Line-bred") return "Line-bred trait";
  return copies === 2 ? "Visual" : "Present";
}

function routeState(inheritance: InheritanceType, copies: 0 | 1 | 2): ReverseParentState {
  return { copies, label: stateLabel(inheritance, copies) };
}

function buildRoutes(inheritance: InheritanceType, targetCopies: 1 | 2): ReverseParentRoute[] {
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

  return routes.sort((a, b) => {
    if (b.childProbability !== a.childProbability) return b.childProbability - a.childProbability;
    return a.mother.copies + a.father.copies - (b.mother.copies + b.father.copies);
  });
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
      children.push({
        id: component.morphId,
        name: referenced?.name ?? component.morphId,
        kind: referenced?.kind ?? "Unknown",
        copies: componentCopies,
        children: [],
      });
      continue;
    }

    children.push(buildTreeFromDefinition(referenced, componentCopies, nextVisited));
  }

  return {
    id: definition.geneId,
    name: definition.name,
    kind: definition.kind,
    copies,
    children,
  };
}

function signature(definition: MorphDefinition): string {
  return Array.from(aggregateComponents(expandMorphToComponents(definition)).entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([geneId, copies]) => `${geneId}:${copies}`)
    .join("|");
}

function getCanonicalCombination(definition: MorphDefinition): { canonical: MorphDefinition; alternateNames: string[] } {
  const matches = getCombinations()
    .filter((candidate) => signature(candidate) === signature(definition))
    .sort((a, b) => {
      const verificationRank = (value: MorphDefinition["verification"]): number => {
        if (value === "Confirmed") return 0;
        if (value === "Recognised") return 1;
        if (value === "Unverified") return 2;
        return 3;
      };
      return (
        verificationRank(a.verification) - verificationRank(b.verification) ||
        (b.components?.length ?? 0) - (a.components?.length ?? 0) ||
        a.name.localeCompare(b.name)
      );
    });

  return {
    canonical: matches[0] ?? definition,
    alternateNames: matches.slice(1).map((candidate) => candidate.name),
  };
}

function resolveTarget(query: string): {
  target?: MorphDefinition;
  displayName: string;
  recognised: boolean;
  alternateNames: string[];
  components: MorphComponent[];
} {
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
    if (resolved.components.length === 0) {
      return { displayName: query.trim(), recognised: false, alternateNames: [], components: [] };
    }

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

    const matches = getCombinations().filter((candidate) => signature(candidate) === signature(virtualTarget));
    if (matches.length > 0) {
      const canonicalised = getCanonicalCombination(matches[0]);
      return {
        target: canonicalised.canonical,
        displayName: canonicalised.canonical.name,
        recognised: true,
        alternateNames: canonicalised.alternateNames,
        components: canonicalised.canonical.components ?? [],
      };
    }

    return {
      target: virtualTarget,
      displayName: resolved.displayName,
      recognised: false,
      alternateNames: [],
      components: resolved.components,
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
    underlyingLoci.push({
      geneId,
      name: definition.name,
      inheritance: definition.inheritance,
      copies,
      expressedState: stateLabel(definition.inheritance, copies) as "Het" | "Visual" | "Super",
      routes: buildRoutes(definition.inheritance, copies),
    });
  }

  const directComponents = Array.from(aggregateComponents(resolved.target.components ?? resolved.components).entries()).map(([morphId, copies]) => ({
    morphId,
    name: getMorphByGeneId(morphId)?.name ?? morphId,
    copies,
  }));

  return {
    query: clean,
    canonicalName: resolved.displayName,
    target: resolved.target,
    recognised: resolved.recognised,
    directComponents,
    underlyingLoci,
    tree: buildTreeFromDefinition(resolved.target),
    alternateNames: resolved.alternateNames,
    caveat: "This is a genetic reconstruction, not a claim of unique parentage. A combo phenotype can have multiple valid breeding routes; every listed locus must be satisfied for the whole phenotype.",
  };
}
