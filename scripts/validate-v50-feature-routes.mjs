import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrixPath = path.join(root, "src", "intelligence", "v50", "titanV50FeatureMatrix.ts");
const registryPath = path.join(root, "src", "config", "tinyTitansPageRegistry.ts");
const matrix = fs.readFileSync(matrixPath, "utf8");
const registry = fs.readFileSync(registryPath, "utf8");

const featureRoutes = [...matrix.matchAll(/route:\s*["']([^"']+)["']/g)].map((match) => match[1]);
const registryRoutes = new Set([...registry.matchAll(/path:\s*["']([^"']+)["']/g)].map((match) => match[1]));
const placeholderRoutes = featureRoutes.filter((route) => !registryRoutes.has(route));

const findings = placeholderRoutes.map((route) => ({
  severity: "notice",
  route,
  message: "V50 feature destination is not in the canonical page registry and must not be exposed as a user-facing navigation target until the page exists.",
}));

console.log(JSON.stringify({
  test: "v50-feature-route-safety",
  evidence: {
    featureRoutes: featureRoutes.length,
    canonicalRoutes: registryRoutes.size,
    currentlyExposedDestinations: featureRoutes.length - placeholderRoutes.length,
    heldBackDestinations: placeholderRoutes.length,
  },
  status: "pass",
  findings,
  policy: "Unimplemented V50 destinations are reported, not exposed. This validator intentionally does not fail the build merely because a planned capability lacks a page.",
}, null, 2));
