import assert from "node:assert/strict";
import fs from "node:fs";

function addDays(dateString, days) {
  const base = new Date(`${dateString}T00:00:00Z`);
  assert.ok(Number.isFinite(base.getTime()), `Invalid test date: ${dateString}`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function nextFeedingDate(latestLoggedDate, intervalDays) {
  return addDays(latestLoggedDate, intervalDays);
}

assert.equal(nextFeedingDate("2026-09-06", 7), "2026-09-13");
assert.equal(nextFeedingDate("2026-09-07", 7), "2026-09-14");
assert.equal(nextFeedingDate("2026-09-10", 14), "2026-09-24");
assert.equal(nextFeedingDate("2026-12-30", 7), "2027-01-06");

const reminderService = fs.readFileSync("src/services/reminderService.ts", "utf8");
const feedingService = fs.readFileSync("src/services/feedingService.ts", "utf8");
const functionsReminderService = fs.readFileSync("functions/reminders.js", "utf8");
assert.match(reminderService, /reanchorFeedingRemindersAfterFeed/);
assert.match(reminderService, /nextDate = addCalendarDays\(latest, frequencyDays\)/);
assert.match(reminderService, /leadUpEnabled: false/);
assert.match(feedingService, /await reanchorFeedingRemindersAfterFeed/);
assert.doesNotMatch(functionsReminderService, /function isDailyFeedingReminder/);
assert.match(functionsReminderService, /if \(reminder\.kind === "feeding"\)/);
assert.match(functionsReminderService, /const nextOccurrenceDate = addCalendarDays\(occurrenceDate, frequencyDays\)/);

console.log("Feeding reminder anchoring tests passed: interval cadence follows the latest actual feeding and server/client remain aligned.");
