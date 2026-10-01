import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const root = process.cwd();
const promptBaselinePath = path.join(root, "scripts", "ui-native-prompt-baseline.json");
const writePromptBaseline = process.argv.includes("--write-prompt-baseline");
const read = (file) => fs.readFile(path.join(root, file), "utf8");

const [main, ui, hardening, contract] = await Promise.all([
  read("src/main.tsx"),
  read("src/styles/tiny-titans-professional-ui.css"),
  read("src/styles/tiny-titans-professional-hardening.css"),
  read("docs/visual-design-contract.json").then(JSON.parse),
]);

const requiredImports = ["./styles/tiny-titans-professional-ui.css", "./styles/tiny-titans-professional-hardening.css"];
for (const required of requiredImports) {
  if (!main.includes(`import "${required}"`)) throw new Error(`UI hardening contract: ${required} is not loaded by main.tsx.`);
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

async function walkUiSource(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkUiSource(full);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [full] : [];
  }));
  return nested.flat();
}

function promptFingerprint(finding) {
  return `${finding.file}|${finding.api}|${finding.text}`;
}

function loadPromptBaseline() {
  if (!fsSync.existsSync(promptBaselinePath)) return new Set();
  const parsed = JSON.parse(fsSync.readFileSync(promptBaselinePath, "utf8"));
  const fingerprints = Array.isArray(parsed) ? parsed : parsed.fingerprints;
  if (!Array.isArray(fingerprints)) throw new Error("UI native-prompt baseline is malformed.");
  return new Set(fingerprints);
}

const uiSourceFiles = await walkUiSource(path.join(root, "src"));
const nativePromptFindings = [];
for (const file of uiSourceFiles) {
  const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matches = [...line.matchAll(/\bwindow\.(confirm|alert|prompt)\s*\(/g)];
    for (const match of matches) {
      nativePromptFindings.push({
        file: path.relative(root, file).replaceAll(path.sep, "/"),
        line: index + 1,
        api: match[1],
        text: line.trim().slice(0, 300),
      });
    }
  }
}

if (writePromptBaseline) {
  const fingerprints = nativePromptFindings.map(promptFingerprint).sort();
  const byApi = nativePromptFindings.reduce((acc, finding) => {
    acc[finding.api] = (acc[finding.api] ?? 0) + 1;
    return acc;
  }, {});
  await fs.writeFile(
    promptBaselinePath,
    JSON.stringify({
      version: 1,
      purpose: "Known legacy browser-native prompt debt. New prompt fingerprints fail UI hardening.",
      findings: fingerprints.length,
      byApi,
      fingerprints,
    }, null, 2) + "\n",
  );
}

const promptBaseline = loadPromptBaseline();
const activeFingerprints = new Set(nativePromptFindings.map(promptFingerprint));
const newPromptFindings = nativePromptFindings.filter((finding) => !promptBaseline.has(promptFingerprint(finding)));
const resolvedPromptFingerprints = [...promptBaseline].filter((fingerprint) => !activeFingerprints.has(fingerprint));

if (newPromptFindings.length) {
  throw new Error(
    "UI hardening contract: new browser-native prompt APIs were introduced. " +
    newPromptFindings.map((finding) => `${finding.file}:${finding.line} window.${finding.api}`).join(", ") +
    ". Use Tiny Titans shared confirmation/feedback UX.",
  );
}

if (resolvedPromptFingerprints.length) {
  throw new Error(
    `UI hardening contract: ${resolvedPromptFingerprints.length} legacy prompt fingerprint(s) were resolved but remain in the baseline. Regenerate scripts/ui-native-prompt-baseline.json so retired debt cannot return.`,
  );
}

if (nativePromptFindings.length) {
  console.log(
    `Browser-native prompt boundary: PASS_WITH_BASELINE (${nativePromptFindings.length} known legacy call${nativePromptFindings.length === 1 ? "" : "s"}; new calls fail).`,
  );
} else {
  console.log("Browser-native prompt boundary: PASS");
}
