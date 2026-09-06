import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reactive = fs.readFileSync(path.join(root, "src", "services", "titanReactiveIntelligenceService.ts"), "utf8");
const behaviour = fs.readFileSync(path.join(root, "src", "services", "behaviourService.ts"), "utf8");
const weight = fs.readFileSync(path.join(root, "src", "services", "weightService.ts"), "utf8");
const feeding = fs.readFileSync(path.join(root, "src", "services", "feedingService.ts"), "utf8");
const shed = fs.readFileSync(path.join(root, "src", "services", "shedService.ts"), "utf8");

const findings = [];
for (const symbol of ["BehaviourObserved", "eventAffectsCategory", "invalidateTitanV50CacheForAnimal", "tinyTitansEventBus.emit"]) {
  if (!reactive.includes(symbol)) findings.push(`Reactive intelligence boundary missing: ${symbol}`);
}
for (const symbol of ["BehaviourObserved", "saveSnakeBehaviourRecord", "deleteSnakeBehaviourRecord", "emitTitanIntelligenceEvent"]) {
  if (!behaviour.includes(symbol)) findings.push(`Behaviour service missing reactive event contract: ${symbol}`);
}
for (const [name, source, marker] of [
  ["weight", weight, "emitTitanIntelligenceEvent({ uid, animalId: weight.snakeId, type: \"WeightRecorded\""],
  ["feeding", feeding, "emitTitanIntelligenceEvent({ uid, animalId: feeding.snakeId, type: \"FeedingRecorded\""],
  ["shed", shed, "emitTitanIntelligenceEvent({ uid, animalId: cycle.snakeId, type: \"ShedRecorded\""]
]) {
  if (!source.includes(marker)) findings.push(`${name} service no longer emits its reactive intelligence event.`);
}

console.log(JSON.stringify({ test: "titan-reactive-event-contract", status: findings.length ? "fail" : "pass", findings }, null, 2));
if (findings.length) process.exit(1);
