#!/usr/bin/env node
// Tiny Titans Firebase release helpers. Read-only except 'stamp', which writes dist/version.json.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PROJECT = "tinytitans-hoggy-companion";
export const SITES = Object.freeze({
  legacy: "tinytitans-hoggy-companion",
  keeper: "tinytitanskeeper",
});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));

export function checkFirebaseConfiguration(firebase, rc) {
  if (rc?.projects?.default !== PROJECT) throw new Error("Unexpected default Firebase project. Refusing release.");
  for (const [target, site] of Object.entries(SITES)) {
    const hosts = rc?.targets?.[PROJECT]?.hosting?.[target];
    if (!Array.isArray(hosts) || hosts.length !== 1 || hosts[0] !== site) {
      throw new Error("Firebase Hosting target '" + target + "' does not match the expected site.");
    }
  }
  if (!Array.isArray(firebase?.hosting) || firebase.hosting.length !== 2) {
    throw new Error("Expected exactly two Tiny Titans Hosting configurations.");
  }
  const actual = firebase.hosting.map((entry) => entry.target).sort().join(",");
  if (actual !== "keeper,legacy") throw new Error("Unexpected Hosting target set.");
  if (firebase?.functions?.source !== "functions") throw new Error("Unexpected Functions source.");
  if (firebase?.firestore?.rules !== "firestore.rules" || firebase?.storage?.rules !== "storage.rules") {
    throw new Error("Unexpected Firebase security rules configuration.");
  }
  return true;
}

export function functionTargets(input) {
  const names = input.split(",").map((name) => name.trim());
  if (names.length < 1 || names.length > 20 || names.some((name) => !/^[A-Za-z][\w$]{0,100}$/.test(name))) {
    throw new Error("Supply 1–20 comma-separated JavaScript function export names.");
  }
  if (new Set(names).size !== names.length) throw new Error("Function names must be unique.");
  return names.map((name) => "functions:" + name).join(",");
}

export function classifyChanges(paths) {
  const list = paths.filter(Boolean);
  const has = (regex) => list.some((p) => regex.test(p));
  return {
    files: list,
    hosting: has(/^(src\/|public\/|index\.html$|vite\.config\.|package(?:-lock)?\.json$)/),
    functions: has(/^(functions\/|scripts\/deploy-functions-batched\.mjs$)/),
    firestore: has(/^(firestore(\.partner)?\.rules$|firestore\.indexes\.json$|scripts\/(?:assemble-firestore-rules|mergeMentorshipRules|mergeRescueRules)\.mjs$)/),
    storage: has(/^storage\.rules$/),
    config: has(/^(\.firebaserc|firebase\.json)$/),
  };
}

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }).trim();
}

function diffFiles(base, head) {
  if (!/^[0-9a-f]{40}$/i.test(base) || !/^[0-9a-f]{40}$/i.test(head)) {
    throw new Error("Git diff requires two full commit SHAs.");
  }
  return git("diff", "--name-only", "--diff-filter=ACDMRT", base, head, "--").split("\n").filter(Boolean);
}

function checkProject() {
  checkFirebaseConfiguration(readJson("firebase.json"), readJson(".firebaserc"));
  console.log("Firebase deployment targets verified: " + PROJECT + ", " + Object.values(SITES).join(", "));
}

function releasePlan() {
  const base = process.env.COMPARE_REF || git("rev-parse", "HEAD~1");
  const head = git("rev-parse", "HEAD");
  const changes = classifyChanges(diffFiles(base, head));
  const lines = [
    "### Tiny Titans Firebase release plan (advisory, no deployment)",
    "",
    "Baseline: " + base,
    "Current: " + head,
    "Files changed: " + changes.files.length,
    "",
    "| Area | Changed | Manual decision |",
    "| --- | --- | --- |",
    "| Hosting | " + (changes.hosting ? "Yes" : "No") + " | Automatic on safe master pushes, or manual recovery |",
    "| Functions | " + (changes.functions ? "Yes" : "No") + " | Select named functions first; full batched deployment only when required |",
    "| Firestore | " + (changes.firestore ? "Yes" : "No") + " | Choose firestore:rules and/or firestore:indexes |",
    "| Storage rules | " + (changes.storage ? "Yes" : "No") + " | Choose storage |",
    "| Firebase config | " + (changes.config ? "Yes" : "No") + " | Review both project targets and rewrites |",
    "",
    "This is a file-level heuristic; it does not guarantee that every runtime dependency has been identified.",
    "Deploy backend first when frontend and backend changes depend on each other.",
  ];
  const report = lines.join("\n") + "\n";
  process.stdout.write(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
}

function checkPush() {
  const base = process.env.PUSH_BEFORE || "";
  const head = process.env.GITHUB_SHA || "";
  const changes = classifyChanges(diffFiles(base, head));
  if (changes.functions || changes.firestore || changes.storage || changes.config) {
    throw new Error("This push includes backend/rules/config changes. Deploy the matching backend scope first, then manually dispatch Hosting with the required confirmation.");
  }
  console.log("Hosting push is frontend-only; backend release gate passed.");
}

function stamp() {
  const sha = process.env.GITHUB_SHA || "";
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("Missing full GITHUB_SHA.");
  const dist = path.join(root, "dist");
  if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("Build dist/index.html before stamping.");
  const release = { project: PROJECT, sourceCommit: sha, generatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dist, "version.json"), JSON.stringify(release) + "\n");
  console.log("Stamped " + sha + " in dist/version.json.");
}

async function verifyHosting() {
  const sha = process.env.GITHUB_SHA || "";
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("Missing full GITHUB_SHA.");
  for (const [target, site] of Object.entries(SITES)) {
    let verified = false;
    let error = "";
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const res = await fetch("https://" + site + ".web.app/version.json?verify=" + sha, {
          headers: { "Cache-Control": "no-store" },
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (data.project === PROJECT && data.sourceCommit === sha) { verified = true; break; }
        throw new Error("Version stamp does not match release commit.");
      } catch (e) {
        error = String(e.message || e);
        if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    if (!verified) throw new Error("Hosting verification failed for " + target + ": " + error);
    console.log("Verified " + target + " at https://" + site + ".web.app (commit " + sha + ")");
  }
}

export async function main(command) {
  if (!["guard", "targets", "plan", "check-push", "stamp", "verify-hosting"].includes(command)) {
    throw new Error("Unknown Firebase release command: " + command);
  }
  checkProject();
  if (command === "guard") return;
  if (command === "targets") return console.log(functionTargets(process.env.SELECTED_FUNCTIONS || ""));
  if (command === "plan") return releasePlan();
  if (command === "check-push") return checkPush();
  if (command === "stamp") return stamp();
  if (command === "verify-hosting") return verifyHosting();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch((error) => {
    console.error("TINY TITANS FIREBASE RELEASE STOPPED: " + String(error.message || error));
    process.exitCode = 1;
  });
}
