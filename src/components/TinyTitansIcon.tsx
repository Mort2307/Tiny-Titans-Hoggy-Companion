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
  | "menu"
  | "temperature"
  | "humidity"
  | "water"
  | "uvb"
  | "heat"
  | "plant"
  | "substrate"
  | "hide"
  | "habitatBuilder"
  | "reptileRoom"
  | "veterinary"
  | "intelligence"
  | "globe"
  | "map"
  | "camera"
  | "add"
  | "edit"
  | "delete"
  | "eye"
  | "lock"
  | "rotate"
  | "move"
  | "resize"
  | "measure"
  | "warning"
  | "offline"
  | "thermostat"
  | "maintenance"
  | "power"
  | "settings"
  | "close"
  | "upload"
  | "save"
  | "copy"
  | "expand"
  | "collapse"
  | "titanIntelligence"
  | "analytics"
  | "timeline"
  | "breedingReadiness"
  | "breedingTimeline"
  | "breedingCycle"
  | "production"
  | "evidence"
  | "reporting"
  | "sellerProfile"
  | "marketplaceTools"
  | "team"
  | "automation"
  | "support"
  | "api"
  | "branding"
  | "exportData";

export type TinyTitansIconState = "default" | "normal" | "active" | "success" | "warning" | "critical" | "offline";
export type TinyTitansIconMotion = "none" | "idle" | "hover" | "attention" | "success" | "warning";

type Props = SVGProps<SVGSVGElement> & {
  name: TinyTitansIconName | string;
  size?: number;
  title?: string;
  state?: TinyTitansIconState;
  motion?: TinyTitansIconMotion;
};

const common: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 48 48",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  focusable: false,
  "aria-hidden": true,
};

const LEGACY_ICON_ALIASES: Record<string, TinyTitansIconName> = {
  "🏠": "home",
  "⌂": "home",
  "🌡": "temperature",
  "💧": "humidity",
  "☀️": "uvb",
  "🔥": "heat",
  "🌿": "plant",
  "🪵": "substrate",
  "🪨": "hide",
  "🏗️": "habitatBuilder",
  "🩺": "veterinary",
  "🌎": "globe",
  "🗺️": "map",
  "📷": "camera",
  "✎": "edit",
  "🗑️": "delete",
  "🔒": "lock",
  "⟳": "rotate",
  "↔️": "move",
  "↗": "resize",
  "📏": "measure",
  "⚠️": "warning",
  "⦸": "offline",
  "🐍": "reptile",
  "💬": "messages",
  "📨": "messages",
  "📥": "messages",
  "🔔": "reminders",
  "🌡️": "husbandry",
  "⚖️": "weight",
  "📊": "weight",
  "🍽️": "feeding",
  "🥄": "feeding",
  "❤️": "health",
  "◉": "behaviour",
  "👁️": "behaviour",
  "🔭": "observatory",
  "🔎": "observatory",
  "⌘": "enclosure",
  "🏡": "enclosure",
  "🧬": "genetics",
  "∑": "genetics",
  "🥚": "breeding",
  "📦": "marketplace",
  "▣": "academy",
  "🎓": "academy",
  "📋": "academy",
  "📖": "handbook",
  "📚": "knowledge",
  "▤": "knowledge",
  "◆": "challenge",
  "✓": "challenge",
  "🏆": "wall",
  "★": "wall",
  "🌍": "community",
  "👥": "community",
  "◌": "community",
  "◈": "community",
  "↔": "mentorship",
  "🤝": "mentorship",
  "🛒": "marketplace",
  "⚙️": "account",
  "👤": "account",
  "📝": "contribution",
  "＋": "contribution",
  "✦": "titan",
  "✨": "titan",
  "🧠": "titan",
  "🔐": "account",
  "🛡️": "account",
  "🌱": "husbandry",
  "🧪": "testing",
  "🛠️": "creator",
  "⚒": "creator",
  "🖼️": "morph",
  "◇": "plans",
  "●": "account",
};

