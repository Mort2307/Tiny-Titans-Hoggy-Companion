import type { SVGProps } from "react";
import "../styles/tiny-titans-icons.css";

export type TinyTitansIconName =
  | "home"
  | "reptile"
  | "messages"
  | "reminders"
  | "husbandry"
  | "weight"
  | "feeding"
  | "shed"
  | "behaviour"
  | "health"
  | "enclosure"
  | "morph"
  | "genetics"
  | "breeding"
  | "academy"
  | "handbook"
  | "observatory"
  | "contribution"
  | "knowledge"
  | "challenge"
  | "community"
  | "marketplace"
  | "mentorship"
  | "wall"
  | "account"
  | "plans"
  | "billing"
  | "family"
  | "titan"
  | "educator"
  | "creator"
  | "testing"
  | "search"
  | "menu";

type Props = SVGProps<SVGSVGElement> & {
  name: TinyTitansIconName;
  size?: number;
  title?: string;
};

const common = {
  viewBox: "0 0 48 48",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  focusable: "false",
};

function SnakeFace({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} {...props} className={`tt-icon-svg tt-icon-snake ${className}`.trim()}>
      <path className="tt-icon-body" d="M10 28c0-8 6.2-14 14-14s14 6 14 14c0 6-4.7 10-14 10S10 34 10 28Z" />
      <path className="tt-icon-soft" d="M17 22c2-3 12-3 14 0" />
      <ellipse className="tt-icon-eye" cx="18.5" cy="26" rx="2.1" ry="2.7" />
      <ellipse className="tt-icon-eye" cx="29.5" cy="26" rx="2.1" ry="2.7" />
      <circle className="tt-icon-pupil" cx="18.7" cy="26.2" r=".75" />
      <circle className="tt-icon-pupil" cx="29.3" cy="26.2" r=".75" />
      <path className="tt-icon-mouth" d="M19.5 31.2c2.6 2 6.4 2 9 0" />
      <path className="tt-icon-tongue" d="M24 33.2v5m0 0-2.1 2m2.1-2 2.1 2" />
      <path className="tt-icon-scale" d="M8 30c-1.2 0-2.2-1-2.2-2.2S6.8 25.6 8 25.6m32 0c1.2 0 2.2 1 2.2 2.2S41.2 30 40 30" />
    </svg>
  );
}

