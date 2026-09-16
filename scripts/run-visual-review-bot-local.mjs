import { spawn } from "node:child_process";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const ownsServer = !process.env.TINY_TITANS_TEST_URL;
let server = null;

async function isReachable(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isReachable(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

async function ensureServer() {
  if (await isReachable(`${baseURL}/login`)) return;
  if (!ownsServer) throw new Error(`Visual Review BOT could not reach ${baseURL}. Start the configured test server or clear TINY_TITANS_TEST_URL.`);

  console.log(`[VISUAL REVIEW] Starting Vite at ${baseURL}...`);
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
    windowsHide: true,
  });

  if (!await waitForServer(`${baseURL}/login`)) throw new Error(`Visual Review BOT could not start Vite at ${baseURL}.`);
}

function cleanup() {
  if (server && !server.killed) server.kill();
}

process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

try {
  await ensureServer();
  await import("./run-visual-review-bot.mjs");
  await import("./run-visual-journey-recorder.mjs");
  console.log("[VISUAL REVIEW] Screenshots, DOM evidence and viewport journey recordings are in artifacts/visual-review.");
} catch (error) {
  console.error(`[VISUAL REVIEW] Failed: ${error instanceof Error ? error.message : String(error)}`);
  cleanup();
  process.exit(1);
}
