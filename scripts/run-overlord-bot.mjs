import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "npx.cmd" : "npx";
const args = ["--yes", "playwright", "test", "scripts/app-bot/overlord.spec.mjs", "scripts/app-bot/overlord-form-matrix.spec.mjs"];
const env = {
  ...process.env,
  // Overlord always targets the standard Vite dev port. Do not let a stale
  // shell/user-level TINY_TITANS_TEST_URL redirect the suite to an old port.
  TINY_TITANS_TEST_URL: "http://127.0.0.1:5173",
};

const result = spawnSync(command, args, {
  stdio: "inherit",
  env,
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
