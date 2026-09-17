import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");
const outputDir = path.resolve(process.env.TINY_TITANS_VISUAL_OUTPUT || "artifacts/visual-review");
const reportPath = path.join(outputDir, "report.json");
const configPath = path.resolve("src/firebase/config.ts");
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL || process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD || process.env.TINY_TITANS_BOT_PASSWORD;
const runId = String(process.env.GITHUB_RUN_ID || `local-${Date.now()}`).trim();
const repository = process.env.GITHUB_REPOSITORY || "Mort2307/Tiny-Titans-Hoggy-Companion";
const githubBranch = process.env.TINY_TITANS_QA_GITHUB_BRANCH || "qa-evidence";
const functionsRegion = process.env.TINY_TITANS_FUNCTIONS_REGION || "europe-west2";

function readConfigValue(source, key) {
  const match = source.match(new RegExp(`${key}\\s*:\\s*[\"']([^\"']+)[\"']`));
  if (!match?.[1]) throw new Error(`Could not read ${key} from src/firebase/config.ts.`);
  return match[1];
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".json" ? "application/json; charset=utf-8"
    : extension === ".html" ? "text/html; charset=utf-8"
    : extension === ".md" ? "text/markdown; charset=utf-8"
    : extension === ".txt" ? "text/plain; charset=utf-8"
    : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg"
    : extension === ".webm" ? "video/webm"
    : "image/png";
}

async function signIn(apiKey) {
  if (!email || !password) throw new Error("QA evidence publishing requires the visual BOT email and password secrets.");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Firebase BOT authentication failed (${response.status}).`);
  const data = await response.json();
  if (!data.idToken) throw new Error("Firebase did not return an ID token for the visual BOT.");
  return { idToken: data.idToken, uid: data.localId };
}

async function uploadObject(bucket, idToken, objectName, filePath) {
  const bytes = await fs.readFile(filePath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": contentType(filePath),
      "X-Goog-Upload-Protocol": "raw",
    },
    body: bytes,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Storage upload failed for ${objectName} (${response.status}): ${detail.slice(0, 500)}`);
  }
}

async function listEvidenceFiles() {
  const entries = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(png|jpe?g|json|html|md|txt)$/i.test(entry.name)) entries.push(full);
    }
  }
  await walk(outputDir);
  return entries;
}

function buildRunSummary(report, storagePrefix, uid) {
  const results = Array.isArray(report.results) ? report.results : [];
  const errors = results.reduce((count, result) => count + (Array.isArray(result.findings) ? result.findings.filter((item) => item.severity === "error").length : 0), 0);
  const warnings = results.reduce((count, result) => count + (Array.isArray(result.findings) ? result.findings.filter((item) => item.severity === "warning").length : 0), 0);
  const failedRoutes = results.filter((result) => Array.isArray(result.findings) && result.findings.some((item) => item.severity === "error"));
  return {
    id: runId,
    name: report.bot || "Tiny Titans Visual Review BOT",
    status: errors > 0 ? "FAILED" : warnings > 0 ? "WARNINGS" : "PASSED",
    generatedAt: report.generatedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || "local",
    routes: Array.isArray(report.routes) ? report.routes.length : 0,
    viewports: Array.isArray(report.viewports) ? report.viewports : [],
    screenshots: Number(report.screenshotCount || 0),
    videos: Number(report.videoCount || 0),
    failures: failedRoutes.length,
    errors,
    warnings,
    failedRouteCount: failedRoutes.length,
    storagePrefix,
    reportPath: `${storagePrefix}/report.json`,
    publisherUid: uid,
    github: {
      repository,
      branch: githubBranch,
      path: "qa/latest",
      url: `https://github.com/${repository}/tree/${githubBranch}/qa/latest`,
      actionsUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
    },
    routeSource: report.routeSource || "universal-visual-review",
  };
}

async function publishRun(idToken, projectId, summary) {
  const endpoint = `https://${functionsRegion}-${projectId}.cloudfunctions.net/publishCreatorQaRun`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(summary),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Creator QA publish endpoint failed (${response.status}): ${detail.slice(0, 800)}`);
  }
  return response.json();
}

async function main() {
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const configSource = await fs.readFile(configPath, "utf8");
  const apiKey = readConfigValue(configSource, "apiKey");
  const projectId = readConfigValue(configSource, "projectId");
  const bucket = readConfigValue(configSource, "storageBucket");
  const { idToken, uid } = await signIn(apiKey);
  const storagePrefix = `qa-evidence/runs/${runId}`;
  const files = await listEvidenceFiles();

  for (const filePath of files) {
    const relative = path.relative(outputDir, filePath).replaceAll(path.sep, "/");
    await uploadObject(bucket, idToken, `${storagePrefix}/${relative}`, filePath);
    console.log(`Uploaded QA evidence: ${relative}`);
  }

  const summary = buildRunSummary(report, storagePrefix, uid);
  await publishRun(idToken, projectId, summary);
  console.log(JSON.stringify({ published: true, runId, storagePrefix, screenshots: summary.screenshots, routes: summary.routes, status: summary.status }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
