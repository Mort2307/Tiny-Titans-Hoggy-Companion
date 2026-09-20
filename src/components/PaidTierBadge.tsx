import type { CSSProperties } from "react";
import { getPaidTierDefinition, type PaidTierId } from "../config/paidTiers";
import TinyTitansIcon from "./TinyTitansIcon";

type PaidTierBadgeProps = { tierId: PaidTierId; size?: "sm" | "md" | "lg" };

const PRESTIGE_BY_TIER: Record<PaidTierId, string> = {
  free: "core",
  titan_seller: "plus",
  titan_pro: "pro",
  business_starter: "elite",
  business_plus: "elite-plus",
  business_advanced: "titan",
  rescue: "titan",
};

const ICON_SIZE_BY_BADGE: Record<NonNullable<PaidTierBadgeProps["size"]>, number> = {
  sm: 18,
  md: 24,
  lg: 30,
};

export default function PaidTierBadge({ tierId, size = "md" }: PaidTierBadgeProps) {
  const tier = getPaidTierDefinition(tierId);
  const prestige = PRESTIGE_BY_TIER[tierId];
  const accent = tier.accent;
  const style = { "--tt-tier-accent": accent } as CSSProperties;
  return (
    <span
      className={`paid-tier-badge paid-tier-badge--${prestige} paid-tier-badge--${size}`}
      style={style}
      aria-hidden="true"
      data-tier={tierId}
    >
      <span className="paid-tier-badge__orbit paid-tier-badge__orbit--one" />
      <span className="paid-tier-badge__orbit paid-tier-badge__orbit--two" />
      <TinyTitansIcon
        name={tier.icon}
        size={ICON_SIZE_BY_BADGE[size]}
        className="paid-tier-badge__art"
        motion="idle"
      />
    </span>
  );
}
