// TinyTitans is public by owner choice: reject accidentally committed private credentials.
// Firebase web apiKey and reCAPTCHA site keys are public browser identifiers; restrict their API usage in Google Cloud.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbiddenPath = /(?:^|\/)\.env(?:\.(?!example$)[^/]+)?$|(?:firebase-adminsdk|service[-_]?account[-_]?key|google[-_]?credentials)[^/]*\.json$|\.(?:pem|p12|pfx|key)$/i;
const privatePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bghp_[a-zA-Z0-9]{36,}\b/,
  /\bgithub_pat_[a-zA-Z0-9_]{65,}\b/,
  /\bsk_live_[a-zA-Z0-9]{20,}\b/,
];

const failures = [];
for (const path of tracked) {
  if (forbiddenPath.test(path)) failures.push("Private credential filename: " + path);
  if (!/^(?:src|functions|scripts|\.github)\//.test(path) || !/\.(?:js|cjs|mjs|ts|tsx|json|ya?ml)$/.test(path)) continue;
  const source = readFileSync(path, "utf8");
  if (privatePatterns.some((pattern) => pattern.test(source))) failures.push("Potential private credential: " + path);
}
if (failures.length) {
  for (const issue of failures) console.error(issue);
  process.exitCode = 1;
} else {
  console.log("Public source guard passed: no forbidden private-key files or obvious private credentials in tracked code.");
}