const ICON_NAMES = new Set<TinyTitansIconName>([
  "home", "reptile", "messages", "reminders", "husbandry", "weight", "feeding", "shed", "behaviour", "health",
  "enclosure", "morph", "genetics", "breeding", "academy", "handbook", "observatory", "contribution", "knowledge",
  "challenge", "community", "marketplace", "mentorship", "wall", "account", "plans", "billing", "family", "titan",
  "educator", "creator", "testing", "search", "menu",
  "temperature", "humidity", "water", "uvb", "heat", "plant", "substrate", "hide",
  "habitatBuilder", "reptileRoom", "veterinary", "intelligence", "globe", "map", "camera",
  "add", "edit", "delete", "eye", "lock", "rotate", "move", "resize", "measure", "warning", "offline",
  "thermostat", "maintenance", "power", "settings", "close", "upload", "save", "copy", "expand", "collapse",
  "titanIntelligence", "analytics", "timeline", "breedingReadiness", "breedingTimeline", "breedingCycle", "production", "evidence", "reporting", "sellerProfile", "marketplaceTools", "team", "automation", "support", "api", "branding", "exportData",
]);

function resolveIconName(value: string): TinyTitansIconName {
  const legacy = LEGACY_ICON_ALIASES[value];
  if (legacy) return legacy;
  if (ICON_NAMES.has(value as TinyTitansIconName)) return value as TinyTitansIconName;
  return "warning";
}

function SnakeFace({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} {...props} className={`tt-icon-svg tt-icon-snake ${className}`.trim()}>
      <path className="tt-icon-snake-neck" d="M12 39c1-8 4-13 10-16 5-2 8-6 9-11 1-4 4-6 8-5 3 1 4 4 3 7-2 6-6 11-11 14-4 2-6 6-6 11v2H12Z" />
      <path className="tt-icon-snake-head" d="M29 12c4-5 10-6 14-2 3 3 3 7 0 10-3 3-9 4-14 1l-4 4-3-3 4-4c-1-2 0-4 3-6Z" />
      <path className="tt-icon-snake-snout" d="M36 14c2 1 4 2 6 1m-6 3c2 1 4 0 6-1" />
      <circle className="tt-icon-eye" cx="37" cy="12.5" r="2.2" />
      <circle className="tt-icon-pupil" cx="37.5" cy="12.5" r=".8" />
      <path className="tt-icon-snake-scale" d="M17 30c3 1 5 3 7 6m-10-3c3 1 5 3 7 5m4-16c2 1 3 2 4 4" />
      <path className="tt-icon-tongue" d="M43 18v4m0 0-2 2m2-2 2 2" />
      <path className="tt-icon-spark" d="m9 10 1.2 3 3 1.2-3 1.2L9 18l-1.2-2.6-3-1.2 3-1.2L9 10Z" />
    </svg>
  );
}

