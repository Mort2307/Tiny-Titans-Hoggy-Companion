import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const main = read("src", "main.tsx");
const css = read("src", "styles", "mobile-product-system.css");
const experience = read("src", "styles", "mobile-experience-v2.css");
const index = read("index.html");
const header = read("src", "components", "Layout", "Header.tsx");
const quickView = read("src", "components", "Layout", "QuickModeNavigation.tsx");
const confirmDialog = read("src", "components", "ConfirmActionDialog.tsx");
const commandPalette = read("src", "components", "TitanCommandPalette", "TitanCommandPalette.tsx");
const myAnimals = read("src", "pages", "MyAnimals.tsx");
const universalAnimalsCss = read("src", "styles", "universal-animals.css");
const snakeProfileHero = read("src", "components", "SnakeProfile", "SnakeProfileHero.tsx");
const snakeProfileCss = read("src", "styles", "snake-profile.css");
const homeDashboard = read("src", "hooks", "useHomeDashboard.ts");
const homeCurrentAnimal = read("src", "components", "Home", "HomeCurrentAnimalSection.tsx");
const homeCss = read("src", "pages", "Home.css");
const marketplace = read("src", "pages", "Marketplace.tsx");
const settings = read("src", "pages", "Settings.tsx");
const pageRegistry = read("src", "config", "tinyTitansPageRegistry.ts");
const authenticatedRoutes = read("src", "routes", "AuthenticatedRoutes.tsx");
const updatePrompt = read("src", "components", "AppUpdatePrompt.tsx");
const updatePromptCss = read("src", "styles", "AppUpdatePrompt.css");
const pwaService = read("src", "services", "pwaUpdateService.ts");
const viteConfig = read("vite.config.ts");
const staticManifest = read("public", "manifest.webmanifest");
const errors = [];

const styleImports = [...main.matchAll(/^import "\.\/styles\/([^"]+\.css)";$/gm)].map((match) => match[1]);
if (!styleImports.includes("mobile-product-system.css")) {
  errors.push("src/main.tsx must import mobile-product-system.css.");
}
if (!styleImports.includes("mobile-experience-v2.css")) {
  errors.push("src/main.tsx must import mobile-experience-v2.css.");
}
if (styleImports.at(-1) !== "mobile-experience-v2.css") {
  errors.push("mobile-experience-v2.css must be the final shared style import so native mobile hierarchy wins over legacy CSS.");
}
if (styleImports.indexOf("mobile-product-system.css") > styleImports.indexOf("mobile-experience-v2.css")) {
  errors.push("mobile-product-system.css must load before mobile-experience-v2.css.");
}

