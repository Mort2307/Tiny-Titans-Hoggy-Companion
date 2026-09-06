import assert from "node:assert/strict";
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const file = path.resolve("src/intelligence/v50/titanProactiveEngine.ts");
const source = fs.readFileSync(file, "utf8");
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports, require, console, Date, Number, Math });
const { buildTitanProactiveIntelligence } = module.exports;

assert.equal(typeof buildTitanProactiveIntelligence, "function", "engine export missing");

const empty = buildTitanProactiveIntelligence({ counts: { snakes: 0, weights: 0, feedings: 0, sheds: 0, health: 0, behaviour: 0, husbandry: 0, breeding: 0 } });
assert.ok(empty.recommendations.some((item) => item.destination === "/snakes/new"), "empty collection should recommend adding a first animal");

const starter = buildTitanProactiveIntelligence({ counts: { snakes: 1, weights: 0, feedings: 0, sheds: 0, health: 0, behaviour: 0, husbandry: 0, breeding: 0 } });
assert.ok(starter.signals.some((item) => item.id === "no-weight-baseline"), "missing weight baseline should create a record-keeping signal");
assert.ok(starter.recommendations.some((item) => item.destination === "/weights"), "missing weight baseline should point to the real weight route");
assert.ok(starter.recommendations.some((item) => item.destination === "/feeding"), "missing feeding history should point to the real feeding route");
assert.ok(starter.recommendations.some((item) => item.destination === "/shedding"), "missing shed history should point to the real shed route");

const connected = buildTitanProactiveIntelligence({
  counts: { snakes: 1, weights: 3, feedings: 3, sheds: 2, health: 0, behaviour: 0, husbandry: 0, breeding: 0 },
  recentEventTypes: ["FeedingRecorded", "WeightRecorded"],
});
assert.ok(connected.signals.some((item) => item.id === "feeding-weight-context"));
assert.ok(connected.signals.some((item) => item.id === "weight-feeding-context"));
assert.equal(connected.signals.find((item) => item.id === "feeding-weight-context")?.actionPath, "/weights");
assert.equal(connected.signals.find((item) => item.id === "weight-feeding-context")?.actionPath, "/feeding");
assert.ok(connected.context.relevantRoutes.includes("/husbandry"));
assert.ok(connected.context.relevantRoutes.includes("/feeding"));
assert.ok(connected.context.relevantRoutes.includes("/weights"));
assert.equal(connected.context.animalId, undefined);

const crossDomain = buildTitanProactiveIntelligence({
  counts: { snakes: 1, weights: 3, feedings: 3, sheds: 2, health: 0, behaviour: 2, husbandry: 2, breeding: 1 },
  recentEventTypes: ["ShedRecorded", "BehaviourObserved", "MicroclimateRecorded", "GeneticsChanged", "BreedingProjectChanged"],
  animalId: "demo-animal",
  speciesId: "western-hognose",
});
assert.ok(crossDomain.signals.some((item) => item.id === "shed-weight-context"));
assert.ok(crossDomain.signals.some((item) => item.id === "behaviour-context"));
assert.ok(crossDomain.signals.some((item) => item.id === "microclimate-shed-context"));
assert.ok(crossDomain.signals.some((item) => item.id === "genetics-breeding-context"));
assert.ok(crossDomain.signals.some((item) => item.id === "breeding-species-context"));
assert.ok(crossDomain.context.relevantRoutes.includes("/breeding"));
assert.ok(crossDomain.context.relevantRoutes.includes("/behaviour"));

const stale = buildTitanProactiveIntelligence({
  counts: { snakes: 1, weights: 2, feedings: 2, sheds: 2, health: 1, behaviour: 1, husbandry: 1, breeding: 0 },
  staleAreas: ["Weight", "Husbandry"],
  animalId: "demo-animal",
});
assert.equal(stale.context.animalId, "demo-animal");
assert.equal(stale.recommendations.find((item) => item.id === "stale-weight")?.destination, "/weights");
assert.equal(stale.recommendations.find((item) => item.id === "stale-husbandry")?.destination, "/husbandry");

console.log("✅ Titan proactive intelligence contract tests passed.");
