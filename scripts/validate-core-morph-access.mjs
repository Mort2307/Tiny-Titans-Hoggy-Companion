import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];
const requireText = (file, text, reason) => { if (!read(file).includes(text)) failures.push(file + ": " + reason); };
const forbidText = (file, text, reason) => { if (read(file).includes(text)) failures.push(file + ": " + reason); };

const layout = read("src/components/Layout/LayoutChrome.tsx");
const routes = read("src/routes/AuthenticatedRoutes.tsx");
const tiers = read("src/config/paidTiers.ts");
const quickNav = read("src/data/quickNavigation.ts");
const library = read("src/pages/SpeciesMorphLibrary.tsx");
const proposal = read("src/components/morph-library/NewMorphSubmissionDialog.tsx");
const proposalService = read("src/services/morphUserSubmissionService.ts");
const rules = read("firestore.rules");

requireText("src/config/paidTiers.ts", 'const COMMON: PaidEntitlement[] = ["core_tracking", "core_genetics", "core_learning", "core_community"]', "core genetics must remain part of the shared entitlement set used by Free through Rescue");
requireText("src/config/paidTiers.ts", 'free: {', "the Free Keeper tier must remain present");
requireText("src/routes/AuthenticatedRoutes.tsx", '<Route path="/morph-library" element={<SpeciesAwareMorphLibrary/>}/>', "the core Morph Library route must remain an ordinary authenticated route");
requireText("src/routes/AuthenticatedRoutes.tsx", '<Route path="/morph-library/:morphId/gallery" element={<SpeciesMorphGallery/>}/>', "Morph Galleries must remain ordinary authenticated routes");
requireText("src/routes/AuthenticatedRoutes.tsx", '<Route path="/morph-library/:morphId" element={<SpeciesMorphDetail/>}/>', "Morph detail pages must remain ordinary authenticated routes");
requireText("src/components/Layout/LayoutChrome.tsx", 'isSpeciesAwareMorphLibrary ? (', "the core Morph Library must render directly in the shared shell");
requireText("src/components/Layout/LayoutChrome.tsx", 'pathname === "/morph-library/evidence"', "the premium evidence workspace must be identified explicitly");
requireText("src/components/Layout/LayoutChrome.tsx", '? "morph_intelligence"', "only the evidence/intelligence workspace should use the morph_intelligence paid entitlement");
requireText("src/components/Layout/LayoutChrome.tsx", "isMorphEvidencePage ? null", "the evidence workspace must not be swallowed by the generic morph-detail matcher");
requireText("src/pages/SpeciesMorphLibrary.tsx", "Suggest a morph / variation card", "all signed-in keepers must have the variation-card proposal action");
requireText("src/pages/SpeciesMorphLibrary.tsx", "Contribute Wild Type / Unclassified image", "all signed-in keepers must have the baseline image contribution action");
requireText("src/components/morph-library/NewMorphSubmissionDialog.tsx", "COMMUNITY VARIATION PROPOSAL", "the universal variation proposal surface must remain available");
requireText("src/services/morphUserSubmissionService.ts", 'collection(db, "variationCardSubmissions")', "variation proposals must use the shared moderated queue rather than a paid workspace");
requireText("firestore.rules", "match /variationCardSubmissions/{submissionId}", "variation proposals need an explicit signed-in-user submission boundary");
requireText("firestore.rules", "allow create: if signedIn()", "variation proposals must be creatable by signed-in keepers without a tier claim");
requireText("src/services/creatorUserMorphSubmissionService.ts", "calculatorEligible: false", "community-card approval must never auto-promote a card into the genetics calculator");

forbidText("src/pages/SpeciesMorphLibrary.tsx", "PaidTierGate", "the core Morph & Variation Library must never be paywalled");
forbidText("src/components/morph-library/NewMorphSubmissionDialog.tsx", "PaidTierGate", "variation-card proposals must never be paywalled");
forbidText("src/services/morphUserSubmissionService.ts", "getPaidAccess", "variation submissions must not depend on paid-tier lookup");
forbidText("src/services/morphUserSubmissionService.ts", "effectiveTier", "variation submissions must not depend on paid-tier identity");

const morphNavLine = quickNav.split("\n").find((line) => line.includes('path: "/morph-library"') && line.includes('id: "morphs"')) || "";
if (!morphNavLine) failures.push("src/data/quickNavigation.ts: core Morph Library navigation entry is missing");
if (/capability:|entitlement:|tier:/i.test(morphNavLine)) failures.push("src/data/quickNavigation.ts: core Morph Library navigation must not have a capability/tier gate");

const routeSlice = routes.slice(routes.indexOf('<Route path="/morph-library"'), routes.indexOf('<Route path="/calculator"'));
if (/PaidTierGate|RequireCapability|CreatorRouteGuard/.test(routeSlice)) failures.push("src/routes/AuthenticatedRoutes.tsx: core Morph Library/detail/gallery routes must not be wrapped in paid/capability guards");

if (!layout.includes('pathname === "/morph-library/evidence"') || !layout.includes('"morph_intelligence"')) {
  failures.push("src/components/Layout/LayoutChrome.tsx: premium Morph Intelligence evidence route boundary is missing");
}

console.log("Core Morph & Variation access contract: " + (failures.length ? "FAIL" : "PASS"));
if (failures.length) {
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Policy: Free Keeper through Rescue can browse the core species Morph & Variation Library, view galleries, contribute approved imagery and submit variation-card proposals.");
console.log("Policy: /morph-library/evidence remains the separate paid Morph Intelligence workspace.");
