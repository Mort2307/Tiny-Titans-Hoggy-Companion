import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "npx.cmd" : "npx";
const args = ["--yes", "playwright", "test", "scripts/app-bot/overlord.spec.mjs"];

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: isWindows,
  windowsHide: false,
});

if (result.error) {
  console.error(`Overlord BOT could not start: ${result.error.message}`);
  console.error(`Attempted to run: ${command} ${args.join(" ")}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`Overlord BOT was terminated by signal: ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
