import { useMemo } from "react";
import { useLiveWorldTime } from "../context/WorldTimeContext";

export default function LiveWorldClockBadge() {
  const world = useLiveWorldTime();
  const compactDate = useMemo(() => new Intl.DateTimeFormat("en-GB", {
    timeZone: world.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(world.observedAt), [world.observedAt, world.timezone]);

  const dayPhaseIcon = world.localHour >= 7 && world.localHour < 19 ? "☀️" : "🌙";
  const title = `Live local time and date · ${world.localDate} · ${world.timezoneLabel} · ${world.utcOffsetLabel}${world.dstActive ? " · daylight saving time active" : ""}`;

  return (
    <div
      className="tt-live-world-clock"
      title={title}
      aria-label={`Live local time ${world.localTime}, ${compactDate}, ${world.timezoneLabel}, ${world.utcOffsetLabel}`}
    >
      <span className="tt-live-world-clock-dot" aria-hidden="true" />
      <span className="tt-live-world-clock-copy">
        <span className="tt-live-world-clock-date"><span aria-hidden="true">{dayPhaseIcon}</span>{compactDate}</span>
        <strong>{world.localTime}</strong>
        <small>{world.timezoneLabel} · {world.utcOffsetLabel}</small>
      </span>
    </div>
  );
}
