import fs from "node:fs/promises";

const rulesPath = "firestore.rules";
const fragmentPath = "firestore.partner.rules";
const marker = "    match /partnerLandings/{landingId} {";

const [rules, fragment] = await Promise.all([
  fs.readFile(rulesPath, "utf8"),
  fs.readFile(fragmentPath, "utf8"),
]);

if (!rules.includes(marker)) {
  const catchAll = "    match /{document=**} { allow read, write: if false; }";
  const index = rules.lastIndexOf(catchAll);
  if (index < 0) throw new Error("Unable to find the Firestore fallback rule insertion point.");
  const next = `${rules.slice(0, index)}${fragment}\n${rules.slice(index)}`;
  await fs.writeFile(rulesPath, next, "utf8");
  console.log("Inserted partner/QA Firestore rules into firestore.rules");
} else {
  console.log("Partner/QA Firestore rules already present; no changes made.");
}
