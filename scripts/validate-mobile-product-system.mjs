import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const main = read("src", "main.tsx");
const css = read("src", "styles", "mobile-product-system.css");
const index = read("index.html");
const quickView = read("src", "components", "Layout", "QuickModeNavigation.tsx");
const confirmDialog = read("src", "components", "ConfirmActionDialog.tsx");
const commandPalette = read("src", "components", "TitanCommandPalette", "TitanCommandPalette.tsx");
const myAnimals = read("src", "pages", "MyAnimals.tsx");
const marketplace = read("src", "pages", "Marketplace.tsx");
const settings = read("src", "pages", "Settings.tsx");
const pageRegistry = read("src", "config", "tinyTitansPageRegistry.ts");
const errors = [];

const styleImports = [...main.matchAll(/^import "\.\/styles\/([^"]+\.css)";$/gm)].map((match) => match[1]);
if (!styleImports.includes("mobile-product-system.css")) {
  errors.push("src/main.tsx must import mobile-product-system.css.");
}
if (styleImports.at(-1) !== "mobile-product-system.css") {
  errors.push("mobile-product-system.css must be the final shared style import so it can resolve legacy mobile conflicts.");
}

if (!/viewport-fit=cover/.test(index)) {
  errors.push("index.html must retain viewport-fit=cover for mobile safe-area support.");
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
