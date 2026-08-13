import type { MorphDefinition } from "../data/morphs";

export interface MorphValidationIssue {
  geneId: string;
  message: string;
}

/**
 * Validates the morph database structure without deciding whether a disputed
 * real-world morph is biologically correct. Unknown/disputed entries are kept
 * out of confirmed genetics by their verification status.
 */
export function validateMorphDatabase(
  morphs: MorphDefinition[]
): MorphValidationIssue[] {
  const issues: MorphValidationIssue[] = [];
  const byId = new Map<string, MorphDefinition>();
  const names = new Map<string, string>();

  for (const morph of morphs) {
    const id = morph.geneId.trim().toLowerCase();
    const name = morph.name.trim().toLowerCase();

    if (!id) {
      issues.push({ geneId: morph.geneId, message: "Missing geneId." });
      continue;
    }

    if (byId.has(id)) {
      issues.push({ geneId: morph.geneId, message: `Duplicate geneId: ${morph.geneId}.` });
    } else {
      byId.set(id, morph);
    }

    if (!name) {
      issues.push({ geneId: morph.geneId, message: "Missing display name." });
    } else if (names.has(name)) {
      issues.push({ geneId: morph.geneId, message: `Duplicate display name: ${morph.name}.` });
    } else {
      names.set(name, morph.geneId);
    }

    if (morph.kind === "Gene" && !morph.isGene) {
      issues.push({ geneId: morph.geneId, message: "Gene kind must have isGene=true." });
    }

    if (morph.kind !== "Gene" && morph.isGene) {
      issues.push({ geneId: morph.geneId, message: `${morph.kind} entries must have isGene=false.` });
    }

    if (morph.kind === "Combination" && !morph.isCombination) {
      issues.push({ geneId: morph.geneId, message: "Combination kind must have isCombination=true." });
    }

    if (morph.kind === "Project" && !morph.isProject) {
      issues.push({ geneId: morph.geneId, message: "Project kind must have isProject=true." });
    }

    if (morph.kind === "Super") {
      if (!morph.superFormId) {
        issues.push({ geneId: morph.geneId, message: "Super form is missing superFormId." });
      } else {
        const base = byId.get(morph.superFormId.trim().toLowerCase());
        if (base && (base.kind !== "Gene" || !base.isGene)) {
          issues.push({ geneId: morph.geneId, message: "Super form must reference a genuine Gene." });
        }
      }
    } else if (morph.superFormId) {
      issues.push({ geneId: morph.geneId, message: "Only Super entries may define superFormId." });
    }

    for (const component of morph.components ?? []) {
      const componentId = component.morphId.trim().toLowerCase();
      const target = byId.get(componentId);
      if (!target) {
        issues.push({ geneId: morph.geneId, message: `Unknown component morphId: ${component.morphId}.` });
      }
      if (component.copies !== undefined && (!Number.isInteger(component.copies) || component.copies < 1)) {
        issues.push({ geneId: morph.geneId, message: `Invalid component copy count for ${component.morphId}.` });
      }
    }
  }

  return issues;
}
