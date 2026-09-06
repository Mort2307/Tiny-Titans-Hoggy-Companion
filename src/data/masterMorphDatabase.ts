import { morphs as canonicalMorphs, type MorphDefinition } from "./morphs";
import { hognoseMorphCatalog, type MorphReferenceEntry } from "./hognoseMorphCatalog";
import { morphReferenceAdditions } from "./morphReferenceAdditions";
import { fullHognoseMorphTaxonomy, type FullMorphTaxonomyEntry } from "./hognoseMorphFullTaxonomy";
import { resolveRegionalMorphName } from "./morphRegionalTerminology";
import { morphSourceAuditByName } from "./morphSourceAudit";
import { resolveMorphEvidenceSources, type MorphEvidenceSourceDefinition } from "./morphEvidenceSources";
import { enrichMorphDatabase, type MorphIntelligenceMetadata, type MorphEvidenceLevel } from "./morphIntelligence";

export type MasterMorphDefinition = MorphDefinition & MorphIntelligenceMetadata & {
  sourceUrl?: string;
  sourceLabel?: string;
  sourceLinks?: MorphEvidenceSourceDefinition[];
  evidenceStatus?: string;
  evidenceNote?: string;
  contains?: string[];
  taxonomyStatus?: FullMorphTaxonomyEntry["taxonomyStatus"];
};

