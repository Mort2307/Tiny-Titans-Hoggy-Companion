import { readFileSync } from "node:fs";
function read(path) { return readFileSync(path, "utf8"); }
const page = read("src/pages/PaidPlans.tsx");
const service = read("src/services/platformBillingService.ts");
const checks = [
  ["Play billing availability is feature-detected", service.includes("getDigitalGoodsService") && service.includes("https://play.google.com/billing")],
  ["Paid plans import platform billing detection", page.includes("isGooglePlayBillingAvailable")],
  ["Play context suppresses Stripe pricing copy", page.includes("!playBillingAvailable && selectedLivePrice")],
  ["Play context does not call web Stripe checkout", page.includes("if (playBillingAvailable)")],
  ["Play context presents setup-required state", page.includes("Play Billing setup required")],
];
const failures = checks.filter(([, pass]) => !pass);
console.table(checks.map(([check, pass]) => ({ check, status: pass ? "PASS" : "FAIL" })));
if (failures.length) { console.error(`PLAY BILLING BOUNDARY: FAILED (${failures.length} check(s))`); process.exitCode = 1; } else { console.log("PLAY BILLING BOUNDARY: PASSED"); }