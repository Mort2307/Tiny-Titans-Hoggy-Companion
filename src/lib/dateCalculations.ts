export const DAY_MS = 86_400_000;

export function dateMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function daysAgo(value?: string | null, now = new Date()): number | null {
  const ms = dateMs(value);
  if (ms === null) return null;
  const nowStart = dateMs(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
  return nowStart === null ? null : Math.max(0, Math.floor((nowStart - ms) / DAY_MS));
}

export function calendarAgo(value?: string | null, now = new Date()): string {
  const ms = dateMs(value);
  if (ms === null) return "Not recorded";
  const start = new Date(ms);
  if (start > now) return "Not recorded";
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  const years = Math.floor(months / 12);
  months %= 12;
  return [
    years ? `${years} Year${years === 1 ? "" : "s"}` : "",
    months ? `${months} Month${months === 1 ? "" : "s"}` : "",
    days ? `${days} Day${days === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(" ") || "0 Days";
}

export function ageLabel(value?: string | null, now = new Date()): string {
  if (!value) return "-";
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return "-";
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "Not yet hatched";
  return [
    years ? `${years} year${years === 1 ? "" : "s"}` : "",
    months ? `${months} month${months === 1 ? "" : "s"}` : "",
    days ? `${days} day${days === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(", ") || "0 days";
}

export function timeWithKeeperLabel(value?: string | null, now = new Date()): string {
  return calendarAgo(value, now);
}