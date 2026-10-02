import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`[universal-integrations] ${message}`); };

const checks = [
  ["src/types/Snake.ts", /universalSpeciesId\?: string/, "Keeper reptile records must carry a canonical universal species ID."],
  ["src/components/SnakeForm.tsx", /findUniversalSpecies/, "Keeper reptile species selection must resolve into the universal species registry."],
  ["src/pages/RescuePages.tsx", /UniversalSpeciesPicker/, "Rescue intake must use the universal species picker."],
  ["src/pages/RescuePages.tsx", /universalSpeciesId: universalSpecies\?\.id/, "Rescue intake must persist the canonical species ID."],
  ["src/pages/RescuePublicProfile.tsx", /species\/.+universalSpeciesId|findUniversalSpecies/, "Public Rescue profiles must expose canonical species intelligence."],
  ["src/pages/RescueAnimalRoute.tsx", /universalSpeciesId/, "Public Rescue animal profiles must carry canonical species identity."],
  ["src/pages/PaidMarketplaceFeature.tsx", /UniversalSpeciesPicker/, "Seller/Business listing tools must use the universal species picker."],
  ["functions/paidMarketplace.js", /exports\.getPublicMarketplaceListings/, "Public marketplace backend listing function must exist."],
  ["functions/index.js", /require\("\.\/paidMarketplace"\)/, "Marketplace backend functions must be exported from the Functions index."],
  ["src/services/publicMarketplaceService.ts", /getPublicMarketplaceListings/, "Frontend marketplace service must call the public marketplace backend."],
  ["src/pages/Marketplace.tsx", /findUniversalSpecies/, "Public marketplace listings must resolve canonical species intelligence."],
  ["src/routes/AppRouter.tsx", /path="\/species"/, "Species Explorer must be publicly routable."],
  ["src/routes/AppRouter.tsx", /path="\/species\/:id"/, "Universal species profiles must be publicly routable."],
  ["src/routes/AppRouter.tsx", /path="\/marketplace"/, "Marketplace must be publicly routable."],
  ["src/routes/AuthenticatedRoutes.tsx", /path="\/species\/:id"/, "Authenticated users must retain the full app species profile route."],
  ["src/routes/AuthenticatedRoutes.tsx", /path="\/species\/group\/:group"/, "Authenticated users must be able to browse species by animal type."],
  ["src/routes/AuthenticatedRoutes.tsx", /path="\/animals"/, "Authenticated users must have a universal individual-animal collection route."],
  ["src/routes/AuthenticatedRoutes.tsx", /path="\/animals\/:id"/, "Authenticated users must have universal individual-animal profile routes."],
  ["src/pages/SpeciesExplorer.tsx", /UNIVERSAL_SPECIES_BROWSE_GROUPS/, "Species Explorer must expose human-facing browse groups."],
  ["src/pages/MyAnimals.tsx", /createUserAnimal/, "My Animals must use the universal individual-animal service."],
  ["src/intelligence/askTitan/titanChatContracts.ts", /speciesReference\?: TitanSpeciesReference/, "Ask Titan must accept canonical species context."],
  ["src/intelligence/askTitan/useTitanChat.ts", /buildSpeciesReference\(speciesId\)/, "Ask Titan client flow must package canonical species context."],
  ["functions/titanIntelligence.js", /APP_CATALOGUE_CONTEXT/, "Ask Titan backend must carry the canonical species reference context."],
  ["functions/titanIntelligencePrompt.js", /APP_CATALOGUE_CONTEXT/, "Ask Titan prompt must preserve species evidence boundaries."],
  ["src/data/species/universalSpeciesCare.ts", /const genusRequirement/, "Every universal record must pass through genus-level resolution."],
  ["scripts/validate-universal-care.ts", /resolvedFrom\.length >= 3/, "Universal care validator must enforce provenance chains."],
];

for (const [relativePath, pattern, message] of checks) {
  const contentText = read(relativePath);
  assert(pattern.test(contentText), `${message} [${relativePath}]`);
}

const packageJson = JSON.parse(read("package.json"));
assert(typeof packageJson.scripts?.["validate:universal-care"] === "string", "Universal care validation script is missing from package.json.");
assert(packageJson.scripts?.test.includes("validate:universal-care"), "Universal care validator must run in the test contract.");
assert(packageJson.scripts?.build.includes("validate:universal-care"), "Universal care validator must run in the build contract.");

console.log("Universal integration contract OK: keeper, public species, marketplace, rescue, seller/business and Ask Titan paths all reference the shared universal species layer.");
