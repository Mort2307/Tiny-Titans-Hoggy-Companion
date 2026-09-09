export type WorldTimeSnapshot = {
  observedAt: Date;
  timezone: string;
  offsetMinutes: number;
  localDateKey: string;
  localTime: string;
  localDate: string;
  timezoneLabel: string;
  dstActive: boolean;
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
  const subsolarLongitude = -((utcMinutes + equationOfTimeMinutes) / 4);
  return {
    utcHour: date.getUTCHours() + date.getUTCMinutes() / 60,
    solarDeclination: declination,
    subsolarLongitude: ((subsolarLongitude + 540) % 360) - 180,
  };
}

export function getWorldTimeSnapshot(now = new Date(), timezone = getDetectedTimezone()): WorldTimeSnapshot {
  const safeTimezone = isValidTimezone(timezone) ? timezone : FALLBACK_TIMEZONE;
  const offsetMinutes = getTimezoneOffsetMinutes(now, safeTimezone);
  const dateKeyParts = new Intl.DateTimeFormat("en-CA", { timeZone: safeTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const dateKey = `${dateKeyParts.find((p) => p.type === "year")?.value}-${dateKeyParts.find((p) => p.type === "month")?.value}-${dateKeyParts.find((p) => p.type === "day")?.value}`;
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
    localDateKey: dateKey,
    localTime,
    localDate,
    timezoneLabel,
    dstActive,
    ...getSolarState(now),
  };
}
