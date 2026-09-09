import { useLiveWorldTime } from "../context/WorldTimeContext";

export default function LiveWorldClockBadge() {
  const world = useLiveWorldTime();
  return (
    <div className="tt-live-world-clock" title={`Tiny Titans is using your device timezone: ${world.timezone}`} aria-label={`Live local time ${world.localTime}, ${world.timezoneLabel}, ${world.utcOffsetLabel}`}>
      <span className="tt-live-world-clock-dot" aria-hidden="true" />
      <span className="tt-live-world-clock-copy">
        <strong>{world.localTime}</strong>
        <small>{world.timezone} · {world.utcOffsetLabel}</small>
      </span>
    </div>
  );
}
