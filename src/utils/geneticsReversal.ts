import { masterMorphs, resolveMasterMorph, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import { getCanonicalComposition, findCanonicalMorphForComposition } from "./canonicalGenetics";
import type { InheritanceType, MorphComponent } from "../data/morphs";

export type ReverseParentState = { copies: 0 | 1 | 2; label: string };
export type ReverseParentRoute = { mother: ReverseParentState; father: ReverseParentState; childProbability: number };
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
  kind: MasterMorphDefinition["kind"] | "Unknown";
  copies: number;
  children: ReverseTreeNode[];
};
export type MorphReversalResult = {
  query: string;
  canonicalName: string;
  target: MasterMorphDefinition;
  recognised: boolean;
  directComponents: Array<{ morphId: string; name: string; copies: number }>;
  underlyingLoci: ReverseLocusRequirement[];
  tree: ReverseTreeNode;
  alternateNames: string[];
  caveat: string;
};

const EPSILON = 0.000001;
const definitionFor = (geneId: string): MasterMorphDefinition | undefined => masterMorphs.find((entry) => entry.geneId === geneId);
function mutationAlleleProbability(copies: 0 | 1 | 2): number { return copies / 2; }
function childProbability(mother: 0 | 1 | 2, father: 0 | 1 | 2, target: 0 | 1 | 2): number {
  const m = mutationAlleleProbability(mother);
  const f = mutationAlleleProbability(father);
  return [(1 - m) * (1 - f), m * (1 - f) + (1 - m) * f, m * f][target] * 100;
}
function stateLabel(inheritance: InheritanceType, copies: 0 | 1 | 2): "Clear" | "Het" | "Visual" | "Super" | "Trait" {
  if (copies === 0) return "Clear";
  if (inheritance === "Recessive") return copies === 2 ? "Visual" : "Het";
  if (inheritance === "Incomplete Dominant") return copies === 2 ? "Super" : "Visual";
  if (inheritance === "Dominant") return "Visual";
  return "Trait";
}
function supportsMendelianRoutes(inheritance: InheritanceType): boolean {
  return inheritance === "Recessive" || inheritance === "Incomplete Dominant" || inheritance === "Dominant";
}
function routeState(inheritance: InheritanceType, copies: 0 | 1 | 2): ReverseParentState { return { copies, label: stateLabel(inheritance, copies) }; }
function buildRoutes(inheritance: InheritanceType, targetCopies: 1 | 2): ReverseParentRoute[] {
  if (!supportsMendelianRoutes(inheritance)) return [];
  const routes: ReverseParentRoute[] = [];
  const seen = new Set<string>();
  for (const mother of [0, 1, 2] as const) for (const father of [0, 1, 2] as const) {
    const probability = childProbability(mother, father, targetCopies);
    if (probability <= EPSILON) continue;
    const pairKey = `${Math.min(mother, father)}:${Math.max(mother, father)}`;
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);
    routes.push({ mother: routeState(inheritance, mother), father: routeState(inheritance, father), childProbability: probability });
  }
  return routes.sort((a, b) => b.childProbability - a.childProbability || (a.mother.copies + a.father.copies) - (b.mother.copies + b.father.copies));
}
function aggregateComponents(components: MorphComponent[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const component of components) map.set(component.morphId, (map.get(component.morphId) ?? 0) + (component.copies ?? 1));
  return map;
}
function buildTreeFromDefinition(definition: MasterMorphDefinition, copies = 1, visited = new Set<string>()): ReverseTreeNode {
  const children: ReverseTreeNode[] = [];
  const nextVisited = new Set(visited);
  nextVisited.add(definition.geneId);
  const direct = definition.components ?? [];
  for (const component of direct) {
    const referenced = definitionFor(component.morphId);
    const componentCopies = (component.copies ?? 1) * copies;
    if (!referenced || nextVisited.has(component.morphId)) {
      children.push({ id: component.morphId, name: referenced?.name ?? component.morphId, kind: referenced?.kind ?? "Unknown", copies: componentCopies, children: [] });
    } else {
      children.push(buildTreeFromDefinition(referenced, componentCopies, nextVisited));
    }
  }
  return { id: definition.geneId, name: definition.name, kind: definition.kind, copies, children };
}
function signatureFor(components: MorphComponent[]): string {
  return components
    .filter((component) => component.type === "Gene")
    .map((component) => `${component.morphId}:${component.copies ?? 1}`)
    .sort()
    .join("|");
}
function recognisedCombinations(): MasterMorphDefinition[] {
  return masterMorphs.filter((entry) => entry.kind === "Combination" && entry.verification !== "Unverified" && entry.verification !== "Disputed");
}
function canonicalByComposition(components: MorphComponent[]): { canonical?: MasterMorphDefinition; alternateNames: string[] } {
  const canonical = findCanonicalMorphForComposition(components);
  const sig = signatureFor(components);
  const matches = recognisedCombinations().filter((entry) => entry.geneticSignature === sig);
  const primary = canonical ?? matches[0];
  return { canonical: primary, alternateNames: matches.filter((entry) => entry.geneId !== primary?.geneId).map((entry) => entry.name) };
}
function resolveTarget(query: string): {
  target?: MasterMorphDefinition;
  displayName: string;
  recognised: boolean;
  alternateNames: string[];
  components: MorphComponent[];
} {
  const resolved = resolveMasterMorph(query);
  if (resolved) {
    const components = getCanonicalComposition(resolved);
    if (components.length) {
      const canonical = resolved.kind === "Combination" ? canonicalByComposition(components) : { canonical: resolved, alternateNames: [] };
      return {
        target: canonical.canonical ?? resolved,
        displayName: canonical.canonical?.name ?? resolved.name,
        recognised: resolved.verification !== "Unverified" && resolved.verification !== "Disputed",
        alternateNames: canonical.alternateNames,
        components,
      };
    }
    return { target: resolved, displayName: resolved.name, recognised: resolved.verification !== "Unverified" && resolved.verification !== "Disputed", alternateNames: [], components: resolved.components ?? [] };
  }

  const parts = query.split(/[+×x]/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const components: MorphComponent[] = [];
    for (const part of parts) {
      const candidate = resolveMasterMorph(part);
      if (!candidate) return { displayName: query.trim(), recognised: false, alternateNames: [], components: [] };
      components.push(...getCanonicalComposition(candidate));
    }
    const canonical = canonicalByComposition(components);
    const target = canonical.canonical ?? {
      geneId: `virtual:${signatureFor(components)}`,
      name: parts.join(" + "),
      aliases: [],
      kind: "Combination",
      isGene: false,
      isCombination: true,
      category: "Calculated combination",
      inheritance: "Unknown",
      hetPossible: false,
      components,
      verification: "Recognised",
      description: "A calculated genetic combination not yet assigned a dedicated database name.",
    };
    return { target, displayName: target.name, recognised: Boolean(canonical.canonical), alternateNames: canonical.alternateNames, components };
  }
  return { displayName: query.trim(), recognised: false, alternateNames: [], components: [] };
}