const normalise = (value: string) => value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
const identityKey = (value: string) => normalise(value).replace(/[^a-z0-9']/g, "");

const referenceTrait = (
  name: string,
  inheritance: MorphDefinition["inheritance"] = "Unknown",
  hetPossible = false,
  aliases: string[] = [],
): MorphReferenceEntry => ({
  geneId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, aliases, kind: "Gene", isGene: true,
  category: "MorphMarket Trait", inheritance, hetPossible, verification: "Recognised",
  description: `Reference trait listed in the Western Hognose MorphMarket catalogue: ${name}.`,
  educationalNotes: "Reference entry. Confirm lineage/genetic status before treating it as a confirmed breeding locus.",
  sourceUrl: "https://www.morphmarket.com/all/c/reptiles/colubrids/hognose-snakes/traits", sourceLabel: "MorphMarket trait index"
});

const morphMarketTraits: MorphReferenceEntry[] = [
  referenceTrait("Albino", "Recessive", true), referenceTrait("Arctic", "Incomplete Dominant"), referenceTrait("Axanthic", "Recessive", true),
  referenceTrait("Banded"), referenceTrait("Blond"), referenceTrait("Caramel", "Recessive", true), referenceTrait("Chocolate"),
  referenceTrait("Cinnamon", "Dominant"), referenceTrait("Citrus", "Polygenic"), referenceTrait("Conda", "Incomplete Dominant"),
  referenceTrait("Diablo", "Polygenic"), referenceTrait("Dinker"), referenceTrait("Dutch Hypo", "Recessive", true), referenceTrait("Evans Hypo", "Recessive", true),
  referenceTrait("Extreme Red", "Polygenic"), referenceTrait("Green Hypo"), referenceTrait("Green Phase", "Polygenic"), referenceTrait("Import"),
  referenceTrait("Jaguar"), referenceTrait("Jungle"), referenceTrait("Lavender", "Recessive", true), referenceTrait("Lemon Ghost", "Polygenic"),
  referenceTrait("Lemon Hypo"), referenceTrait("Leucistic", "Recessive", true), referenceTrait("Mocha", "Polygenic"), referenceTrait("Motley"),
  referenceTrait("Wild Type", "Unknown", false, ["Normal", "Wildtype", "Wild"]), referenceTrait("Orange Albino", "Polygenic"), referenceTrait("Other Trait"),
  referenceTrait("Paradox"), referenceTrait("Pink Pastel Albino", "Recessive", true), referenceTrait("Pistachio", "Recessive", true),
  referenceTrait("Purple Line", "Line-bred"), referenceTrait("RBE Pastel", "Polygenic"), referenceTrait("Reverse Stripe"), referenceTrait("Sable", "Recessive", true),
  referenceTrait("Shadow", "Polygenic"), referenceTrait("Skullface"), referenceTrait("Smoke Hypo"), referenceTrait("Spider", "Polygenic"),
  referenceTrait("Swiss Chocolate", "Recessive", true), referenceTrait("Tiger", "Polygenic"), referenceTrait("Toffee Belly", "Recessive", true),
  referenceTrait("True Hypo", "Recessive", true), referenceTrait("Yellow Glow")
];

function applyEvidenceMetadata(morph: MasterMorphDefinition): MasterMorphDefinition {
  const evidence = morphSourceAuditByName.get(normalise(morph.name));
  const sourceLinks = evidence ? resolveMorphEvidenceSources(evidence.sources) : [];
  const canonicalEvidenceForCinnamon = normalise(morph.name) === "cinnamon";
  if (!evidence && !morph.sourceUrl && sourceLinks.length === 0) return morph;
  return {
    ...morph,
    ...(canonicalEvidenceForCinnamon ? { inheritance: "Dominant" as const } : {}),
    ...(evidence ? {
      evidenceStatus: evidence.status,
      evidenceNote: evidence.note,
      sourceLinks,
      sourceUrl: sourceLinks[0]?.url ?? morph.sourceUrl,
      sourceLabel: sourceLinks[0]?.label ?? morph.sourceLabel,
    } : {}),
  };
}

function mergeMorphs(canonical: MorphDefinition[], reference: Array<MorphReferenceEntry | FullMorphTaxonomyEntry>): MasterMorphDefinition[] {
  const result: MasterMorphDefinition[] = canonical.map((morph) => applyEvidenceMetadata(morph as MasterMorphDefinition));
  const identities = new Set<string>();
  for (const morph of result) {
    [morph.geneId, morph.name, ...(morph.aliases ?? [])].forEach((value) => identities.add(identityKey(value)));
  }

  for (const rawEntry of reference) {
    const entry = applyEvidenceMetadata(rawEntry as MasterMorphDefinition);
    const entryIdentities = [entry.geneId, entry.name, ...(entry.aliases ?? [])].map(identityKey).filter(Boolean);
    if (entryIdentities.some((key) => identities.has(key))) continue;
    result.push(entry);
    entryIdentities.forEach((key) => identities.add(key));
  }
  return result;
}

const mergedMorphs = mergeMorphs(
  canonicalMorphs,
  [...hognoseMorphCatalog, ...morphReferenceAdditions, ...fullHognoseMorphTaxonomy, ...morphMarketTraits],
);

export const masterMorphs: MasterMorphDefinition[] = enrichMorphDatabase(mergedMorphs) as MasterMorphDefinition[];

export function resolveMasterMorph(value: string): MasterMorphDefinition | undefined {
  const query = identityKey(value);
  const regionalId = resolveRegionalMorphName(value);
  if (regionalId) {
    const regional = masterMorphs.find((morph) => identityKey(morph.geneId) === identityKey(regionalId));
    if (regional) return regional;
  }
  return masterMorphs.find((morph) =>
    identityKey(morph.geneId) === query ||
    identityKey(morph.name) === query ||
    (morph.searchTerms ?? []).some((term) => identityKey(term) === query),
  );
}

export function getMasterMorphByGeneId(geneId: string): MasterMorphDefinition | undefined {
  return masterMorphs.find((morph) => identityKey(morph.geneId) === identityKey(geneId));
}

export function getMasterMorphByName(name: string): MasterMorphDefinition | undefined {
  return resolveMasterMorph(name);
}

function hasConfirmedEvidence(morph: MasterMorphDefinition): boolean {
  return morph.evidenceStatus === "confirmed" || morph.verification === "Confirmed";
}

function isCalculatorEligible(morph: MasterMorphDefinition): boolean {
  if (morph.isProject || morph.kind === "Line-bred" || morph.kind === "Polygenic") return false;
  if (morph.verification === "Disputed" || morph.verification === "Unverified") return false;
  if (morph.kind === "Gene") return morph.isGene && hasConfirmedEvidence(morph);
  if (morph.kind === "Super") {
    const components = morph.components;
    if (!components?.length) return false;
    return components.every((component) => {
      const base = resolveMasterMorph(component.morphId);
      return Boolean(base && base.kind === "Gene" && base.isGene && hasConfirmedEvidence(base));
    });
  }
  if (morph.kind === "Combination") {
    const components = morph.components;
    if (!components?.length) return false;
    return components.every((component) => {
      const base = resolveMasterMorph(component.morphId);
      return Boolean(base && isCalculatorEligible(base));
    }) && morph.evidenceStatus === "confirmed";
  }
  return false;
}

export function getMasterHetGenes(): MasterMorphDefinition[] {
  return masterMorphs.filter((morph) => isCalculatorEligible(morph) && morph.isGene && morph.kind === "Gene" && morph.hetPossible === true);
}

export function getMasterVisualMorphs(): MasterMorphDefinition[] {
  return masterMorphs.filter((morph) =>
    (morph.kind === "Gene" || morph.kind === "Super" || morph.kind === "Combination" || morph.kind === "Line-bred" || morph.kind === "Polygenic") &&
    !morph.isProject && morph.verification !== "Disputed" && morph.verification !== "Unverified"
  );
}

export function getMasterCalculatorMorphs(): MasterMorphDefinition[] {
  return masterMorphs.filter(isCalculatorEligible);
}

export function getMorphEvidence(morph: MasterMorphDefinition): {
  status: string;
  note?: string;
  sources: MorphEvidenceSourceDefinition[];
} {
  const evidence = morphSourceAuditByName.get(normalise(morph.name));
  return {
    status: evidence?.status ?? morph.evidenceStatus ?? "unknown",
    note: evidence?.note ?? morph.evidenceNote,
    sources: evidence ? resolveMorphEvidenceSources(evidence.sources) : (morph.sourceLinks ?? []),
  };
}

export type { MorphEvidenceLevel };
