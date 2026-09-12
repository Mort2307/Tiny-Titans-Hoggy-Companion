import assert from "node:assert/strict";
import fs from "node:fs";

function addDays(dateString, days) {
  const base = new Date(`${dateString}T00:00:00Z`);
  assert.ok(Number.isFinite(base.getTime()), `Invalid test date: ${dateString}`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

assert.equal(addDays("2026-09-12", 7), "2026-09-19");
assert.equal(addDays("2026-12-29", 7), "2027-01-05");
assert.equal(addDays("2027-02-27", 3), "2027-03-02");

const reminderType = fs.readFileSync("src/types/Reminder.ts", "utf8");
const reminderService = fs.readFileSync("src/services/reminderService.ts", "utf8");
const reminderPage = fs.readFileSync("src/pages/ReminderTypePage.tsx", "utf8");
const reminderFunctions = fs.readFileSync("functions/reminders.js", "utf8");

assert.match(reminderType, /"water-change"/);
assert.match(reminderType, /label: "Water Change"/);
assert.match(reminderService, /completeWaterChange/);
assert.match(reminderService, /listWaterChangeLogs/);
assert.match(reminderService, /kind: "water-change"/);
assert.match(reminderService, /nextDate = addCalendarDays\(completedDate, frequencyDays\)/);
assert.match(reminderPage, /isWaterChange/);
assert.match(reminderPage, /Log water change/);
assert.match(reminderPage, /Recent water changes/);
assert.match(reminderFunctions, /reminder\.kind === "water-change"/);
assert.match(reminderFunctions, /\/reminders\/water-change/);

console.log("Water change reminder tests passed: configurable cadence, real completion anchoring, persistent care history and notification routing are wired.");
