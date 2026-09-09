import assert from "node:assert/strict";
import { getTimezoneOffsetMinutes, getWorldTimeSnapshot, isValidTimezone } from "../src/services/worldTimeService.ts";

function testOffset(iso: string, timezone: string, expectedMinutes: number) {
  const actual = getTimezoneOffsetMinutes(new Date(iso), timezone);
  assert.equal(actual, expectedMinutes, `${timezone} offset for ${iso} should be ${expectedMinutes} minutes, got ${actual}`);
}

assert.equal(isValidTimezone("Europe/London"), true);
assert.equal(isValidTimezone("America/New_York"), true);
assert.equal(isValidTimezone("Not/A_Timezone"), false);

testOffset("2026-09-09T12:00:00Z", "Europe/London", 60);
testOffset("2026-12-09T12:00:00Z", "Europe/London", 0);
testOffset("2026-09-09T12:00:00Z", "America/New_York", -240);
testOffset("2026-12-09T12:00:00Z", "America/New_York", -300);

const londonMorning = getWorldTimeSnapshot(new Date("2026-09-09T08:30:45Z"), "Europe/London");
assert.equal(londonMorning.localDateKey, "2026-09-09");
assert.equal(londonMorning.localWeekday, "Wednesday");
assert.equal(londonMorning.localHour, 9);
assert.equal(londonMorning.offsetMinutes, 60);
assert.equal(londonMorning.utcOffsetLabel, "UTC+1");
assert.equal(londonMorning.dstActive, true);
assert.equal(londonMorning.isWeekend, false);
assert.equal(londonMorning.localTimePeriod, "morning");

const londonNight = getWorldTimeSnapshot(new Date("2026-09-09T22:30:00Z"), "Europe/London");
assert.equal(londonNight.localDateKey, "2026-09-09");
assert.equal(londonNight.localTimePeriod, "night");

const newYears = getWorldTimeSnapshot(new Date("2026-12-31T23:30:00Z"), "America/Los_Angeles");
assert.equal(newYears.localDateKey, "2026-12-31");
assert.equal(newYears.offsetMinutes, -480);
assert.equal(newYears.utcOffsetLabel, "UTC-8");

console.log("✓ World Time Intelligence: timezone validation, DST offsets, local calendar state and period classification passed");
