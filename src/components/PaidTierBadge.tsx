import type { CSSProperties } from "react";
import { getPaidTierDefinition, type PaidTierId } from "../config/paidTiers";
import TinyTitansIcon, { type TinyTitansIconName } from "./TinyTitansIcon";

const TIER_ICONS: Record<PaidTierId, TinyTitansIconName> = {
  free: "animals",
  titan_seller: "marketplace",
  titan_pro: "titan",
  business_starter: "community",
  business_plus: "analytics",
  business_advanced: "plans",
  rescue: "health",
};

const ICON_SIZES = {
  sm: 20,
  md: 30,
  lg: 42,
} as const;

const PRESTIGE_BY_TIER: Record<PaidTierId, string> = {
  free: "core",
  titan_seller: "plus",
  titan_pro: "pro",
  business_starter: "elite",
  business_plus: "elite-plus",
  business_advanced: "titan",
  rescue: "titan",
};

type PaidTierBadgeProps = {
  tierId: PaidTierId;
  size?: "sm" | "md" | "lg";
};

export default function PaidTierBadge({
  tierId,
  size = "md",
}: PaidTierBadgeProps) {
  const prestige = PRESTIGE_BY_TIER[tierId];
  const accent = getPaidTierDefinition(tierId).accent;
  const style = {
    "--tt-tier-accent": accent,
    "--tt-icon-accent": accent,
  } as CSSProperties;

  return (
    <span
      className={`paid-tier-badge paid-tier-badge--${prestige} paid-tier-badge--${size}`}
      style={style}
      aria-hidden="true"
    >
      <TinyTitansIcon
        name={TIER_ICONS[tierId]}
        size={ICON_SIZES[size]}
        className="paid-tier-badge__icon"
        aria-hidden="true"
      />
    </span>
  );
}