import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(source, needle, description) {
  if (!source.includes(needle)) {
    throw new Error(`User-error contract failed: ${description} (missing ${needle})`);
  }
}

const firebaseError = read("src/utils/firebaseError.ts");
const universalAnimalService = read("src/services/universalAnimalService.ts");
const myAnimals = read("src/pages/MyAnimals.tsx");

assertContains(firebaseError, "SPECIES_ID_MISSING", "Species ID missing has a stable error code");
assertContains(firebaseError, "SPECIES_ID_INVALID", "Species ID invalid has a stable error code");
assertContains(firebaseError, "Unsupported field value:", "Firestore undefined-field failures are recognised");
assertContains(firebaseError, "Species ID error:", "Species ID failures are explicitly labelled for keepers");
assertContains(firebaseError, "Error code:", "Keeper-facing errors expose a support-friendly error code");

assertContains(universalAnimalService, "function removeUndefined", "Universal animal writes sanitise undefined values");
assertContains(universalAnimalService, "removeUndefined({", "Universal animal payloads are cleaned before Firestore");
assertContains(universalAnimalService, "getTinyTitansErrorMessage", "Universal animal writes use the friendly Firebase error layer");
assertContains(universalAnimalService, "SPECIES_ID_INVALID", "Universal animal creation validates supplied Species IDs");

assertContains(myAnimals, "getTinyTitansErrorMessage", "My Animals renders friendly save errors");
assertContains(myAnimals, 'role={messageKind === "error" ? "alert" : "status"}', "Save failures are exposed as accessible alerts");

console.log("User-facing Firebase error contract: PASS");
