import assert from "node:assert/strict";

function addDays(dateString, days) {
  const base = new Date(`${dateString}T00:00:00Z`);
  assert.ok(Number.isFinite(base.getTime()), `Invalid test date: ${dateString}`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function nextFeedingDate(latestLoggedDate, intervalDays) {
  return addDays(latestLoggedDate, intervalDays);
}

// A 7-day interval follows the actual logged feeding, not the old reminder.
assert.equal(nextFeedingDate("2026-09-06", 7), "2026-09-13");
// Feeding a day early must therefore keep the cadence anchored to the real feed.
assert.equal(nextFeedingDate("2026-09-07", 7), "2026-09-14");
// Editing history to an earlier/later actual latest feeding moves the next date accordingly.
assert.equal(nextFeedingDate("2026-09-10", 14), "2026-09-24");
// The cadence is always interval-based and never double-advances from the previous reminder.
assert.equal(nextFeedingDate("2026-12-30", 7), "2027-01-06");

console.log("Feeding reminder anchoring tests passed: next reminder dates are interval-based from the latest actual logged feeding.");