function SimpleIcon({ name, ...props }: { name: TinyTitansIconName } & SVGProps<SVGSVGElement>) {
  const commonProps: SVGProps<SVGSVGElement> = { ...common, ...props };
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
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-footprint" d="M15 10c4 0 6 4 5 8s-3 6-6 6c-3 0-5-3-5-7 0-4 2-7 6-7Zm17 8c4 0 6 3 5 7-1 4-4 6-7 5-3-1-4-4-3-8 1-3 2-4 5-4Z" /><path className="tt-icon-line-soft" d="M13 29c3 2 4 5 2 8m10-7c3 2 4 5 2 8m8-4c2 1 3 3 2 5" /><circle className="tt-icon-dot" cx="22" cy="15" r="1.5" /></svg>;
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

    case "titanIntelligence":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-titan-intel" d="M24 7 29 14l9-1-1 9 7 5-7 5 1 9-9-1-5 7-5-7-9 1 1-9-7-5 7-5-1-9 9 1 5-7Z" /><circle className="tt-icon-cutout" cx="24" cy="24" r="6" /><path className="tt-icon-line" d="M24 14v4m0 12v4M14 24h4m12 0h4" /><circle className="tt-icon-spark" cx="38" cy="9" r="2.2" /></svg>;
    case "analytics":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-chart" d="M8 36V12h7v24H8Zm12 0V20h7v16h-7Zm12 0V8h7v28h-7Z" /><path className="tt-icon-line" d="M9 31 19 23l6 4 12-13" /><circle className="tt-icon-spark" cx="37" cy="14" r="2.3" /></svg>;
    case "timeline":
      return <svg {...commonProps}><path className="tt-icon-line" d="M8 24h32" /><circle className="tt-icon-fill tt-icon-timeline-node" cx="10" cy="24" r="5" /><circle className="tt-icon-fill tt-icon-timeline-node" cx="24" cy="24" r="5" /><circle className="tt-icon-fill tt-icon-timeline-node" cx="38" cy="24" r="5" /><path className="tt-icon-line-soft" d="M10 18v-7m14 7V8m14 10v-7" /><circle className="tt-icon-spark" cx="24" cy="8" r="2" /></svg>;
    case "breedingReadiness":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-ready-shield" d="M24 7 38 12v10c0 9-5 14-14 19C15 36 10 31 10 22V12l14-5Z" /><path className="tt-icon-line" d="m16 24 5 5 11-11" /><circle className="tt-icon-spark" cx="39" cy="9" r="2.3" /></svg>;
    case "breedingTimeline":
      return <svg {...commonProps}><path className="tt-icon-line" d="M9 33c6-10 10-16 15-16 5 0 8 5 15 0" /><circle className="tt-icon-fill tt-icon-timeline-node" cx="9" cy="33" r="4" /><ellipse className="tt-icon-fill tt-icon-egg" cx="24" cy="17" rx="6" ry="8" /><path className="tt-icon-fill tt-icon-hatch" d="M39 13a7 7 0 1 0 0 14c-4 0-7-3-7-7s3-7 7-7Z" /><path className="tt-icon-line-soft" d="M37 20h5m-2.5-2.5V23" /></svg>;
    case "breedingCycle":
      return <svg {...commonProps}><path className="tt-icon-line tt-icon-cycle-arrow" d="M12 20a14 14 0 0 1 25-5l3 4m-4-11v7h-7M36 28a14 14 0 0 1-25 5l-3-4m4 11v-7h7" /><circle className="tt-icon-fill tt-icon-cycle-core" cx="24" cy="24" r="7" /><path className="tt-icon-line-soft" d="M21 24h6" /></svg>;
    case "production":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-tray" d="M7 16h34v20H7V16Z" /><path className="tt-icon-line" d="M7 22h34M12 16l4-8h16l4 8" /><ellipse className="tt-icon-fill tt-icon-egg" cx="15" cy="28" rx="4" ry="5" /><ellipse className="tt-icon-fill tt-icon-egg tt-icon-egg-two" cx="24" cy="28" rx="4" ry="5" /><ellipse className="tt-icon-fill tt-icon-egg" cx="33" cy="28" rx="4" ry="5" /></svg>;
    case "evidence":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-document" d="M11 7h19l7 7v27H11V7Z" /><path className="tt-icon-line-soft" d="M30 7v8h7M16 22h14m-14 6h14m-14 6h8" /><circle className="tt-icon-fill tt-icon-evidence-check" cx="34" cy="34" r="7" /><path className="tt-icon-line" d="m31 34 2 2 4-5" /></svg>;
    case "reporting":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-report" d="M9 8h30v32H9V8Z" /><path className="tt-icon-line" d="M15 32v-8m7 8V18m7 14v-12m7 12V14" /><path className="tt-icon-line-soft" d="M14 14h9" /></svg>;
    case "sellerProfile":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-profile-card" x="8" y="9" width="32" height="29" rx="4" /><circle className="tt-icon-fill tt-icon-profile-person" cx="18" cy="20" r="5" /><path className="tt-icon-line" d="M11 33c1-5 4-8 8-8s7 3 8 8m6-13h4m-4 6h4m-4 6h4" /><path className="tt-icon-spark" d="m33 9 1.2 3 3 1.2-3 1.2L33 17l-1.2-3.6-3-1.2 3-1.2L33 9Z" /></svg>;
    case "marketplaceTools":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-tag" d="m8 14 13-7h12l7 7-17 27L8 24V14Z" /><circle className="tt-icon-cutout" cx="27" cy="14" r="2.3" /><path className="tt-icon-line" d="m18 25 7 7m-2-12 7 7" /></svg>;
    case "team":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-team-main" cx="24" cy="16" r="6" /><circle className="tt-icon-fill tt-icon-team-side" cx="11" cy="21" r="4" /><circle className="tt-icon-fill tt-icon-team-side" cx="37" cy="21" r="4" /><path className="tt-icon-line" d="M13 37c1-7 5-11 11-11s10 4 11 11M7 37c.5-4 2-6 5-7m24 0c3 1 4.5 3 5 7" /></svg>;
    case "automation":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-node" x="7" y="19" width="10" height="10" rx="2" /><rect className="tt-icon-fill tt-icon-node" x="31" y="8" width="10" height="10" rx="2" /><rect className="tt-icon-fill tt-icon-node" x="31" y="30" width="10" height="10" rx="2" /><path className="tt-icon-line" d="M17 24h7m0 0V13h7m-7 11v11h7" /><path className="tt-icon-line-soft" d="M33 11h6m-6 22h6" /></svg>;
    case "support":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-headset" d="M8 28v-4c0-9 7-16 16-16s16 7 16 16v4h-5v-4c0-6-5-11-11-11s-11 5-11 11v4H8Z" /><rect className="tt-icon-fill tt-icon-headset-ear" x="6" y="25" width="8" height="12" rx="3" /><rect className="tt-icon-fill tt-icon-headset-ear" x="34" y="25" width="8" height="12" rx="3" /><path className="tt-icon-line" d="M34 37h-5c-4 0-6-2-6-5" /></svg>;
    case "api":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-api-chip" x="8" y="11" width="32" height="26" rx="5" /><path className="tt-icon-line" d="m19 19-6 5 6 5m10-10 6 5-6 5m-5-12-4 14" /><path className="tt-icon-line-soft" d="M8 18H5m38 0h-3M8 30H5m38 0h-3" /></svg>;
    case "branding":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-brush" d="m30 8 10 10-16 16-10-10L30 8Z" /><path className="tt-icon-line" d="m22 32-5 5c-2 2-6 2-8 0 3-1 4-3 4-6m3-19 10 10" /><circle className="tt-icon-spark" cx="36" cy="10" r="2.2" /></svg>;
    case "exportData":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-export-tray" d="M8 28h32v10H8V28Z" /><path className="tt-icon-line" d="M24 7v22m0-22-7 7m7-7 7 7M15 28v5m18-5v5" /></svg>;
    case "temperature":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-temperature ${commonProps.className ?? ""}`.trim()}>
        <rect className="tt-icon-fill tt-icon-thermo-shell" x="18" y="7" width="12" height="27" rx="6" />
        <rect className="tt-icon-thermo-mercury" x="21" y="14" width="6" height="16" rx="3" />
        <circle className="tt-icon-thermo-bulb" cx="24" cy="32" r="5" />
        <path className="tt-icon-line-soft" d="M14 13h3M14 19h3M14 25h3M31 13h3M31 19h3M31 25h3" />
        <circle className="tt-icon-spark" cx="37" cy="9" r="2.3" />
      </svg>;
    case "humidity":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-humidity ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-drop" d="M24 7c-6 8-11 13-11 19a11 11 0 0 0 22 0c0-6-5-11-11-19Z" />
        <path className="tt-icon-line-soft" d="M19 28c1 3 4 5 7 5" />
        <circle className="tt-icon-humidity-particle" cx="9" cy="18" r="1.7" />
        <circle className="tt-icon-humidity-particle" cx="39" cy="23" r="1.7" />
        <circle className="tt-icon-humidity-particle" cx="12" cy="35" r="1.3" />
      </svg>;
    case "water":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-water ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-bowl" d="M9 23h30l-3 9c-1 3-4 5-7 5H19c-3 0-6-2-7-5l-3-9Z" />
        <path className="tt-icon-water-surface" d="M9 23c4-3 8 3 15 0 7-3 11 3 15 0" />
        <path className="tt-icon-line-soft" d="M17 32h14" />
        <path className="tt-icon-drop-small" d="M24 8c-2.5 3.3-4 5.3-4 7a4 4 0 0 0 8 0c0-1.7-1.5-3.7-4-7Z" />
      </svg>;
    case "uvb":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-uvb ${commonProps.className ?? ""}`.trim()}>
        <circle className="tt-icon-fill tt-icon-sun" cx="24" cy="23" r="8" />
        <path className="tt-icon-line" d="M24 5v6m0 24v-6M6 23h6m24 0h6M11 10l4 4m18 18-4-4m0-18 4-4M15 32l-4 4" />
        <path className="tt-icon-uvb-ray" d="M17 17c2-2 4-3 7-3 5 0 9 4 9 9" />
      </svg>;
    case "heat":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-heat ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-lamp" d="M15 9h18l-4 12H19L15 9Z" />
        <path className="tt-icon-line" d="M24 21v7m-6 0h12M19 35c1-3 2-4 2-6m3 6c1-3 2-4 2-6m3 6c1-3 2-4 2-6" />
        <circle className="tt-icon-spark" cx="38" cy="10" r="2.4" />
      </svg>;
    case "plant":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-plant ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-pot" d="M14 28h20l-3 12H17l-3-12Z" />
        <path className="tt-icon-plant-stem" d="M24 28V16" />
        <path className="tt-icon-fill tt-icon-leaf tt-icon-leaf-a" d="M24 20c-7 0-10-4-10-9 6 0 10 3 10 9Z" />
        <path className="tt-icon-fill tt-icon-leaf tt-icon-leaf-b" d="M24 24c7 0 10-4 10-9-6 0-10 3-10 9Z" />
        <path className="tt-icon-line-soft" d="M20 33h8" />
      </svg>;
    case "substrate":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-substrate ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-substrate-bed" d="M8 24c5-4 9-2 14 0 5 2 9 4 18 0v13H8V24Z" />
        <circle className="tt-icon-substrate-grain" cx="15" cy="30" r="1.5" />
        <circle className="tt-icon-substrate-grain" cx="22" cy="27" r="1.2" />
        <circle className="tt-icon-substrate-grain" cx="29" cy="33" r="1.6" />
        <circle className="tt-icon-substrate-grain" cx="35" cy="28" r="1.1" />
        <path className="tt-icon-line-soft" d="M8 37h32" />
      </svg>;
    case "hide":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-hide ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-hide-rock" d="M7 35c2-11 7-20 17-23 8 2 13 10 17 23H7Z" />
        <path className="tt-icon-hide-hole" d="M16 35c0-7 3-11 8-11s8 4 8 11" />
        <path className="tt-icon-line-soft" d="M11 35h26" />
      </svg>;
    case "habitatBuilder":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-builder ${commonProps.className ?? ""}`.trim()}>
        <rect className="tt-icon-builder-frame" x="7" y="9" width="34" height="29" rx="3" />
        <path className="tt-icon-builder-floor" d="M9 31c5-3 9 3 15 0s10 3 15 0v6H9v-6Z" />
        <path className="tt-icon-builder-plant" d="M18 29V19m0 5c-5 0-7-3-7-7 5 0 7 3 7 7m0 3c5 0 7-3 7-7-5 0-7 3-7 7" />
        <path className="tt-icon-builder-hide" d="M26 31c0-6 3-9 7-9s7 3 7 9" />
        <path className="tt-icon-spark tt-icon-builder-spark" d="m35 7 1.5 3.5L40 12l-3.5 1.5L35 17l-1.5-3.5L30 12l3.5-1.5L35 7Z" />
      </svg>;
    case "reptileRoom":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-room ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-room-wall" d="M7 8h25v30H7V8Z" />
        <path className="tt-icon-line" d="M32 8h9v30h-9M7 38h34" />
        <rect className="tt-icon-room-tank" x="13" y="18" width="25" height="14" rx="2" />
        <path className="tt-icon-room-plant" d="M19 30v-7m0 3c-4 0-5-2-5-5 4 0 5 2 5 5m0 2c4 0 5-2 5-5-4 0-5 2-5 5" />
        <path className="tt-icon-room-light" d="M26 16h9" />
      </svg>;
    case "veterinary":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-vet ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-vet-shield" d="M24 7 38 12v10c0 9-5 14-14 19C15 36 10 31 10 22V12l14-5Z" />
        <path className="tt-icon-vet-cross" d="M24 15v12m-6-6h12" />
        <path className="tt-icon-vet-pulse" d="M16 33h4l2-4 3 7 2-4h5" />
      </svg>;
    case "intelligence":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-intelligence ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-intelligence-eye" d="M7 24s6-10 17-10 17 10 17 10-6 10-17 10S7 24 7 24Z" />
        <circle className="tt-icon-intelligence-pupil" cx="24" cy="24" r="5" />
        <circle className="tt-icon-intelligence-glint" cx="22" cy="22" r="1.5" />
        <path className="tt-icon-intelligence-spark" d="m37 8 1.5 3.5L42 13l-3.5 1.5L37 18l-1.5-3.5L32 13l3.5-1.5L37 8Z" />
      </svg>;
    case "globe":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-globe ${commonProps.className ?? ""}`.trim()}>
        <circle className="tt-icon-fill tt-icon-globe-sphere" cx="24" cy="24" r="16" />
        <path className="tt-icon-globe-grid" d="M8 24h32M10 16h28M10 32h28M24 8c5 5 7 10 7 16s-2 11-7 16M24 8c-5 5-7 10-7 16s2 11 7 16" />
        <circle className="tt-icon-spark" cx="38" cy="8" r="2.2" />
      </svg>;
    case "map":
      return <svg {...commonProps} className={`tt-icon-svg tt-icon-map ${commonProps.className ?? ""}`.trim()}>
        <path className="tt-icon-fill tt-icon-map-panel" d="m8 10 10-3 12 4 10-3v30l-10 3-12-4-10 3V10Z" />
        <path className="tt-icon-line" d="M18 7v30m12-26v30" />
        <path className="tt-icon-map-route" d="M13 29c3-8 7-9 11-5s6 2 11-7" />
        <circle className="tt-icon-map-pin" cx="35" cy="17" r="2.2" />
      </svg>;
    case "camera":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-camera" d="M8 16h9l3-5h8l3 5h9v22H8V16Z" /><circle className="tt-icon-camera-lens" cx="24" cy="27" r="7" /><circle className="tt-icon-camera-glint" cx="27" cy="24" r="1.6" /></svg>;
    case "add":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-action-ring" cx="24" cy="24" r="16" /><path className="tt-icon-line tt-icon-action-mark" d="M24 15v18M15 24h18" /></svg>;
    case "edit":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-edit" d="m30 8 10 10-18 18-11 1 1-11L30 8Z" /><path className="tt-icon-line" d="m26 12 10 10" /><path className="tt-icon-line-soft" d="m12 36 7-1" /></svg>;
    case "delete":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-bin" d="M13 14h22l-2 26H15l-2-26Z" /><path className="tt-icon-line" d="M11 14h26M19 9h10M20 19v15m8-15v15" /></svg>;
    case "eye":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-eye" d="M6 24s6.5-10 18-10 18 10 18 10-6.5 10-18 10S6 24 6 24Z" /><circle className="tt-icon-pupil" cx="24" cy="24" r="5" /><circle className="tt-icon-highlight" cx="22.5" cy="22.5" r="1.4" /></svg>;
    case "lock":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-lock-body" x="10" y="21" width="28" height="19" rx="4" /><path className="tt-icon-line" d="M16 21v-6a8 8 0 0 1 16 0v6" /><circle className="tt-icon-lock-dot" cx="24" cy="30" r="2" /></svg>;
    case "rotate":
      return <svg {...commonProps}><path className="tt-icon-line tt-icon-rotate-arrow" d="M37 18a14 14 0 1 0 1 11M37 10v8h-8" /><path className="tt-icon-fill tt-icon-rotate-core" d="M20 20h8v8h-8z" /></svg>;
    case "move":
      return <svg {...commonProps}><path className="tt-icon-line" d="M24 7v34M7 24h34M24 7l-4 5m4-5 4 5M24 41l-4-5m4 5 4-5M7 24l5-4m-5 4 5 4M41 24l-5-4m5 4-5 4" /></svg>;
    case "resize":
      return <svg {...commonProps}><path className="tt-icon-line" d="M10 24V10h14M38 24v14H24M10 10l10 10M38 38 28 28" /><path className="tt-icon-spark" d="m38 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /></svg>;
    case "measure":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-ruler" d="m9 29 20-20 10 10-20 20L9 29Z" /><path className="tt-icon-line" d="m18 28 3-3m2 9 3-3m2-10 3-3m-12-2 3-3" /></svg>;
    case "warning":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-warning" d="m24 7 17 31H7L24 7Z" /><path className="tt-icon-line" d="M24 17v10m0 5v1" /></svg>;
    case "offline":
      return <svg {...commonProps}><circle className="tt-icon-line" cx="24" cy="24" r="16" /><path className="tt-icon-line" d="M14 14l20 20M19 29h10" /></svg>;
    case "thermostat":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-thermostat" x="9" y="8" width="30" height="32" rx="5" /><rect className="tt-icon-thermostat-display" x="14" y="13" width="20" height="8" rx="2" /><circle className="tt-icon-thermostat-dial" cx="24" cy="31" r="5" /><path className="tt-icon-line-soft" d="M24 26v5m-5 0h10" /></svg>;
    case "maintenance":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-tool" d="m31 8 5 5-12 12-5-5L31 8Z" /><path className="tt-icon-line" d="m18 20-9 9c-2 2-2 5 0 7s5 2 7 0l9-9" /><path className="tt-icon-maint-bristles" d="M13 34h-5m8 2h-5m8 1h-4" /></svg>;
    case "power":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-plug" d="M17 8h5v10h4V8h5v10c0 6-3 10-8 12v8h-5v-8c-5-2-8-6-8-12V8h7Z" /><path className="tt-icon-line" d="M24 38v3" /></svg>;
    case "settings":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-gear" d="m21 7 3 4 4-1 2 3 4-1 2 5-4 2v4l4 2-2 5-4-1-2 3-4-1-3 4-5-2 1-4-3-3-4 1-2-5 4-2v-4l-4-2 2-5 4 1 2-3 4 1Z" /><circle className="tt-icon-cutout" cx="24" cy="24" r="6" /></svg>;
    case "close":
      return <svg {...commonProps}><circle className="tt-icon-fill tt-icon-close-ring" cx="24" cy="24" r="16" /><path className="tt-icon-line" d="m17 17 14 14M31 17 17 31" /></svg>;
    case "upload":
      return <svg {...commonProps}><path className="tt-icon-line" d="M12 33h24M16 38h16" /><path className="tt-icon-fill tt-icon-upload-tray" d="M10 29h28v8H10v-8Z" /><path className="tt-icon-line" d="M24 28V10m0 0-7 7m7-7 7 7" /></svg>;
    case "save":
      return <svg {...commonProps}><path className="tt-icon-fill tt-icon-save" d="M10 8h24l6 6v26H8V10l2-2Z" /><path className="tt-icon-line" d="M15 9v10h18V9M15 40V28h18v12" /></svg>;
    case "copy":
      return <svg {...commonProps}><rect className="tt-icon-fill tt-icon-copy-back" x="12" y="9" width="21" height="25" rx="3" /><rect className="tt-icon-fill tt-icon-copy-front" x="18" y="14" width="19" height="25" rx="3" /><path className="tt-icon-line-soft" d="M22 20h10m-10 6h10m-10 6h7" /></svg>;
    case "expand":
      return <svg {...commonProps}><path className="tt-icon-line" d="M9 19V9h10M39 19V9H29M9 29v10h10M39 29v10H29M9 9l9 9m21-9-9 9M9 39l9-9m21 9-9-9" /></svg>;
    case "collapse":
      return <svg {...commonProps}><path className="tt-icon-line" d="M18 9v9H9M30 9v9h9M18 39v-9H9M30 39v-9h9M18 18l-9-9m21 9 9-9M18 30l-9 9m21-9 9 9" /></svg>;
    default:
      return <SnakeFace {...props} />;
  }
}

export function TinyTitansIcon({
  name,
  size = 24,
  title,
  className = "",
  state = "default",
  motion = "idle",
  ...props
}: Props) {
  const resolvedName = resolveIconName(name);
  return (
    <SimpleIcon
      name={resolvedName}
      className={`tt-icon tt-icon-name-${resolvedName} tt-icon-state-${state} tt-icon-motion-${motion} ${className}`.trim()}
      width={size}
      height={size}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      data-tt-state={state}
      data-tt-motion={motion}
      {...props}
    />
  );
}

export default TinyTitansIcon;
