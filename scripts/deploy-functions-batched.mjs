import { existsSync, readFileSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const functionsRoot = join(projectRoot, "functions");
const entryFile = join(functionsRoot, "index.js");

const batchSize = Math.max(1, Number.parseInt(process.env.TINY_TITANS_FUNCTION_DEPLOY_BATCH_SIZE || "10", 10) || 10);
const retryDelayMs = Math.max(15000, Number.parseInt(process.env.TINY_TITANS_FUNCTION_DEPLOY_RETRY_DELAY_MS || "65000", 10) || 65000);
const maxRetries = Math.max(0, Number.parseInt(process.env.TINY_TITANS_FUNCTION_DEPLOY_MAX_RETRIES || "2", 10) || 2);

if (!existsSync(entryFile)) {
  throw new Error(`Could not find Firebase Functions entry point: ${entryFile}`);
}

function resolveLocalModule(fromFile, request) {
  if (!request.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), request);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.cjs`,
    `${base}.mjs`,
    join(base, "index.js"),
    join(base, "index.cjs"),
    join(base, "index.mjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate) && extname(candidate) !== ".json") || null;
}

function analyseModule(filePath) {
  const source = readFileSync(filePath, "utf8");
  const reexports = new Set();
  const exports = new Set();

  for (const match of source.matchAll(/Object\.assign\(\s*exports\s*,\s*require\(["'](\.[^"']+)["']\)\s*\)/g)) {
    const target = resolveLocalModule(filePath, match[1]);
    if (target) reexports.add(target);
  }

  for (const match of source.matchAll(/\bexports\.([A-Za-z_$][\w$]*)\s*=/g)) {
    exports.add(match[1]);
  }

  for (const match of source.matchAll(/\bexports\[["']([^"']+)["']\]\s*=/g)) {
    if (/^[A-Za-z_$][\w$]*$/.test(match[1])) exports.add(match[1]);
  }

  return { reexports, exports };
}

const analyses = new Map();

function getAnalysis(filePath) {
  const normalized = resolve(filePath);
  const existing = analyses.get(normalized);
  if (existing) return existing;
  const analysis = analyseModule(normalized);
  analyses.set(normalized, analysis);
  return analysis;
}

function collectExports(filePath, seen = new Set()) {
  const normalized = resolve(filePath);
  if (seen.has(normalized)) return new Set();
  seen.add(normalized);

  const analysis = getAnalysis(normalized);
  const result = new Set(analysis.exports);

  for (const reexport of analysis.reexports) {
    for (const exportName of collectExports(reexport, seen)) result.add(exportName);
  }

  return result;
}

const functions = [...collectExports(entryFile)].sort((a, b) => a.localeCompare(b));

if (functions.length === 0) {
  throw new Error("No Firebase Functions exports were discovered from functions/index.js.");
}

const batches = [];
for (let index = 0; index < functions.length; index += batchSize) {
  batches.push(functions.slice(index, index + batchSize));
}

console.log(`Tiny Titans Functions Deploy: discovered ${functions.length} exported functions.`);
console.log(`Tiny Titans Functions Deploy: using batches of ${batchSize}; ${batches.length} batch(es).`);

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function deployBatch(batch, batchNumber, attempt) {
  return new Promise((resolvePromise, reject) => {
    const target = batch.map((name) => `functions:${name}`).join(",");
    console.log(`\n[Functions ${batchNumber}/${batches.length}] Attempt ${attempt + 1}: ${batch.join(", ")}`);

    const child = spawn("firebase", ["deploy", "--only", target], {
      cwd: projectRoot,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32",
      windowsHide: false,
    });

    let output = "";
    const capture = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    };

    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Firebase deployment for batch ${batchNumber} was terminated by ${signal}.\n${output}`));
        return;
      }
      if (code === 0) {
        resolvePromise();
        return;
      }
      const error = new Error(`Firebase deployment for batch ${batchNumber} exited with code ${code ?? 1}.\n${output}`);
      error.cause = output;
      reject(error);
    });
  });
}

function isQuotaFailure(error) {
  const message = String(error?.cause || error?.message || error || "").toLowerCase();
  return message.includes("429") || message.includes("quota exceeded") || message.includes("per project mutation requests");
}

for (let index = 0; index < batches.length; index += 1) {
  const batch = batches[index];
  let completed = false;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      await deployBatch(batch, index + 1, attempt);
      completed = true;
      break;
    } catch (error) {
      const quotaFailure = isQuotaFailure(error);
      if (!quotaFailure || attempt >= maxRetries) {
        throw error;
      }

      const seconds = Math.round(retryDelayMs / 1000);
      console.warn(`Functions batch ${index + 1} hit the Cloud Functions mutation quota. Retrying after ${seconds}s...`);
      await sleep(retryDelayMs);
    }
  }

  if (!completed) {
    throw new Error(`Functions batch ${index + 1} did not complete.`);
  }
}

console.log("\nTiny Titans Functions Deploy: all function batches completed successfully.");