if (!/viewport-fit=cover/.test(index)) {
  errors.push("index.html must retain viewport-fit=cover for mobile safe-area support.");
}
if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0+)?(?:[,"]|$)/i.test(index)) {
  errors.push("index.html must not disable user zoom.");
}

const cssContracts = [
  [/@media \(max-width: 800px\)/, "mobile breakpoint"],
  [/\.app-navigation\.tt-easy-nav-strip\s*\{[\s\S]*?position:\s*fixed;/, "fixed mobile Quick View dock"],
  [/env\(safe-area-inset-bottom\)/, "safe-area support"],
  [/\.tt-easy-more-backdrop\s*\{[\s\S]*?align-items:\s*flex-end;/, "mobile Everything bottom sheet"],
  [/\.tt-easy-search\s*\{[\s\S]*?position:\s*sticky;/, "sticky Everything search"],
  [/--tt-mobile-control-height:\s*48px;/, "48px mobile control target"],
  [/font-size:\s*16px;/, "16px mobile form controls"],
  [/overflow-x:\s*auto;/, "horizontal containment for dense data"],
  [/100dvh/, "dynamic viewport units"],
  [/\.tt-tracker-stat-grid/, "tracker mobile treatment"],
  [/\.snake-profile-quickbar/, "animal profile quick-action treatment"],
  [/\.tt-reminder-tiles/, "reminder mobile treatment"],
  [/\.species-explorer-journey/, "species mobile treatment"],
  [/\.breeding-intelligence/, "breeding mobile treatment"],
  [/\.rescue-tabbar/, "rescue mobile treatment"],
  [/\.tt-settings-page/, "settings mobile treatment"],
  [/\.tt-marketplace-page/, "marketplace mobile treatment"],
  [/\.app-header \.tt-command-trigger\s*\{[\s\S]*?display:\s*none;/, "phone header duplicate-search removal"],
];

for (const [pattern, label] of cssContracts) {
  if (!pattern.test(css)) errors.push(`Missing mobile product contract: ${label}.`);
}

const experienceContracts = [
  [/--tt-mobile-appbar-height:\s*58px/, "compact mobile app bar token"],
  [/\.app-header\s*\{[\s\S]*?position:\s*sticky;/, "sticky compact app bar"],
  [/\.app-mobile-context\s*\{[\s\S]*?display:\s*block;/, "route-aware mobile header context"],
  [/\.app-navigation\.tt-easy-nav-strip\s*\{[\s\S]*?border-radius:\s*var\(--tt-mobile-dock-radius\)/, "floating rounded mobile dock"],
  [/\.tt-home-brandbar\s*\{[\s\S]*?display:\s*none;/, "duplicate Home branding removal"],
  [/\.tt-home-stats\s*\{[\s\S]*?scroll-snap-type:/, "Home record-count snap rail"],
  [/\.tt-home-explore-grid\s*\{[\s\S]*?scroll-snap-type:/, "Home explore snap rail"],
  [/\.tt-quick-actions\s*\{[\s\S]*?repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "two-up mobile care actions"],
  [/\.snake-profile-hero\s*\{[\s\S]*?grid-template-columns:\s*96px/, "compact animal identity hero"],
  [/\.snake-profile-quickbar\s*\{[\s\S]*?position:\s*sticky;/, "sticky animal action rail"],
  [/\.universal-animals-collection-panel\s*\{[\s\S]*?background:\s*transparent;/, "collection-first My Animals visual hierarchy"],
  [/\.tt-reminder-tiles\s*\{[\s\S]*?scroll-snap-type:/, "Reminder task snap rail"],
  [/\.tt-tracker-nav\s*\{[\s\S]*?position:\s*sticky;/, "sticky tracker navigation"],
  [/\.paid-plan-grid\s*\{[\s\S]*?scroll-snap-type:/, "mobile plan-card snap rail"],
  [/\.workspace-dashboard__stats\s*\{[\s\S]*?overflow-x:\s*auto;/, "workspace KPI rail"],
  [/\.community-action-grid\s*\{[\s\S]*?scroll-snap-type:/, "Community action rail"],
  [/\.obs-tabs\s*\{[\s\S]*?position:\s*sticky;/, "Observatory sticky mobile tabs"],
  [/\.creator-queue-modal\s*,[\s\S]*?border-radius:\s*22px 22px 0 0;/, "Creator review bottom-sheet modal"],
  [/\.creator-snapshot-grid\s*,[\s\S]*?scroll-snap-type:/, "Creator intelligence metric rail"],
  [/@supports selector\(body:has\(input:focus\)\)/, "keyboard-aware dock support"],
  [/content-visibility:\s*auto;/, "off-screen mobile list paint deferral"],
  [/@media \(prefers-contrast:\s*more\)/, "high-contrast mobile treatment"],
  [/@media \(forced-colors:\s*active\)/, "forced-colours mobile treatment"],
  [/\/\* VISUALISATION INTEGRITY — dense analytical surfaces stay usable on phones\. \*\//, "visualisation integrity section"],
  [/\.calculator-result-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/, "single-column mobile genetics results"],
  [/\.tt-timeline-filters\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?overflow-x:\s*auto;/, "sticky scrollable timeline filters"],
  [/\.tt-timeline-summary\s*\{[\s\S]*?display:\s*flex;[\s\S]*?scroll-snap-type:/, "timeline metric rail"],
  [/\.readiness-item-action\s*\{[\s\S]*?margin-left:\s*0;/, "mobile breeding-readiness action alignment"],
  [/\.readiness-item-action button,[\s\S]*?min-height:\s*44px;/, "thumb-safe breeding-readiness actions"],
  [/html\s*\{[\s\S]*?text-size-adjust:\s*100%;/, "browser text-scaling compatibility"],
  [/\.app-header-actions\s*\{[\s\S]*?overflow-x:\s*auto;/, "overflow-safe mobile header utilities"],
  [/@media \(max-width:\s*380px\)[\s\S]*?\.header-qa-button strong\s*\{[\s\S]*?display:\s*none;/, "narrow-phone QA utility compaction"],
];

for (const [pattern, label] of experienceContracts) {
  if (!pattern.test(experience)) errors.push(`Missing Mobile Experience V2 contract: ${label}.`);
}

if (!header.includes("mobileContextLabel") || !header.includes("app-mobile-context")) {
  errors.push("Header must expose route-aware mobile context.");
}
if (!header.includes("mobileBackFallback") || !header.includes("app-mobile-back") || !header.includes("navigate(-1)")) {
  errors.push("Header must retain native mobile back navigation with safe parent fallback.");
}
if (!/\.app-header--has-mobile-back \.logo-link\s*\{[\s\S]*?display:\s*none;/.test(experience)) {
  errors.push("Mobile deep routes must replace the brand logo with the native back control.");
}

if (!authenticatedRoutes.includes('const Home = lazy(() => import("../pages/Home"))')) {
  errors.push("Home must remain route-lazy so the authenticated shell is not forced to bundle the full dashboard.");
}
if (!authenticatedRoutes.includes("tt-route-loading__hero") || !authenticatedRoutes.includes('aria-busy="true"')) {
  errors.push("Authenticated routes must retain the native route-loading skeleton.");
}
if (!experience.includes(".tt-route-loading__grid") || !experience.includes("@keyframes tt-route-skeleton-shimmer")) {
  errors.push("Mobile Experience V2 must retain the route-transition skeleton styling.");
}

const manifest = JSON.parse(staticManifest);
const manifestIcons = Array.isArray(manifest.icons) ? manifest.icons : [];
const manifestShortcuts = Array.isArray(manifest.shortcuts) ? manifest.shortcuts : [];
if (!manifestIcons.some((icon) => icon.src === "/icons/tiny-titans-192.svg")) {
  errors.push("Static PWA manifest must retain the canonical Tiny Titans 192 SVG icon.");
}
if (!manifestIcons.some((icon) => icon.type === "image/jpeg")) {
  errors.push("Static PWA manifest must retain a raster install-icon fallback.");
}
for (const shortcutUrl of ["/animals", "/reminders", "/calculator"]) {
  if (!manifestShortcuts.some((shortcut) => shortcut.url === shortcutUrl)) {
    errors.push(`Static PWA manifest must retain launcher shortcut ${shortcutUrl}.`);
  }
}
if (!viteConfig.includes('tinyTitansIcon192') || !viteConfig.includes('shortcuts: [') || !viteConfig.includes('tinyTitansRasterIcon')) {
  errors.push("Generated Vite PWA manifest must retain canonical icons, shortcuts and raster fallback.");
}
if (!index.includes('rel="icon" type="image/svg+xml" href="/favicon.svg?v=4"')) {
  errors.push("index.html must use the canonical SVG favicon.");
}

if (!updatePrompt.includes("previousFocusRef") || !updatePrompt.includes('event.key !== "Tab"') || !updatePrompt.includes('document.body.style.overflow = "hidden"')) {
  errors.push("App update dialog must trap focus, restore focus and lock background scrolling.");
}
if (!pwaService.includes("notifyTinyTitansOfflineReady") || !pwaService.includes("onOfflineReady()")) {
  errors.push("PWA update service must surface offline-ready state.");
}
if (!/\.tt-update-manual,[\s\S]*?bottom:\s*calc\(82px \+ env\(safe-area-inset-bottom\)\)/.test(updatePromptCss)) {
  errors.push("Mobile update control must remain above the Quick View dock.");
}
if (!/\.tt-update-panel\s*\{[\s\S]*?border-radius:\s*24px 24px 0 0;/.test(updatePromptCss)) {
  errors.push("Mobile update dialog must retain bottom-sheet presentation.");
}

const focusManagedSources = [
  ["Quick View", quickView],
  ["confirmation dialog", confirmDialog],
  ["command palette", commandPalette],
];

for (const [label, source] of focusManagedSources) {
  if (!source.includes("previousFocusRef")) errors.push(`${label} must restore focus after closing.`);
  if (!source.includes('event.key !== "Tab"') && !source.includes('event.key === "Tab"')) errors.push(`${label} must trap Tab focus while open.`);
  if (!source.includes('document.body.style.overflow = "hidden"')) errors.push(`${label} must lock document scrolling while open.`);
}

if (!quickView.includes("FOCUSABLE_SELECTOR")) errors.push("Quick View must use a canonical focusable-element selector.");
if (!confirmDialog.includes("FOCUSABLE_SELECTOR")) errors.push("Confirmation dialog must use a canonical focusable-element selector.");
if (!myAnimals.includes("universal-animals-collection-panel") || !myAnimals.includes("universal-add-shortcut")) {
  errors.push("My Animals must retain the collection-first mobile hooks and add-animal shortcut.");
}
if (!homeDashboard.includes("photoUrl: animal.photoUrl")) {
  errors.push("Home dashboard must carry the existing animal profile image into the current-animal model.");
}
if (!homeCurrentAnimal.includes("HomeAnimalAvatar") || !homeCurrentAnimal.includes('fallbackIcon = animal?.recordSource === "legacy-snake" ? "reptile" : "animals"')) {
  errors.push("Home current-animal card must prefer the stored profile image and use a snake fallback for snake records.");
}
if (!homeCurrentAnimal.includes('selectedSnake?.recordSource === "legacy-snake" ? "reptile" : "animals"')) {
  errors.push("Home CURRENT ANIMAL label must use the snake icon for legacy snake profiles.");
}
if (!/\.tt-home-current-avatar > img\s*\{[\s\S]*?object-fit:\s*cover;/.test(homeCss)) {
  errors.push("Home current-animal profile images must retain cropped avatar styling.");
}
if (!/@media \(max-width:\s*390px\)[\s\S]*?\.tt-home-current-actions,[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(homeCss)) {
  errors.push("Home narrow-phone current-animal actions must remain two-up in route-local CSS.");
}
if (!myAnimals.includes("AnimalCollectionAvatar") || !myAnimals.includes("animal.photoUrl")) {
  errors.push("My Animals must retain photo-first identity for named animal records.");
}
if (!/\.universal-animal-avatar > img\s*\{[\s\S]*?object-fit:\s*cover;/.test(universalAnimalsCss)) {
  errors.push("My Animals profile thumbnails must retain cropped avatar styling.");
}
if (!snakeProfileHero.includes('snake.photo || snake.imageUrl || snake.photoUrl')) {
  errors.push("Snake Profile must resolve every supported saved profile-image field.");
}
if (!snakeProfileHero.includes('TinyTitansIcon name="reptile"') || snakeProfileHero.includes("🐍")) {
  errors.push("Snake Profile must use the canonical Tiny Titans snake icon rather than raw emoji.");
}
if (!/\.snake-profile-heading\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;/.test(snakeProfileCss)) {
  errors.push("Snake Profile heading must keep icon and animal identity aligned.");
}
if (!marketplace.includes("tt-marketplace-page") || !marketplace.includes("tt-marketplace-grid")) {
  errors.push("Marketplace must retain mobile-safe layout hooks.");
}
if (settings.includes('navigate("/reptile-room")')) {
  errors.push("Settings must not link to the retired /reptile-room route.");
}
if (pageRegistry.includes('path: "/reptile-room"')) {
  errors.push("The page registry must not expose the retired /reptile-room route.");
}

if (errors.length) {
  console.error("Tiny Titans mobile product validation FAILED:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Tiny Titans mobile product validation passed.");
