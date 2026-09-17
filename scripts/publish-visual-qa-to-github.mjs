import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outputDir = path.resolve(process.env.TINY_TITANS_VISUAL_OUTPUT || "artifacts/visual-review");
const repository = process.env.GITHUB_REPOSITORY || "Mort2307/Tiny-Titans-Hoggy-Companion";
const branch = process.env.TINY_TITANS_QA_GITHUB_BRANCH || "qa-evidence";
const runId = String(process.env.GITHUB_RUN_ID || `local-${Date.now()}`).trim();
const token = String(process.env.GITHUB_TOKEN || "").trim();
const serverURL = String(process.env.GITHUB_SERVER_URL || "https://github.com").replace(/\/$/, "");

function runGit(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  return result.stdout.trim();
}

function safePath(value) {
  return String(value || "/").replace(/^\//, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "home";
}

function escapeMarkdown(value) {
  return String(value || "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function copyEvidence(sourceRoot, destinationRoot) {
  await fs.mkdir(destinationRoot, { recursive: true });
  const allowedFiles = new Set(["report.json", "route-set.json", "run-metadata.txt", "index.html", "README.md"]);
  async function walk(source, relative = "") {
    for (const entry of await fs.readdir(source, { withFileTypes: true })) {
      const sourcePath = path.join(source, entry.name);
      const nextRelative = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        await walk(sourcePath, nextRelative);
        continue;
      }
      if (!/\.png$/i.test(entry.name) && !(relative === "" && allowedFiles.has(entry.name))) continue;
      const destinationPath = path.join(destinationRoot, nextRelative);
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
  await walk(sourceRoot);
}

async function writeGitHubReadme(destinationRoot, report) {
  const viewports = Array.isArray(report.viewports) ? report.viewports : [];
  const results = Array.isArray(report.results) ? report.results : [];
  const errors = results.reduce((sum, item) => sum + (item.findings || []).filter((finding) => finding.severity === "error").length, 0);
  const warnings = results.reduce((sum, item) => sum + (item.findings || []).filter((finding) => finding.severity === "warning").length, 0);
  const status = errors ? "FAILED" : warnings ? "WARNINGS" : "PASSED";
  const actionsUrl = process.env.GITHUB_RUN_ID ? `${serverURL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : null;
  const lines = [
    "# Tiny Titans · Visual QA Evidence",
    "",
    `**Run:** ${runId}  `,
    `**Commit:** \`${process.env.GITHUB_SHA || "local"}\`  `,
    `**Status:** ${status}  `,
    `**Routes captured:** ${report.routes?.length || 0}  `,
    `**Viewports:** ${viewports.length}  `,
    `**Screenshots:** ${report.screenshotCount || 0}  `,
    `**Errors:** ${errors}  `,
    `**Warnings:** ${warnings}`,
    "",
    actionsUrl ? `[Open the GitHub Actions run](${actionsUrl})` : "Local run",
    "",
    "> This branch contains only the latest temporary visual evidence. The next successful publish replaces it rather than accumulating old screenshots.",
    "",
    "## Viewport galleries",
    "",
  ];

  for (const viewport of viewports) {
    const label = `${viewport.name} · ${viewport.width}×${viewport.height}`;
    lines.push(`- [${label}](./${viewport.name}/README.md)`);
  }

  lines.push("", "## Machine report", "", "- [report.json](./report.json)", "- [route-set.json](./route-set.json)", "");
  await fs.writeFile(path.join(destinationRoot, "README.md"), `${lines.join("\n")}\n`, "utf8");

  for (const viewport of viewports) {
    const viewportDir = path.join(destinationRoot, viewport.name);
    await fs.mkdir(viewportDir, { recursive: true });
    const viewportResults = results.filter((result) => result.viewport?.name === viewport.name);
    const gallery = [
      `# ${viewport.name} · ${viewport.width}×${viewport.height}`,
      "",
      `Latest visual evidence for **${viewport.width}×${viewport.height}**. Each route has both the viewport and full-page capture.",
      "",
      "| Route | Viewport capture | Full-page capture |",
      "| --- | --- | --- |",
    ];
    for (const result of viewportResults) {
      const safe = safePath(result.route);
      const viewportFile = path.basename(result.viewportScreenshot || "");
      const fullFile = path.basename(result.fullPageScreenshot || "");
      gallery.push(`| ${escapeMarkdown(result.route)} | ![${safe} viewport](../${viewportFile}) | ![${safe} full page](../${fullFile}) |`);
    }
    await fs.writeFile(path.join(viewportDir, "README.md"), `${gallery.join("\n")}\n`, "utf8");
  }
}

async function main() {
  if (!token && process.env.CI) throw new Error("GITHUB_TOKEN is required to publish temporary QA evidence from GitHub Actions.");
  const report = JSON.parse(await fs.readFile(path.join(outputDir, "report.json"), "utf8"));
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tinytitans-qa-github-"));
  const evidenceRoot = path.join(tempRoot, "qa", "latest");

  try {
    await copyEvidence(outputDir, evidenceRoot);
    await writeGitHubReadme(evidenceRoot, report);
    await fs.writeFile(path.join(tempRoot, "README.md"), "# Tiny Titans QA Evidence\n\nThe `qa-evidence` branch is temporary visual evidence for the latest Playwright run. Open `qa/latest/README.md`.\n", "utf8");

    runGit(["init"], tempRoot);
    runGit(["config", "user.name", "Tiny Titans QA BOT"], tempRoot);
    runGit(["config", "user.email", "tinytitans-qa-bot@users.noreply.github.com"], tempRoot);
    const remote = token ? `https://x-access-token:${encodeURIComponent(token)}@github.com/${repository}.git` : `https://github.com/${repository}.git`;
    runGit(["remote", "add", "origin", remote], tempRoot);
    runGit(["checkout", "-b", branch], tempRoot);
    runGit(["add", "README.md", "qa"], tempRoot);
    runGit(["commit", "-m", `QA evidence run ${runId}`], tempRoot);
    runGit(["push", "--force", "origin", `HEAD:${branch}`], tempRoot);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  console.log(JSON.stringify({
    published: true,
    branch,
    runId,
    url: `${serverURL}/${repository}/tree/${branch}/qa/latest`,
    reportUrl: `${serverURL}/${repository}/blob/${branch}/qa/latest/report.json`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
