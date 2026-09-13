import { spawn } from "node:child_process";

process.env.TINY_TITANS_ROUTE_CRAWL_MAX_PAGES = "25";

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
    throw new Error(`Route Crawl BOT could not reach ${baseURL}. Start the configured test server or clear TINY_TITANS_TEST_URL to use the local Vite server.`);
  }

  console.log(`Route Crawl BOT: ${baseURL} is not running; starting Vite locally...`);
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
    windowsHide: true,
  });

  const ready = await waitForServer(`${baseURL}/login`);
  if (!ready) throw new Error(`Route Crawl BOT could not start a local Vite server at ${baseURL}.`);
}

function cleanup() {
  if (server && !server.killed) server.kill();
}

process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

const childArgs = ["scripts/run-route-crawl-bot.mjs"];

try {
  await ensureServer();

  const child = spawn(process.execPath, childArgs, {
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  });

  child.on("exit", (code, signal) => {
    cleanup();
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`Route Crawl BOT could not start: ${error.message}`);
    cleanup();
    process.exit(1);
  });
} catch (error) {
  console.error(`Route Crawl BOT failed: ${error instanceof Error ? error.message : String(error)}`);
  cleanup();
  process.exit(1);
}
