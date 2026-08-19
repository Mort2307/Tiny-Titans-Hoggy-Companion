import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["--yes", "playwright", "test", "scripts/app-bot/overlord.spec.mjs"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(`Overlord BOT could not start: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
