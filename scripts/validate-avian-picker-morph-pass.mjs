import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const picker = read("src/components/UniversalSpeciesPicker.tsx");
const speciesLibrary = read("src/pages/SpeciesMorphLibrary.tsx");
const universalLibrary = read("src/pages/SpeciesAwareMorphLibrary.tsx");
const hognoseLibrary = read("src/pages/MorphLibrary.tsx");
const genetics = read("src/data/species/speciesGenetics.ts");
const birdResearch = read("src/data/species/speciesGeneticsAvianResearch.ts");
const birdJournal = read("src/components/BirdCareJournal.tsx");
const birdService = read("src/services/avianCareJournalService.ts");
const animalProfile = read("src/pages/UniversalAnimalProfile.tsx");
const addAnimal = read("src/pages/MyAnimals.tsx");

assert.match(picker, /role="combobox"/, "Type/search input must be an accessible combobox");
assert.match(picker, /Browse by animal group/, "Species can be browsed without typing");
assert.match(picker, /Show more species/, "Browse can paginate past the first result page");
assert.match(picker, /aria-activedescendant/, "Keyboard selection state must be accessible");
assert.match(picker, /onKeyDown/, "Search must support keyboard selection");

const mobileExperience = read("src/styles/mobile-experience-v2.css");
const pickerRowFix = mobileExperience.split("SPECIES PICKER — OVERLAPPING TWO-LINE RESULTS")[1] || "";
assert.match(picker, /className="universal-species-picker__name"/, "Species option must expose its name as a separate row");
assert.match(picker, /className="universal-species-picker__meta"/, "Scientific name and taxonomy must have a separate row");
assert.match(pickerRowFix, /grid-auto-rows:\s*max-content;/, "Picker list rows must grow to fit content");
assert.match(pickerRowFix, /flex-direction:\s*column;/, "Each species option must stack name and taxonomy");
assert.match(pickerRowFix, /height:\s*auto\s*!important;/, "Legacy button fixed heights cannot clip options");
assert.match(pickerRowFix, /max-height:\s*none\s*!important;/, "Picker options must not cap taxonomy text");
assert.match(pickerRowFix, /overflow-wrap:\s*anywhere;/, "Scientific and common names must wrap at phone width");
assert.match(pickerRowFix, /opacity:\s*1;/, "Secondary labels must remain clearly legible");


assert.match(universalLibrary, /UniversalSpeciesPicker/, "Morph library needs universal species chooser");
assert.match(universalLibrary, /searchParams\.get\("species"\)/, "Morph library must support species deep links");
assert.match(speciesLibrary, /getSpeciesVisualMorphs/, "Morph entries must remain species-scoped");
assert.match(speciesLibrary, /Submit mutation \/ information/, "All animals need a mutation submission tile");
assert.match(speciesLibrary, /openImageSubmission\("normal"\)/, "Wild Type should accept user images");
assert.match(hognoseLibrary, /Contribute to Western Hognose research/, "Hognose library retains contributions");
assert.match(genetics, /normalTrait\(name\)/, "All universal animals need Wild Type baseline");
assert.match(genetics, /getSpeciesRecord\(speciesId\)\?\.className === "bird"\) return \[\]/, "Avian calculator probabilities must be disabled");
assert.match(birdResearch, /geneId: "violet"/);
assert.match(birdResearch, /geneId: "cleartail"/);
assert.match(birdResearch, /geneId: "violet-cleartail"/);
assert.match(birdResearch, /sourceUrl:/, "Avian mutation records require source citations");
assert.match(birdService, /resolveDataOwnerUid/, "Avian journals remain owner scoped");
assert.match(birdService, /avianCareObservations/, "Avian observations use separate care records");
assert.match(birdService, /VALID_CATEGORIES/, "Avian journals reject unknown categories");
assert.match(birdJournal, /deleteAvianObservation/, "Bird keeper can remove their own records");
assert.match(birdJournal, /ConfirmActionDialog/, "Deleting entries requires explicit confirmation");
assert.match(animalProfile, /BirdCareJournal/, "Bird profiles expose journal");
assert.match(addAnimal, /Ring \/ individual identifier/, "Bird form supports an identifier");
assert.match(addAnimal, /Browse \{selectedSpecies\.commonNames\[0\]\}/, "My Animals links to species mutation library");

for(const file of [speciesLibrary, hognoseLibrary, birdResearch]) {
  assert.doesNotMatch(file, /unsplash\.com|pexels\.com|pixabay\.com|images\.google\.com/, "No online stock images in animal libraries");
}
console.log("Avian + universal mutation + combobox workflow contracts passed.");
