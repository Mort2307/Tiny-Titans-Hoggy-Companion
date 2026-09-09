export type LocalTimePeriod = "late-night" | "morning" | "afternoon" | "evening" | "night";

export type WorldTimeSnapshot = {
  observedAt: Date;
  timezone: string;
  offsetMinutes: number;
  utcOffsetLabel: string;
  localDateKey: string;
  localTime: string;
  localDate: string;
  localWeekday: string;
  localHour: number;
  localMinute: number;
  localTimePeriod: LocalTimePeriod;
  timezoneLabel: string;
  dstActive: boolean;
  isWeekend: boolean;
  utcHour: number;
  solarDeclination: number;
  subsolarLongitude: number;
};

const FALLBACK_TIMEZONE = "UTC";

export function getDetectedTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timezone === "string" && timezone.trim() ? timezone : FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getTimezoneOffsetMinutes(date: Date, timezone = getDetectedTimezone()): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

function getSolarState(date: Date): Pick<WorldTimeSnapshot, "utcHour" | "solarDeclination" | "subsolarLongitude"> {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const daysSinceJ2000 = (day - Date.UTC(2000, 0, 1, 12)) / 86400000 + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
  const meanLongitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  const meanAnomaly = (357.528 + 0.9856003 * daysSinceJ2000) * Math.PI / 180;
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * Math.PI / 180;
  const obliquity = (23.439 - 0.0000004 * daysSinceJ2000) * Math.PI / 180;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) * 180 / Math.PI;

  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const raDegrees = ((rightAscension * 180 / Math.PI) + 360) % 360;
  const equationOfTimeMinutes = 4 * (((meanLongitude - raDegrees + 540) % 360) - 180);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  // The subsolar longitude is positive east longitude. At 12:00 UTC it is
  // near 0°, and every hour later the point directly under the Sun moves
  // roughly 15° west. The previous implementation was 180° out of phase.
  const subsolarLongitude = (720 - utcMinutes - equationOfTimeMinutes) / 4;
  return {
    utcHour: date.getUTCHours() + date.getUTCMinutes() / 60,
    solarDeclination: declination,
    subsolarLongitude: ((subsolarLongitude + 540) % 360) - 180,
  };
}

function getPeriod(hour: number): LocalTimePeriod {
  if (hour < 6) return "late-night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes > 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function getWorldTimeSnapshot(now = new Date(), timezone = getDetectedTimezone()): WorldTimeSnapshot {
  const safeTimezone = isValidTimezone(timezone) ? timezone : FALLBACK_TIMEZONE;
  const offsetMinutes = getTimezoneOffsetMinutes(now, safeTimezone);
  const dateParts = new Intl.DateTimeFormat("en-GB", { timeZone: safeTimezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const values = Object.fromEntries(dateParts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const localHour = Number(values.hour) % 24;
  const localMinute = Number(values.minute);
  const dateKey = `${values.year}-${values.month}-${values.day}`;
  const localDate = new Intl.DateTimeFormat("en-GB", { timeZone: safeTimezone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: safeTimezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  const timezoneLabel = new Intl.DateTimeFormat("en-GB", { timeZone: safeTimezone, timeZoneName: "long" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value || safeTimezone;
  const januaryOffset = getTimezoneOffsetMinutes(new Date(Date.UTC(now.getUTCFullYear(), 0, 15, 12)), safeTimezone);
  const julyOffset = getTimezoneOffsetMinutes(new Date(Date.UTC(now.getUTCFullYear(), 6, 15, 12)), safeTimezone);
  const dstActive = offsetMinutes !== Math.min(januaryOffset, julyOffset);
  return {
    observedAt: now,
    timezone: safeTimezone,
    offsetMinutes,
    utcOffsetLabel: formatUtcOffset(offsetMinutes),
    localDateKey: dateKey,
    localTime,
    localDate,
    localWeekday: values.weekday,
    localHour,
    localMinute,
    localTimePeriod: getPeriod(localHour),
    timezoneLabel,
    dstActive,
    isWeekend: values.weekday === "Saturday" || values.weekday === "Sunday",
    ...getSolarState(now),
  };
}
