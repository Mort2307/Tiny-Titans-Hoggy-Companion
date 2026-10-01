import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const main = fs.readFileSync(path.join(root, "src", "main.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "styles", "mobile-product-system.css"), "utf8");
const errors = [];

const styleImports = [...main.matchAll(/^import "\.\/styles\/([^"]+\.css)";$/gm)].map((match) => match[1]);
if (!styleImports.includes("mobile-product-system.css")) {
  errors.push("src/main.tsx must import mobile-product-system.css.");
}
if (styleImports.at(-1) !== "mobile-product-system.css") {
  errors.push("mobile-product-system.css must be the final shared style import so it can resolve legacy mobile conflicts.");
}

const contracts = [
  [/@media \(max-width: 800px\)/, "mobile breakpoint"],
  [/\.app-navigation\.tt-easy-nav-strip\s*\{[\s\S]*?position:\s*fixed;/, "fixed mobile Quick View dock"],
  [/env\(safe-area-inset-bottom\)/, "safe-area support"],
  [/\.tt-easy-more-backdrop\s*\{[\s\S]*?align-items:\s*flex-end;/, "mobile Everything bottom sheet"],
  [/\.tt-easy-search\s*\{[\s\S]*?position:\s*sticky;/, "sticky Everything search"],
  [/font-size:\s*16px;/, "16px mobile form controls"],
  [/--tt-mobile-control-height:\s*48px;/, "48px mobile control target"],
  [/overflow-x:\s*auto;/, "horizontal containment for dense data"],
  [/100dvh/, "dynamic viewport units"],
];

for (const [pattern, label] of contracts) {
  if (!pattern.test(css)) errors.push(`Missing mobile product contract: ${label}.`);
}

if (errors.length) {
  console.error("Tiny Titans mobile product validation FAILED:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Tiny Titans mobile product validation passed.");
