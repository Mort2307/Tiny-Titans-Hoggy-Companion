import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFile(path.join(root, file), "utf8");

const [main, ui, hardening, contract] = await Promise.all([
  read("src/main.tsx"),
  read("src/styles/tiny-titans-professional-ui.css"),
  read("src/styles/tiny-titans-professional-hardening.css"),
  read("docs/visual-design-contract.json").then(JSON.parse),
]);

const requiredImports = ["./styles/tiny-titans-professional-ui.css", "./styles/tiny-titans-professional-hardening.css"];
for (const required of requiredImports) {
  if (!main.includes(`import \"${required}\"`)) throw new Error(`UI hardening contract: ${required} is not loaded by main.tsx.`);
}

const requiredTokens = [
  "--tt-ui-bg", "--tt-ui-surface", "--tt-ui-text", "--tt-ui-purple", "--tt-ui-blue", "--tt-ui-gold",
  "--tt-ui-success", "--tt-ui-warning", "--tt-ui-danger", "--tt-ui-focus",
];
for (const token of requiredTokens) {
  if (!ui.includes(token) && !hardening.includes(token) && !main.includes(token)) throw new Error(`UI hardening contract: expected token ${token} is missing.`);
}

const requiredSafeguards = [
  "overflow-x:hidden",
  "min-width:0",
  "min-height:44px",
  "env(safe-area-inset-bottom)",
  "prefers-reduced-motion",
  "forced-colors:active",
  "focus-visible",
  "100dvh",
];
for (const safeguard of requiredSafeguards) {
  if (!hardening.includes(safeguard)) throw new Error(`UI hardening contract: safeguard '${safeguard}' is missing.`);
}

if (contract.auditRules.horizontalOverflow !== "fail") throw new Error("Visual contract must treat horizontal overflow as a failure.");
if (contract.auditRules.viewportClipping !== "fail") throw new Error("Visual contract must treat viewport clipping as a failure.");
if (Number(contract.auditRules.minimumTouchTarget) < 44) throw new Error("Visual contract minimum touch target must be at least 44px.");

console.log("UI hardening contract: PASS");
console.log(`Responsive viewports: ${contract.responsiveViewports.map((item) => item.name).join(", ")}`);
console.log(`Minimum touch target: ${contract.auditRules.minimumTouchTarget}px`);
console.log("Overflow/clipping policy: build fails if the visual contract is violated");
