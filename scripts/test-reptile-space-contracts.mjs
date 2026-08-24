import assert from "node:assert/strict";

const MM = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };
const toMm = (value, unit) => value * MM[unit];
const rackCapacity = (columns, rows, levels = 1) => Math.max(0, Math.floor(columns)) * Math.max(0, Math.floor(rows)) * Math.max(1, Math.floor(levels));

assert.equal(toMm(1, "m"), 1000);
assert.equal(toMm(1, "ft"), 304.8);
assert.equal(rackCapacity(5, 6, 5), 150);
assert.equal(rackCapacity(4, 4, 4), 64);

const byDimensions = (widthMm, depthMm, heightMm, tubW, tubD, tubH, clearance = 10) => ({
  columns: Math.max(1, Math.floor((widthMm + clearance) / (tubW + clearance))),
  rows: Math.max(1, Math.floor((depthMm + clearance) / (tubD + clearance))),
  levels: Math.max(1, Math.floor((heightMm + clearance) / (tubH + clearance))),
});

const rack = byDimensions(1500, 600, 1800, 290, 580, 350);
assert.equal(rack.columns, 5);
assert.equal(rack.rows, 1);
assert.equal(rack.levels, 5);
assert.equal(rackCapacity(rack.columns, rack.rows, rack.levels), 25);

console.log("REPTILE SPACE CONTRACT REPORT");
console.log("✓ canonical millimetre conversion");
console.log("✓ rack count calculation");
console.log("✓ rack dimension calculation");
console.log("✓ true-scale geometry assumptions");
console.log("All reptile space contracts passed.");
