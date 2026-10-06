import fs from "node:fs/promises";

const requiredFiles = [
  "functions/foundingFollowerReward.js",
  "functions/index.js",
  "firestore.rules",
  "storage.rules",
  "src/config/foundingFollowerReward.ts",
  "src/services/foundingFollowerRewardService.ts",
  "src/pages/FoundingFollowerReward.tsx",
  "src/pages/CreatorFoundingFollowerClaims.tsx",
  "src/styles/foundingFollowerReward.css",
  "src/styles/creatorFoundingFollowerClaims.css",
  "src/routes/AuthenticatedRoutes.tsx",
  "src/pages/CreatorOperationsHub.tsx",
  "src/pages/Home.tsx",
  "src/pages/Home.css",
];

const reads = await Promise.all(requiredFiles.map(async (path) => [path, await fs.readFile(path, "utf8")]));
const files = Object.fromEntries(reads);
const assertions = [
  ["founding follower backend exists", files["functions/foundingFollowerReward.js"].includes("exports.submitFoundingFollowerClaim")],
  ["creator claim queue exists", files["functions/foundingFollowerReward.js"].includes("exports.getCreatorFoundingFollowerClaims")],
  ["creator review callable exists", files["functions/foundingFollowerReward.js"].includes("exports.reviewFoundingFollowerClaim")],
  ["30-day Titan Pro reward is fixed", files["functions/foundingFollowerReward.js"].includes('const DURATION_DAYS = 30;') && files["functions/foundingFollowerReward.js"].includes('const TIER = "titan_pro";')],
  ["Facebook and Instagram are both supported", files["functions/foundingFollowerReward.js"].includes('["facebook", "instagram"]')],
  ["reward notification is created for the target user", files["functions/foundingFollowerReward.js"].includes('collection("notificationEvents")') && files["functions/foundingFollowerReward.js"].includes("sendEachForMulticast")],
  ["trial writes paidTrials", files["functions/foundingFollowerReward.js"].includes('collection("paidTrials").doc(targetUid)')],
  ["trial mirrors into the user profile", files["functions/foundingFollowerReward.js"].includes("paidTrial:") && files["functions/foundingFollowerReward.js"].includes("paidAccessUpdatedAt")],
  ["claim screenshot storage is creator-readable only", files["storage.rules"].includes("founding-follower-claims") && files["storage.rules"].includes("request.auth.uid == userId || isCreator()")],
  ["claim documents are creator-readable but client-writes stay blocked", files["firestore.rules"].includes("match /foundingFollowerClaims/{claimId}") && files["firestore.rules"].includes("allow create, update, delete: if false;")],
  ["user claim route is registered", files["src/routes/AuthenticatedRoutes.tsx"].includes('path="/founding-followers"')],
  ["creator claim route is registered", files["src/routes/AuthenticatedRoutes.tsx"].includes('path="/creator/founding-followers"')],
  ["creator hub links to claim queue", files["src/pages/CreatorOperationsHub.tsx"].includes("/creator/founding-followers")],
  ["claim UI is enabled for testing/launch", files["src/config/foundingFollowerReward.ts"].includes("enabled: true")],
  ["Home exposes the follower free-month CTA", files["src/pages/Home.tsx"].includes("tt-home-follower-reward") && files["src/pages/Home.tsx"].includes('to="/founding-followers"')],
  ["Home hides the CTA after a live claim is submitted or approved", files["src/pages/Home.tsx"].includes('!foundingFollowerClaim || foundingFollowerClaim.status === "rejected"')],
  ["Home waits for claim state before rendering the CTA", files["src/pages/Home.tsx"].includes("foundingFollowerClaimChecked") && files["src/pages/Home.tsx"].includes("setFoundingFollowerClaimChecked(true)")],
  ["Home restores the CTA for rejected claims", files["src/pages/Home.tsx"].includes('foundingFollowerClaim?.status === "rejected"') && files["src/pages/Home.tsx"].includes("Fix claim")],
  ["Home follower CTA remains phone-safe", files["src/pages/Home.css"].includes(".tt-home-follower-reward") && files["src/pages/Home.css"].includes("grid-template-columns: auto minmax(0, 1fr)") && files["src/pages/Home.css"].includes("grid-column: 1 / -1")],
];

const failures = assertions.filter(([, ok]) => !ok);
if (failures.length) {
  console.error("Founding follower reward validation failed:");
  for (const [name] of failures) console.error(` - ${name}`);
  process.exit(1);
}

console.log(`Founding follower reward contract passed: ${assertions.length} checks, 0 failures.`);
