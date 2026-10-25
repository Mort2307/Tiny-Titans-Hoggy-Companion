import fs from "node:fs";
import path from "node:path";

const read = (relative) => fs.readFileSync(path.resolve(relative), "utf8");
const exists = (relative) => fs.existsSync(path.resolve(relative));
const page = read("src/pages/TesterCentre.tsx");
const routes = read("src/routes/AuthenticatedRoutes.tsx");
const account = read("src/pages/MyAccount.tsx");
const feedback = read("src/pages/Feedback.tsx");
const reports = read("src/pages/ReportIssue.tsx");
const invitation = read("functions/creatorTesterInvitation.js");
const gate = read("scripts/run-production-gate.mjs");
const notification = read("src/components/NotificationTestPanel.tsx");
const checks = [
  ["Dedicated authenticated human tester route", routes.includes('<Route path="/tester" element={<TesterCentre/>}/>')],
  ["Tester access honours existing profile assignment", page.includes('profile?.isTester !== true') && page.includes('location.pathname === "/tester"')],
  ["Account exposes tester hub only to assigned users", account.includes('profile?.isTester === true') && account.includes('navigate("/tester")')],
  ["Owner-only operations retain strict Creator claim", page.includes("hasCreatorTesterClaim(false)") && page.includes('location.pathname === "/creator/tester/paid-tiers"')],
  ["Paid tier controls never appear on ordinary tester hub", page.includes("creatorTools && <Link") && page.includes("<HumanTesterHub uid={user.uid} />")],
  ["Notification controls remain limited to Creator tools", page.includes("creatorTools && <section") && notification.includes("sendNotificationTestBatch")],
  ["Human testers can report actual bugs and feedback", page.includes('to="/report-bug"') && page.includes('to="/feedback"') && page.includes('to="/my-issue-reports"')],
  ["Tester review notes never claim automated signoff", page.includes("not independently verified automated test results") && page.includes("sessionStorage")],
  ["Bug reporting remains connected", reports.includes("submitIssueReport") && reports.includes("Reproduction steps")],
  ["Feedback reporting remains connected", feedback.includes("submitFeedback")],
  ["Owner-only administrative invitation was not weakened", invitation.includes('Creator Tester access is restricted to the Tiny Titans owner account.')],
  ["Human testing contract registered in release gate", gate.includes('"Human tester journey contract", ["run", "validate:human-tester"]')],
  ["Visual bot gate retired", !gate.includes("validate:visual-qa")],
  ["Bot-only workflow retirement", [
    ".github/workflows/calculator-mobile-qa.yml",
    ".github/workflows/visual-capture-bot.yml",
    ".github/workflows/creator-navigation-bot.yml",
    ".github/workflows/home-visual-bot.yml",
    ".github/workflows/route-crawl-bot.yml",
  ].every((relative) => !exists(relative))],
];
const failures = checks.filter(([, success]) => !success);
for (const [name, success] of checks) console.log(`${success ? "PASS" : "FAIL"}  ${name}`);
console.log(`Human Tester integration: ${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exitCode = 1;
