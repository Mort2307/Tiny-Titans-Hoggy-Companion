import assert from "node:assert/strict";
import { buildWorldIntelligenceBrief } from "../src/services/worldIntelligenceService.ts";
import { getWorldTimeSnapshot } from "../src/services/worldTimeService.ts";

const morning = getWorldTimeSnapshot(new Date("2026-09-09T08:30:00Z"), "Europe/London");
const lateNight = getWorldTimeSnapshot(new Date("2026-09-09T23:30:00Z"), "Europe/London");

const quiet = buildWorldIntelligenceBrief(lateNight, false);
assert.equal(quiet.tone, "quiet");
assert.match(quiet.eyebrow, /QUIET HOURS/);

const prioritised = buildWorldIntelligenceBrief(morning, true);
assert.equal(prioritised.tone, "attention");
assert.match(prioritised.headline, /next action/i);
assert.match(prioritised.detail, /UTC\+1/);

const neutral = buildWorldIntelligenceBrief(morning, false);
assert.equal(neutral.tone, "neutral");
assert.equal(neutral.eyebrow, "WORLD CONTEXT · MORNING");

console.log("✓ World intelligence context contract validated");
console.log("✓ Quiet-hours behaviour validated");
console.log("✓ Active-decision contextualisation validated");
