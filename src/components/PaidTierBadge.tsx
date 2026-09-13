import type { PaidTierId } from "../config/paidTiers";

type PaidTierBadgeProps = { tierId: PaidTierId; size?: "sm" | "md" | "lg" };

const PRESTIGE_BY_TIER: Record<PaidTierId, string> = {
  free: "core",
  titan_seller: "plus",
  titan_pro: "pro",
  business_starter: "elite",
  business_plus: "elite-plus",
  business_advanced: "titan",
};

function tierShape(tierId: PaidTierId) {
  switch (tierId) {
    case "titan_seller":
      return <><path d="M12 4.2c-3.7 0-6.7 2.2-7.3 5.1-.5 2.5.8 4.8 3.2 6.1 1.1.6 2.5.9 4.1.9s3-.3 4.1-.9c2.4-1.3 3.7-3.6 3.2-6.1-.6-2.9-3.6-5.1-7.3-5.1Z"/><path d="M5.7 7.1 3.9 5.6M18.3 7.1l1.8-1.5"/><path d="M8.2 10.1h.01M15.8 10.1h.01"/><path d="M8.7 13.2c.9.8 3.7.8 4.6 0"/><circle cx="18.8" cy="4.6" r="2.2"/><path d="M18.8 3.5v2.2M17.7 4.6h2.2"/></>;
    case "titan_pro":
      return <><path d="M12 3.4c-4.1 0-7.5 2.8-7.5 6.3 0 3.7 3.4 6.9 7.5 6.9s7.5-3.2 7.5-6.9c0-3.5-3.4-6.3-7.5-6.3Z"/><path d="m7 4.7-2.1-2.2M17 4.7l2.1-2.2"/><path d="m5.8 11.2-2.2 1.2M18.2 11.2l2.2 1.2"/><path d="M8.3 9.3h.01M15.7 9.3h.01"/><path d="M8.5 12.7c1.4 1.1 5.6 1.1 7 0"/><path d="M10.4 16.4 12 18.2l1.6-1.8"/></>;
    case "business_starter":
      return <><path d="M12 2.9 20 6.7v5.7c0 4.2-3 7.1-8 8.7-5-1.6-8-4.5-8-8.7V6.7l8-3.8Z"/><path d="M8.2 8.8h7.6M8.2 11.8h7.6M9.5 14.8h5"/><path d="M7 5.1 5.3 3.4M17 5.1l1.7-1.7"/></>;
    case "business_plus":
      return <><path d="M12 2.5 20.5 6v5.6c0 4.8-3.2 8-8.5 9.9-5.3-1.9-8.5-5.1-8.5-9.9V6L12 2.5Z"/><path d="m12 6.7 2.1 2.8 3.4.4-2.5 2.3.7 3.3-3.7-1.6-3.7 1.6.7-3.3-2.5-2.3 3.4-.4L12 6.7Z"/><path d="M6 3.7 4 2M18 3.7l2-1"/></>;
    case "business_advanced":
      return <><path d="M12 2.2 20.4 5.4v6.1c0 4.8-3.2 8.3-8.4 10.3-5.2-2-8.4-5.5-8.4-10.3V5.4L12 2.2Z"/><path d="m7 8.4 2.5 2.1L12 7.4l2.5 3.1L17 8.4"/><path d="M7.3 13.8c1.4 1.5 8 1.5 9.4 0"/><path d="m7 4.8-2.3-2.2M17 4.8l2.3-2.2"/><path d="M9 16.8h6"/></>;
    case "free":
    default:
      return <><path d="M12 5c-3.4 0-6 2.1-6 4.7 0 3 2.7 5.4 6 5.4s6-2.4 6-5.4C18 7.1 15.4 5 12 5Z"/><path d="M7.3 6.3 5.5 4.8M16.7 6.3l1.8-1.5"/><path d="M9.3 10h.01M14.7 10h.01"/><path d="M10 12.6c1 .7 1.9.7 4 0"/></>;
  }
}

export default function PaidTierBadge({ tierId, size = "md" }: PaidTierBadgeProps) {
  const prestige = PRESTIGE_BY_TIER[tierId];
  return <span className={`paid-tier-badge paid-tier-badge--${prestige} paid-tier-badge--${size}`} aria-hidden="true">
    <span className="paid-tier-badge__orbit paid-tier-badge__orbit--one" />
    <span className="paid-tier-badge__orbit paid-tier-badge__orbit--two" />
    <svg className="paid-tier-badge__art" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">{tierShape(tierId)}</svg>
    {tierId === "business_plus" && <><span className="paid-tier-badge__spark paid-tier-badge__spark--one">✦</span><span className="paid-tier-badge__spark paid-tier-badge__spark--two">✦</span></>}
    {tierId === "business_advanced" && <><span className="paid-tier-badge__crown">♛</span><span className="paid-tier-badge__spark paid-tier-badge__spark--one">✦</span><span className="paid-tier-badge__spark paid-tier-badge__spark--two">✦</span></>}
  </span>;
}