function SimpleIcon({ name, ...props }: { name: TinyTitansIconName } & SVGProps<SVGSVGElement>) {
  const commonProps = { ...common, ...props };
  switch (name) {
    case "home":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-organic" d="m8 21 16-13 16 13v17H28V28h-8v10H8V21Z" /><path className="tt-icon-line" d="M5.5 23 24 8l18.5 15" /><circle className="tt-icon-spark" cx="24" cy="19" r="2.3" /></svg>;
    case "reptile":
      return <SnakeFace {...props} />;
    case "messages":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-bubble" d="M8 10.5c0-3.1 2.5-5.5 5.6-5.5h15.8c3.1 0 5.6 2.4 5.6 5.5v10c0 3.1-2.5 5.5-5.6 5.5H20l-6.8 5.3.9-5.4h-.5C10.5 25.9 8 23.5 8 20.5v-10Z" /><path className="tt-icon-line" d="M15 13.5h12M15 18.5h8" /><circle className="tt-icon-spark" cx="36" cy="10" r="4" /></svg>;
    case "reminders":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-organic" d="M14 19v-4.2C14 9.4 18.2 6 24 6s10 3.4 10 8.8V19l3 4H11l3-4Z" /><path className="tt-icon-line" d="M19.5 28c.8 3 2.3 4.5 4.5 4.5S27.7 31 28.5 28" /><circle className="tt-icon-dot" cx="24" cy="3.5" r="2" /></svg>;
    case "husbandry":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-leaf" d="M12 34c1-11 7-18 21-20-1 13-8 20-21 20Z" /><path className="tt-icon-line" d="M13 35c5-8 10-13 18-17" /><path className="tt-icon-line-soft" d="M18 28 15 24m8 0-3-4m8 0-2.5-3" /></svg>;
    case "weight":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-gauge" d="M8 31c0-10 7-18 16-18s16 8 16 18v5H8v-5Z" /><path className="tt-icon-line" d="m24 30 6-8M15 36h18" /><circle className="tt-icon-spark" cx="24" cy="30" r="2.5" /></svg>;
    case "feeding":
      return <svg {...commonProps}><ellipse className="tt-icon-fill tt-icon-food" cx="24" cy="31" rx="13" ry="6" /><path className="tt-icon-line" d="M14 29c2-6 7-10 15-10 3 0 5 .7 6.5 2" /><circle className="tt-icon-dot" cx="31" cy="18" r="1.7" /><path className="tt-icon-fill tt-icon-prey" d="M13 17c3-4 8-4 10 0-2 4-7 4-10 0Z" /></svg>;
    case "shed":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-shed" d="M14 34c-4-5-4-13 0-18 4-5 12-6 18-2-3 2-5 4-6 7-2 5-1 9 1 13-4 3-9 3-13 0Z" /><path className="tt-icon-line" d="M14 34c5-3 9-7 11-13 1-3 3-5 7-7" /><path className="tt-icon-tongue" d="m24 19 4-4m-4 4-1.5-4" /></svg>;
    case "behaviour":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-eye" d="M6 24s6.5-10 18-10 18 10 18 10-6.5 10-18 10S6 24 6 24Z" /><circle className="tt-icon-pupil" cx="24" cy="24" r="5" /><circle className="tt-icon-highlight" cx="22.5" cy="22.5" r="1.4" /></svg>;
    case "health":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-heart" d="M24 38 9 24c-5-5 1-15 8-11 3 1.7 5 5 7 8 2-3 4-6.3 7-8 7-4 13 6 8 11L24 38Z" /><path className="tt-icon-line" d="M11 24h6l2.2-4 3.3 8 3-6 2.2 4H37" /></svg>;
    case "enclosure":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-glass" x="7" y="10" width="34" height="28" rx="4" /><path className="tt-icon-line" d="M7 17h34M16 17v21M32 17v21" /><path className="tt-icon-fill tt-icon-leaf" d="M20 31c.5-8 4-12 10-14-.5 7.2-4 11.6-10 14Z" /><path className="tt-icon-line-soft" d="M20 31c3-4 6-7 9-10" /></svg>;
    case "morph":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-scale" d="M24 7 35 13v14L24 33 13 27V13L24 7Z" /><path className="tt-icon-line" d="m18 16 6-3 6 3-6 3-6-3Zm0 7 6-3 6 3-6 3-6-3Zm6 10V20" /></svg>;
    case "genetics":
      return <svg {...commonProps}><path className="tt-icon-line tt-icon-helix" d="M15 8c12 4 6 10 18 14-12 4-6 10-18 18M33 8c-12 4-6 10-18 14 12 4 6 10 18 18" /><path className="tt-icon-line-soft" d="m18 11 12 6M18 18l12 6M18 25l12 6M18 32l12 5" /><circle className="tt-icon-spark" cx="39" cy="10" r="3" /></svg>;
    case "breeding":
      return <svg {...commonProps}><ellipse className="tt-icon-fill tt-icon-egg" cx="18" cy="25" rx="9" ry="13" /><ellipse className="tt-icon-fill tt-icon-egg tt-icon-egg-two" cx="31" cy="27" rx="8" ry="11" /><path className="tt-icon-line" d="M14 25c2-2 4-2 6 0m-3 4c2-2 4-2 6 0" /></svg>;
    case "academy":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-book" d="M9 9c5-3 10-2 15 1v28c-5-3-10-4-15-1V9Zm30 0c-5-3-10-2-15 1v28c5-3 10-4 15-1V9Z" /><path className="tt-icon-line" d="M24 10v28" /><circle className="tt-icon-spark" cx="24" cy="6" r="2" /></svg>;
    case "handbook":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-book" d="M10 8h15c4 0 8 3 8 7v25H17c-4 0-7-2-7-6V8Z" /><path className="tt-icon-line" d="M17 40V15c0-2.5 2-4.5 4.5-4.5M14 18h12m-12 5h12" /><circle className="tt-icon-spark" cx="34" cy="11" r="3" /></svg>;
    case "observatory":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-lens" cx="21" cy="22" r="11" /><circle className="tt-icon-cutout" cx="21" cy="22" r="5" /><path className="tt-icon-line" d="m29 30 9 9m-2-23 5-3" /><path className="tt-icon-spark" d="m38 8 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /></svg>;
    case "contribution":
      return <svg {...commonProps}><path className="tt-icon-line" d="M24 9v24M12 21h24" /><circle className="tt-icon-fill tt-icon-ring" cx="24" cy="21" r="15" /></svg>;
    case "knowledge":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-stack" d="M9 15 24 8l15 7-15 7-15-7Zm0 7 15 7 15-7v7l-15 7-15-7v-7Z" /><path className="tt-icon-line" d="M14 28v6" /></svg>;
    case "challenge":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-badge" d="m24 7 5 5 7-1-1 7 5 5-5 5 1 7-7-1-5 5-5-5-7 1 1-7-5-5 5-5-1-7 7 1 5-5Z" /><path className="tt-icon-line" d="m17 25 4 4 10-11" /></svg>;
    case "community":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-avatar" cx="17" cy="18" r="6" /><circle className="tt-icon-fill tt-icon-avatar-two" cx="31" cy="19" r="5" /><path className="tt-icon-line" d="M8 36c0-6 4-9 9-9s9 3 9 9m4-8c5 0 8 3 9 8" /></svg>;
    case "marketplace":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-basket" d="M9 18h30l-4 19H13L9 18Z" /><path className="tt-icon-line" d="M16 18c0-7 3-11 8-11s8 4 8 11M15 24h18" /><circle className="tt-icon-dot" cx="18" cy="29" r="1.5" /><circle className="tt-icon-dot" cx="30" cy="29" r="1.5" /></svg>;
    case "mentorship":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-avatar" cx="16" cy="18" r="6" /><circle className="tt-icon-fill tt-icon-avatar-two" cx="32" cy="18" r="6" /><path className="tt-icon-line" d="M10 36c1-5 3-8 8-8s7 3 8 8m-2-11 8 0m0 0-3-3m3 3-3 3" /></svg>;
    case "wall":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-star" d="m24 7 4.5 9 10 1.5-7.2 7 1.7 10-9-4.7-9 4.7 1.7-10-7.2-7 10-1.5L24 7Z" /><circle className="tt-icon-spark" cx="38" cy="8" r="2.5" /></svg>;
    case "account":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-avatar" cx="24" cy="17" r="7" /><path className="tt-icon-line" d="M11 39c1-8 5-12 13-12s12 4 13 12" /><circle className="tt-icon-spark" cx="37" cy="10" r="3" /></svg>;
    case "plans":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-crown" d="m9 15 8 6 7-12 7 12 8-6-2 20H11L9 15Z" /><path className="tt-icon-line" d="M13 31h22" /><circle className="tt-icon-spark" cx="24" cy="9" r="1.8" /></svg>;
    case "billing":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-card" x="7" y="11" width="34" height="25" rx="4" /><path className="tt-icon-line" d="M7 19h34M13 27h10m-10 4h6" /></svg>;
    case "family":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-avatar" cx="16" cy="18" r="5" /><circle className="tt-icon-fill tt-icon-avatar-two" cx="32" cy="18" r="5" /><circle className="tt-icon-fill tt-icon-dot-avatar" cx="24" cy="11" r="4" /><path className="tt-icon-line" d="M9 36c1-5 4-8 8-8s7 3 8 8m6-8c4 0 7 3 8 8M18 24c1-4 3-6 6-6s5 2 6 6" /></svg>;
    case "titan":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-horn" d="M10 34c5-2 7-7 7-14 3 2 5 5 7 10 2-5 4-8 7-10 0 7 2 12 7 14-4 3-8 5-14 5s-10-2-14-5Z" /><circle className="tt-icon-spark" cx="24" cy="13" r="3" /></svg>;
    case "educator":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-cap" d="m8 17 16-8 16 8-16 8L8 17Z" /><path className="tt-icon-line" d="M16 22v8c5 3 11 3 16 0v-8M39 18v10" /></svg>;
    case "creator":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-tool" d="m31 8 8 8-14 14-8-8L31 8Z" /><path className="tt-icon-line" d="m17 23-9 9m5 3 9-9" /><circle className="tt-icon-spark" cx="34" cy="11" r="2" /></svg>;
    case "testing":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-flask" d="M18 7h12v4l-3 7v3c0 4 6 6 6 11 0 4-4 7-9 7s-9-3-9-7c0-5 6-7 6-11v-3l-3-7V7Z" /><path className="tt-icon-line" d="M18 14h12M16 31h16" /><circle className="tt-icon-spark" cx="34" cy="8" r="2.5" /></svg>;
    case "search":
      return <svg {...commonProps}><circle className="tt-icon-line" cx="21" cy="21" r="11" /><path className="tt-icon-line" d="m29 29 10 10" /></svg>;
    case "menu":
      return <svg {...commonProps}><path className="tt-icon-line" d="M9 14h30M9 24h30M9 34h30" /></svg>;
    default:
      return <SnakeFace {...props} />;
  }
}

export function TinyTitansIcon({ name, size = 24, title, className = "", ...props }: Props) {
  return (
    <SimpleIcon
      name={name}
      className={`tt-icon ${className}`.trim()}
      width={size}
      height={size}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    />
  );
}

export default TinyTitansIcon;