export function reverseMorph(query: string): MorphReversalResult | null {
  const clean = query.trim();
  if (!clean) return null;
  const resolved = resolveTarget(clean);
  if (!resolved.target || resolved.components.length === 0) return null;
  const loci = aggregateComponents(getCanonicalComposition(resolved.target));
  const underlyingLoci: ReverseLocusRequirement[] = [];
  for (const [geneId, copiesValue] of loci) {
    const definition = definitionFor(geneId);
    if (!definition?.isGene) continue;
    const copies = Math.max(1, Math.min(2, copiesValue)) as 1 | 2;
    underlyingLoci.push({
      geneId,
      name: definition.name,
      inheritance: definition.inheritance,
      copies,
      expressedState: stateLabel(definition.inheritance, copies) as ReverseLocusRequirement["expressedState"],
      routes: buildRoutes(definition.inheritance, copies),
    });
  }
  const directComponents = Array.from(aggregateComponents(resolved.target.components ?? resolved.components).entries()).map(([morphId, copies]) => ({ morphId, name: definitionFor(morphId)?.name ?? morphId, copies }));
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
      ? "Genetic reconstruction only. Mendelian parent routes are shown only for supported single-locus inheritance; polygenic, line-bred and unresolved traits are not assigned artificial probabilities."
      : "Genetic reconstruction only. A combo phenotype can have multiple valid breeding routes; each listed locus must be satisfied for the complete phenotype. This does not establish unique historical parentage.",
  };
}
