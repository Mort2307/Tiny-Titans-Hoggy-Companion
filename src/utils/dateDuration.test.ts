import { describe, expect, it } from "vitest";
import { getDateDuration } from "./dateDuration";

describe("getDateDuration", () => {
  it("handles missing and invalid dates safely", () => {
    expect(getDateDuration("")).toBe("-");
    expect(getDateDuration("not-a-date")).toBe("-");
  });

  it("does not report a future date as elapsed time", () => {
    expect(getDateDuration("2027-01-01", new Date("2026-08-13T12:00:00"))).toBe("Not yet");
  });

  it("returns Today for the same calendar date", () => {
    expect(getDateDuration("2026-08-13", new Date("2026-08-13T18:00:00"))).toBe("Today");
  });

  it("uses weeks for short periods", () => {
    expect(getDateDuration("2026-08-01", new Date("2026-08-13T12:00:00"))).toBe("1 week, 5 days");
  });

  it("uses calendar years and months for longer periods", () => {
    expect(getDateDuration("2025-05-13", new Date("2026-08-13T12:00:00"))).toBe("1 year, 3 months");
  });
});
