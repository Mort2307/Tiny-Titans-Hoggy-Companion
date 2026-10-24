import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const profile = read("src/pages/UniversalAnimalProfile.tsx");
const directory = read("src/services/animalDirectoryService.ts");
const dashboard = read("src/hooks/useHomeDashboard.ts");
const home = read("src/components/Home/HomeCurrentAnimalSection.tsx");
const collection = read("src/pages/MyAnimals.tsx");
const feedback = read("src/pages/Feedback.tsx");

assert.match(profile, /updateUserAnimal\(/, "Universal animals need an editable record journey");
assert.match(profile, /setRetryCount\(/, "Profile must provide failed-load retry");
assert.match(profile, /if \(loadError\)/, "A failed network request must not masquerade as a missing animal");
assert.match(profile, /Detailed weight, feeding/, "Unsupported universal histories must be labelled");
assert.match(profile, /legacySnake &&/, "Legacy-snake journey must be preserved");
assert.match(directory, /weightRecords: null,[\s\S]*feedingRecords: null,[\s\S]*shedRecords: null,[\s\S]*healthRecords: null/, "Unknown tracker history must not appear as four fabricated zeros");
assert.match(dashboard, /snake\.weightRecords \?\? 0/, "Dashboard must explicitly account for unavailable histories");
assert.match(home, /Care history not yet linked/, "Home must describe unavailable care data honestly");
assert.match(collection, /loadFailed \?/, "My Animals must preserve failed-load state");
assert.match(collection, /setMessageKind\("error"\)/, "My Animals must label errors correctly");
assert.match(feedback, /appVersion: packageInfo\.version/, "Feedback must not report fictitious 0.0.0 version");
assert.match(feedback, /releaseCommit/, "Feedback must identify the deployed commit when available");
console.log("App-wide keeper journey contracts passed.");
