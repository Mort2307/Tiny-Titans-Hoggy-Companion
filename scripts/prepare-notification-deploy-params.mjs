#!/usr/bin/env node
// The Firebase CLI discovers every exported function before filtering --only.
// This uses checked-in NON-secret defaults only for selected notification jobs.
// Never put the SMTP password, FCM tokens or other secret values in this file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const notificationSources = [
  "functions/communityNotifications.js",
  "functions/notificationTest.js",
];
const configKeys = [
  "TINY_TITANS_SMTP_CONNECTION_URI",
  "TINY_TITANS_APP_ORIGIN",
];

export function buildNotificationDeployEnv(functionNames, files) {
  const requested = functionNames.split(",").map((s) => s.trim()).filter(Boolean);
  if (!requested.length || requested.length > 20) {
    throw new Error("Notification deployment must select 1–20 named functions.");
  }

  const safeTargets = new Set(
    notificationSources.flatMap((file) =>
      Array.from(files[file]?.matchAll(/exports\.([A-Za-z][\w]*)\s*=/g) || [], (m) => m[1]),
    ),
  );
  if (requested.some((name) => !safeTargets.has(name))) {
    return null; // Never supply these defaults to unrelated/SMTP functions.
  }

  const mail = files["functions/mailDelivery.js"] || "";
  const result = {};
  for (const key of configKeys) {
    const pattern = new RegExp('defineString\\("' + key + '"\\s*,\\s*\\{\\s*default:\\s*"([^"\\n]+)"');
    const match = mail.match(pattern);
    if (!match) throw new Error("Expected checked-in non-secret default for " + key + ".");
    const value = match[1];
    if (/[\r\n]/.test(value) || /(?:password|secret|token)=/i.test(value)) {
      throw new Error("Refusing to generate a Firebase env file containing sensitive or multiline values.");
    }
    result[key] = value;
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = Object.fromEntries([...notificationSources, "functions/mailDelivery.js"].map((file) =>
    [file, fs.readFileSync(path.join(root, file), "utf8")],
  ));
  const variables = buildNotificationDeployEnv(process.env.SELECTED_FUNCTIONS || "", files);
  if (!variables) {
    console.log("Selected targets are not exclusively notification functions. Existing Firebase env configuration is required.");
    process.exit(0);
  }
  const dest = path.join(root, "functions", ".env.tinytitans-hoggy-companion");
  if (fs.existsSync(dest)) throw new Error("Refusing to overwrite an existing Firebase environment file.");
  fs.writeFileSync(dest, Object.entries(variables).map(([key, value]) =>
    key + "=" + JSON.stringify(value),
  ).join("\n") + "\n", { mode: 0o600 });
  console.log("Prepared two non-secret Firebase parameter defaults for the selected notification-only deployment.");
  console.log("No SMTP password or secret value is included; the file exists only on this GitHub runner.");
}
