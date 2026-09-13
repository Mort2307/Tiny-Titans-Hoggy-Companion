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

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isReachable(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

async function ensureServer() {
  if (await isReachable(`${baseURL}/login`)) return;
  if (!ownsServer) {
    throw new Error(`Visual UX BOT could not reach ${baseURL}. Start the configured test server or clear TINY_TITANS_TEST_URL to use the local Vite server.`);
  }

  console.log(`Visual UX BOT: ${baseURL} is not running; starting Vite locally...`);
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
    windowsHide: true,
  });

  const ready = await waitForServer(`${baseURL}/login`);
  if (!ready) throw new Error(`Visual UX BOT could not start a local Vite server at ${baseURL}.`);
}

function cleanup() {
  if (server && !server.killed) {
    server.kill();
  }
}

process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

try {
  await ensureServer();
  await import("./run-visual-ux-bot.mjs");
} catch (error) {
  console.error(`Visual UX BOT failed: ${error instanceof Error ? error.message : String(error)}`);
  cleanup();
  process.exit(1);
}
