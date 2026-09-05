const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DMY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export const USER_DATE_FORMAT = "DD-MM-YYYY";

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

export function formatDateForUser(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const iso = trimmed.match(ISO_DATE_PATTERN);
  if (!iso) return trimmed;
  const [, year, month, day] = iso;
  if (!isValidCalendarDate(Number(year), Number(month), Number(day))) return trimmed;
  return `${day}-${month}-${year}`;
}

export function parseUserDate(value: string): string | null {
  const trimmed = value.trim();
  const dmy = trimmed.match(DMY_DATE_PATTERN);
  if (dmy) {
    const [, day, month, year] = dmy;
    if (!isValidCalendarDate(Number(year), Number(month), Number(day))) return null;
    return `${year}-${month}-${day}`;
  }

  const iso = trimmed.match(ISO_DATE_PATTERN);
  if (iso) {
    const [, year, month, day] = iso;
    return isValidCalendarDate(Number(year), Number(month), Number(day)) ? trimmed : null;
  }

  return null;
}

export function isFutureDate(value: string, todayIso: string): boolean {
  const parsed = parseUserDate(value);
  return Boolean(parsed && todayIso && parsed > todayIso);
}
