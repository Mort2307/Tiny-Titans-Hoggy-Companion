import type { MorphDefinition } from "../data/morphs";

/**
 * Defensive validation for the central morph database.
 *
 * This intentionally does not mutate the database. It catches the classes of
 * data errors that can cause selector cross-routing or incorrect calculations:
 * duplicate IDs, malformed components, invalid copy counts, missing underlying
 * genes for Super forms, and combinations that reference unknown components.
 */
export type MorphDatabaseIssue = {
  geneId?: string;
  message: string;
  severity: "error" | "warning";
};

export function validateMorphDatabase(morphs: MorphDefinition[]): MorphDatabaseIssue[] {
  const issues: MorphDatabaseIssue[] = [];
  const byId = new Map<string, MorphDefinition>();

  const add = (message: string, severity: MorphDatabaseIssue["severity"], geneId?: string) => {
    issues.push({ geneId, message, severity });
  };

  for (const morph of morphs) {
    const id = morph.geneId?.trim();
    if (!id) {
      add("Morph has no stable geneId.", "error");
      continue;
    }

    const key = id.toLowerCase();
    if (byId.has(key)) {
      add(`Duplicate geneId detected: ${id}.`, "error", id);
      continue;
    }
    byId.set(key, morph);

    if (!morph.name?.trim()) add("Morph has no display name.", "error", id);

    if (morph.isGene && morph.kind !== "Gene") {
      add(`isGene=true but kind is ${morph.kind}; gene identity is inconsistent.`, "error", id);
    }

    if (morph.kind === "Gene" && !morph.isGene) {
      add("kind=Gene but isGene=false.", "error", id);
    }

    if (morph.kind === "Super") {
      if (!morph.superFormId?.trim()) {
        add("Super form is missing superFormId.", "error", id);
      }
      if (!morph.components?.length) {
        add("Super form is missing its underlying component definition.", "error", id);
      }
    }

    if (morph.kind === "Combination" && !morph.components?.length) {
      add("Combination has no underlying components.", "error", id);
    }

    for (const component of morph.components ?? []) {
      const componentId = component.morphId?.trim();
      if (!componentId) {
        add("Component is missing morphId.", "error", id);
        continue;
      }

      const copies = component.copies;
      if (copies !== undefined && (!Number.isInteger(copies) || copies < 1 || copies > 2)) {
        add(`Component ${componentId} has invalid copy count ${String(copies)}; expected 1 or 2.`, "error", id);
      }
    }

    const aliasKeys = new Set<string>();
    for (const alias of morph.aliases ?? []) {
      const aliasKey = alias.trim().toLowerCase();
      if (!aliasKey) {
        add("Morph contains an empty alias.", "warning", id);
        continue;
      }
      if (aliasKey === key || aliasKeys.has(aliasKey)) {
        add(`Alias duplicates the morph identity or another alias: ${alias}.`, "warning", id);
      }
      aliasKeys.add(aliasKey);
    }

    if (morph.isProject && morph.verification === "Confirmed") {
      add("Project is marked Confirmed; projects should not enter confirmed calculator genetics.", "warning", id);
    }
  }

  for (const morph of morphs) {
    for (const component of morph.components ?? []) {
      const referenced = byId.get(component.morphId.trim().toLowerCase());
      if (!referenced) {
        add(`Component references unknown morphId: ${component.morphId}.`, "error", morph.geneId);
      }
    }

    if (morph.superFormId && !byId.has(morph.superFormId.trim().toLowerCase())) {
      add(`superFormId references unknown geneId: ${morph.superFormId}.`, "error", morph.geneId);
    }
  }

  return issues;
}

export function assertValidMorphDatabase(morphs: MorphDefinition[]): void {
  const errors = validateMorphDatabase(morphs).filter((issue) => issue.severity === "error");
  if (!errors.length) return;

  throw new Error(
    `Tiny Titans morph database validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}). ${errors
      .slice(0, 5)
      .map((issue) => `${issue.geneId ? `${issue.geneId}: ` : ""}${issue.message}`)
      .join(" | ")}`,
  );
}
