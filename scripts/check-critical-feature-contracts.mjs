import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));

const checks = [
  ["Reptile Room page exists", exists("src/pages/ReptileRoom.tsx")],
  ["Reptile Room route exists", read("src/routes/AppRouter.tsx").includes('path="/reptile-room"')],
  ["Titan Goals configuration exists", exists("src/config/titanGoals.ts")],
  ["Titan Goal tracker exists", exists("src/components/TitanGoalTracker.tsx")],
  ["Become a Titan page exists", exists("src/pages/BecomeATitan.tsx")],
  ["Creator intelligence page exists", exists("src/pages/CreatorAdmin.tsx")],
  ["Creator route exists", read("src/routes/AppRouter.tsx").includes('path="/creator"')],
  ["Creator benchmarks route exists", read("src/routes/AppRouter.tsx").includes('path="/creator/benchmarks"')],
  ["Intelligence kernel exists", exists("src/services/tinyTitansIntelligenceKernel.ts")],
  ["Intelligence event bus exists", exists("src/services/tinyTitansEventBus.ts")],
  ["Deleted scheduled keeper reminders stay unexported", !read("functions/index.js").includes("exports.sendAllKeeperReminderNotifications")],
  ["Deleted equipment reminder stays unexported", !read("functions/index.js").includes("exports.sendEquipmentReplacementNotifications")],
];

const failed = checks.filter(([, passed]) => !passed);
console.table(checks.map(([check, passed]) => ({ check, status: passed ? "PASS" : "FAIL" })));
if (failed.length) {
  console.error(`Critical feature contract failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log(`Critical feature contract passed: ${checks.length} checks.`);
