import { UNIVERSAL_SPECIES } from "../src/data/species/universalSpeciesRegistry";
import {
  getSpeciesVariationLibraryCoverage,
  getSpeciesVariationLibraryStatus,
  getSpeciesVisualMorphs,
} from "../src/data/species/speciesGenetics";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error("[variation-library] " + message);
}

let complete = 0;
let researchRequired = 0;
let reviewedWithoutEstablishedVariants = 0;

for (const species of UNIVERSAL_SPECIES) {
  const entries = getSpeciesVisualMorphs(species.id);
  const status = getSpeciesVariationLibraryStatus(species.id);
  const coverage = getSpeciesVariationLibraryCoverage(species.id);

  assert(entries.length >= 1, species.id + " has no Morph & Variation Library record.");
  assert(
    entries.some((entry) => entry.geneId === "normal"),
    species.id + " is missing its species-specific Wild Type / Unclassified baseline.",
  );
  assert(coverage.speciesId === species.id, species.id + " variation coverage resolved to the wrong species.");
  assert(
    coverage.imagePolicy === "community-submissions-only",
    species.id + " does not enforce the community-only image policy.",
  );

  const serialized = JSON.stringify(entries);
  assert(!serialized.includes('"imageUrl"'), species.id + " embeds catalogue imagery.");
  assert(!serialized.includes("data:image/"), species.id + " embeds copied image data.");

  if (status === "catalogued") {
    complete += 1;
    assert(entries.length > 1, species.id + " is marked complete but has no documented variations beyond baseline.");
  } else if (status === "reviewed-no-established-variants") {
    reviewedWithoutEstablishedVariants += 1;
  } else {
    researchRequired += 1;
    assert(
      coverage.exhaustiveReviewRequired === true,
      species.id + " must remain visibly queued for exhaustive variation review.",
    );
  }
}

console.log("Universal Morph & Variation Library contract: PASS");
console.log("  Species library surfaces: " + UNIVERSAL_SPECIES.length);
console.log("  Exhaustive reviews complete: " + complete);
console.log("  Reviewed with no established captive variants: " + reviewedWithoutEstablishedVariants);
console.log("  Exhaustive variation reviews required: " + researchRequired);
console.log("  Image policy: approved community/user submissions only; catalogue-owned/copied images are forbidden.");
