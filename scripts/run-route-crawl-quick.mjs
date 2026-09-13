import { spawn } from "node:child_process";

process.env.TINY_TITANS_ROUTE_CRAWL_MAX_PAGES = "25";

const child = spawn(process.execPath, ["scripts/run-route-crawl-bot.mjs"], {
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Route Crawl BOT could not start: ${error.message}`);
  process.exit(1);
});
