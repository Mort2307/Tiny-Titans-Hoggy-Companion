import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];

function requireText(file, text, reason) {
  if (!read(file).includes(text)) failures.push(`${file}: ${reason}`);
}

function forbidText(file, text, reason) {
  if (read(file).includes(text)) failures.push(`${file}: ${reason}`);
}

requireText("src/components/Layout/LayoutChrome.tsx", "SpeciesAwareMorphLibrary", "the /morph-library shell must use the species-aware library entry point");
requireText("src/components/Layout/Layout.tsx", "SpeciesContextRouteSync", "the provider shell must include the species route synchronisation layer");
requireText("src/components/SnakeTile.tsx", "setSelectedSpeciesId", "snake selection must establish species context before navigation");
requireText("src/components/SnakeTile.tsx", "findSnakeSpecies", "snake selection must resolve persisted species through the canonical registry");
requireText("src/pages/SpeciesMorphLibrary.tsx", "getSpeciesVisualMorphs", "the non-Hognose Morph Library must consume species-scoped genetics");
requireText("src/pages/SpeciesMorphLibrary.tsx", "getSpeciesGeneticsStatus", "the Morph Library must expose honest species genetics coverage");
requireText("src/pages/Calculator.tsx", "getSpeciesGeneticsStatus", "the calculator must gate itself on species genetics coverage");
requireText("src/pages/Calculator.tsx", 'const geneticsEnabled = geneticsStatus !== "baseline-only"', "catalogued species must expose their own calculator engine while baseline-only species remain disabled");
requireText("src/data/species/speciesGenetics.ts", "SPECIES_GENETICS_CATALOGUES", "species genetics must be backed by the dedicated species catalogue registry");
requireText("src/data/species/speciesGenetics.ts", "UNIVERSAL_SPECIES_BY_ID", "morph/variation libraries must resolve against the universal species catalogue");
requireText("src/data/species/speciesGenetics.ts", "SPECIES_GENETICS_EXPANSION_BATCH_2", "existing species genetics expansion batches must feed the live catalogue");
requireText("src/data/species/speciesGenetics.ts", "SPECIES_GENETICS_EXPANSION_BATCH_3", "existing species genetics expansion batches must feed the live catalogue");
requireText("src/components/SpeciesContextBar.tsx", "UniversalSpeciesPicker", "the working species selector must expose the universal animal catalogue");
requireText("src/pages/SpeciesMorphLibrary.tsx", "community submissions", "the Morph Library must state its community-only image policy");
requireText("src/data/species/speciesGenetics.ts", '"mapped" | "partial" | "baseline-only"', "genetics coverage must distinguish full, partial and baseline-only species records");

requireText("src/components/morph-library/NewMorphSubmissionDialog.tsx", "UniversalSpeciesPicker", "morph/variation proposals must support the universal species catalogue");
requireText("src/services/morphUserSubmissionService.ts", "findUniversalSpecies", "user variation proposals must validate against the universal species registry");
requireText("src/components/SpeciesMorphCommunityContribution.tsx", "Suggest morph / variation card", "species libraries must expose the reviewed variation-card proposal path");
requireText("src/services/creatorUserMorphSubmissionService.ts", "calculatorEligible: false", "approving a community variation card must not promote it into genetics automatically");
requireText("src/pages/SpeciesMorphLibrary.tsx", "getApprovedCommunityVariationCards", "approved community variation cards must render in species libraries");
requireText("firestore.rules", "approvedMorphVariations", "approved variation cards need an explicit public-read / creator-write security boundary");

forbidText("src/components/Layout/Header.tsx", "Hoggy Companion", "the in-app brand must be Tiny Titans Reptile Companion");
forbidText("src/components/PwaInstallCard.tsx", "Install Tiny Titans</h3>", "the PWA install surface must use the new app name");
forbidText("src/components/PwaInstallCard.tsx", "Hoggy Companion", "the PWA install surface must not retain the old product name");
forbidText("src/pages/SpeciesMorphLibrary.tsx", "masterMorphDatabase", "species Morph Library must not import the Hognose master database directly");
forbidText("src/data/species/speciesGenetics.ts", "imageUrl:", "catalogue genetics data must not embed or copy reference images");

console.log(`Species genetics contract: ${failures.length ? "FAIL" : "PASS"}`);
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
