import type { TesterCheck } from "./testerBotService";
import {
  APP_SURFACES,
  createApplicationCoverageChecks,
} from "./testerApplicationSuitesService";
import { createCoreDiagnosticChecks } from "./testerBotService";
import { createNotificationMicroSystemChecks } from "./testerNotificationSuitesService";
import { createMorphLibraryChecks } from "./testerGeneticsSuitesService";
import { createCreatorFunctionChecks } from "./testerCreatorSuitesService";
import { createFamilyAccountChecks } from "./testerFamilySuitesService";
import { createTrackerRegressionChecks } from "./testerSuitesService";

export type UpdateTarget = {
  id: string;
  label: string;
  path: string;
};

export const UPDATE_TARGETS: UpdateTarget[] = APP_SURFACES.map(([path]) => ({
  id: path
    .replace(/^\//, "root-")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "root",
  label: path === "/" ? "Home / Dashboard" : path,
  path,
}));

function duplicatePaths(paths: string[]): string[] {
  return [...new Set(paths.filter((path, index) => paths.indexOf(path) !== index))];
}

function buildPageCheck(target: UpdateTarget): TesterCheck {
  return {
    checkId: `page-${target.id}`,
    name: `Page target registered: ${target.label}`,
    category: "application",
    severity: "high",
    run: async () => {
      const matches = APP_SURFACES.filter(([path]) => path === target.path);
      if (matches.length !== 1) {
        return {
          status: "fail",
          message: `Expected exactly one registered target for ${target.path}; found ${matches.length}.`,
        };
      }
      return {
        status: "pass",
        message: `${target.path} is registered as a dedicated QA target. Browser-level render/click/persistence evidence remains a separate browser-runner gate.`,
      };
    },
  };
}

export function createAllPageTargetChecks(): TesterCheck[] {
  return [
    {
      checkId: "page-target-inventory-consistent",
      name: "Page target inventory is unique and non-empty",
      category: "application",
      severity: "critical",
      run: async () => {
        const paths = UPDATE_TARGETS.map((target) => target.path);
        const duplicates = duplicatePaths(paths);
        const empty = paths.filter((path) => !path.trim());
        if (duplicates.length) {
          return { status: "fail", message: `Duplicate page targets found: ${duplicates.join(", ")}.` };
        }
        if (empty.length) {
          return { status: "fail", message: "One or more page targets are empty." };
        }
        return {
          status: "pass",
          message: `${UPDATE_TARGETS.length} page targets are registered for targeted QA.`,
        };
      },
    },
    ...UPDATE_TARGETS.map(buildPageCheck),
  ];
}

export function createUpdateSmokeChecks(uid: string): TesterCheck[] {
  return [
    ...createApplicationCoverageChecks().filter((check) =>
      [
        "app-route-inventory-complete",
        "app-core-surfaces-covered",
        "app-tracker-surfaces-covered",
        "app-learning-surfaces-covered",
        "app-community-surfaces-covered",
        "app-creator-surfaces-covered",
      ].includes(check.checkId),
    ),
    ...createCoreDiagnosticChecks({ uid, authenticated: true, creatorClaim: true }).filter((check) =>
      ["auth-current-user", "auth-token-refresh", "account-profile-readable", "firebase-user-scope"].includes(check.checkId),
    ),
    ...createNotificationMicroSystemChecks(),
    ...createMorphLibraryChecks(),
    ...createTrackerRegressionChecks(uid),
    ...createCreatorFunctionChecks(),
    ...createFamilyAccountChecks(uid),
  ];
}
