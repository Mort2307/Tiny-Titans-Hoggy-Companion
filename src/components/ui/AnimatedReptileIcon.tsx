import './animatedReptileIcon.css';
import type { SVGProps } from "react";

export type TitanIconKind =
  | "snake"
  | "feed"
  | "shed"
  | "weight"
  | "water"
  | "health"
  | "genetics"
  | "breeding"
  | "morphs"
  | "vivarium"
  | "reminder";

type Props = SVGProps<SVGSVGElement> & {
  kind: TitanIconKind;
  speciesId?: string;
  label?: string;
};

function snakePreset(speciesId = "heterodon-nasicus") {
  if (speciesId === "python-regius") return "python";
  if (speciesId === "morelia-viridis" || speciesId === "corallus-batesii" || speciesId === "corallus-caninus") return "arboreal";
  if (speciesId === "eunectes-murinus" || speciesId === "boa-constrictor" || speciesId === "boa-imperator") return "heavy";
  if (speciesId === "bitis-gabonica") return "broad";
  if (speciesId.includes("thamnophis") || speciesId.includes("pantherophis") || speciesId === "lampropeltis-californiae") return "slender";
  return "hognose";
}

function SnakeArt({ speciesId = "heterodon-nasicus" }: { speciesId?: string }) {
  const preset = snakePreset(speciesId);
  const body = preset === "python"
    ? "M22 68C16 54 27 35 45 39C59 42 63 57 54 68C44 81 23 82 16 70C11 61 16 49 28 47"
    : preset === "arboreal"
      ? "M16 70C13 51 27 30 48 34C66 38 64 56 51 61C38 66 26 57 30 46C35 31 58 27 70 38"
      : preset === "heavy"
        ? "M16 69C7 51 22 29 46 34C65 38 70 56 58 69C47 81 20 82 14 68"
        : "M15 69C12 56 22 44 37 46C52 48 61 62 54 72C45 84 22 81 16 70C12 63 15 53 22 50";
  const headPath = preset === "hognose"
    ? "M43 39C45 32 52 29 60 31L70 35L61 40L53 39L48 45Z"
    : preset === "broad"
      ? "M43 39C48 30 60 27 69 34L74 41L63 45L51 43L46 48Z"
      : "M43 40C48 33 58 31 66 35L70 41L61 45L51 43L46 48Z";
  return (
    <g className={`tt-icon-snake-art tt-icon-snake-art--${preset}`}>
      <path className="tt-icon-stroke tt-icon-snake-body" d={body} />
      <path className="tt-icon-snake-head" d={headPath} />
      <circle className="tt-icon-snake-eye" cx="62" cy="36" r="1.9" />
      <path className="tt-icon-snake-tongue" d="M70 39L78 37M78 37L81 35M78 37L81 39" />
      {preset === "python" && <path className="tt-icon-pattern" d="M21 58C31 52 41 54 51 60M25 69C34 63 45 65 55 70" />}
      {preset === "arboreal" && <path className="tt-icon-pattern" d="M22 66C34 57 46 53 59 48M28 73C42 66 54 60 67 50" />}
      {preset === "heavy" && <path className="tt-icon-pattern" d="M18 59C31 50 47 51 61 59M19 69C32 61 46 62 57 69" />}
      {preset === "hognose" && <path className="tt-icon-pattern" d="M19 64C28 57 39 58 49 65M22 73C31 68 41 69 49 74" />}
    </g>
  );
}

function FeedArt() {
  return (
    <g className="tt-icon-feed-art">
      <ellipse className="tt-icon-feed-prey" cx="26" cy="57" rx="10" ry="7" />
      <circle className="tt-icon-feed-prey-head" cx="34" cy="54" r="5" />
      <circle className="tt-icon-feed-eye" cx="36" cy="52.5" r="1" />
      <path className="tt-icon-feed-tail" d="M17 58C10 61 10 68 16 70" />
      <path className="tt-icon-feed-ear" d="M31 50L30 46L34 48Z" />
      <path className="tt-icon-feed-ear" d="M36 49L37 45L40 49Z" />
      <path className="tt-icon-feed-snake" d="M36 69C48 68 56 59 53 50C50 41 39 41 34 47C30 51 32 58 38 60C43 62 48 58 46 54" />
      <path className="tt-icon-feed-tongue" d="M53 50L61 47M61 47L64 45M61 47L64 49" />
      <circle className="tt-icon-feed-impact" cx="36" cy="69" r="1.7" />
    </g>
  );
}

export default function AnimatedReptileIcon({ kind, speciesId, label, title, className = "", ...props }: Props) {
  return (
    <svg
      {...props}
      className={`tt-animated-icon tt-animated-icon--${kind} ${className}`.trim()}
      viewBox="0 0 96 96"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-titan-icon={kind}
      data-species-id={speciesId || undefined}
      data-tier-aware="true"
    >
      {title && <title>{title}</title>}
      {kind === "snake" || kind === "shed" ? <SnakeArt speciesId={speciesId} /> : null}
      {kind === "feed" ? <FeedArt /> : null}
      {kind === "weight" && <><path className="tt-icon-stroke" d="M28 38H68L63 72H33Z" /><path className="tt-icon-stroke" d="M36 40C36 25 60 25 60 40" /><path className="tt-icon-accent" d="M48 50V61M48 61L42 57M48 61L54 57" /></>}
      {kind === "water" && <><path className="tt-icon-stroke" d="M48 18C42 29 28 42 28 55C28 67 37 76 48 76C59 76 68 67 68 55C68 42 54 29 48 18Z" /><path className="tt-icon-accent" d="M36 60C42 65 53 67 61 60" /></>}
      {kind === "health" && <><path className="tt-icon-stroke" d="M16 50H29L35 34L45 66L53 42L58 50H80" /><path className="tt-icon-accent" d="M25 72C38 82 58 82 71 72" /></>}
      {kind === "genetics" && <><path className="tt-icon-stroke" d="M30 22C61 34 35 62 66 74M66 22C35 34 61 62 30 74" /><path className="tt-icon-accent" d="M36 31H60M36 47H60M36 63H60" /></>}
      {kind === "breeding" && <><path className="tt-icon-stroke" d="M48 18C38 26 35 34 39 41C44 50 58 47 59 58C60 68 51 75 48 78" /><path className="tt-icon-accent" d="M48 18C58 26 61 34 57 41C52 50 38 47 37 58C36 68 45 75 48 78" /></>}
      {kind === "morphs" && <><path className="tt-icon-stroke" d="M25 60C25 39 36 27 48 27C60 27 71 39 71 60C71 70 61 77 48 77C35 77 25 70 25 60Z" /><path className="tt-icon-accent" d="M34 58C40 48 56 48 62 58M37 67C43 60 53 60 59 67" /></>}
      {kind === "vivarium" && <><path className="tt-icon-stroke" d="M21 27H75V75H21Z" /><path className="tt-icon-accent" d="M31 64C35 53 42 50 48 58C53 50 60 54 65 44M35 35V52M61 34V50" /></>}
      {kind === "reminder" && <><path className="tt-icon-stroke" d="M28 65H68C62 59 61 53 61 46C61 37 56 30 48 30C40 30 35 37 35 46C35 53 34 59 28 65Z" /><path className="tt-icon-accent" d="M43 72C43 76 53 76 53 72" /></>}
    </svg>
  );
}
