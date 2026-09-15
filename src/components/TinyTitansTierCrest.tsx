import type { PaidTierId } from "../config/paidTiers";
import "../styles/tiny-titans-icons.css";

type Props = {
  tier: PaidTierId;
  size?: number;
};

const crownLevel: Record<PaidTierId, number> = {
  free: 0,
  titan_pro: 1,
  titan_seller: 1,
  business_starter: 2,
  business_plus: 2,
  business_advanced: 3,
  rescue: 3,
};

export default function TinyTitansTierCrest({ tier, size = 22 }: Props) {
  const level = crownLevel[tier];
  if (level === 0) {
    return <span className="tt-tier-crest tt-tier-crest-free" aria-hidden="true">◇</span>;
  }
  return (
    <span className={`tt-tier-crest tt-tier-crest-level-${level}`} aria-hidden="true">
      <svg viewBox="0 0 48 40" width={size} height={Math.round(size * 0.84)} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="tt-tier-crown-fill" d="M7 9 16 16 24 5l8 11 9-7-3 24H10L7 9Z" />
        <path className="tt-tier-crown-line" d="M11 29h26M14 34h20" />
        <circle className="tt-tier-crown-jewel" cx="24" cy="6" r="2.2" />
        {level >= 2 && <path className="tt-tier-crown-halo" d="M11 4c3-2 7-3 13-3s10 1 13 3" />}
        {level >= 3 && <><circle className="tt-tier-crown-star" cx="7" cy="5" r="1.5" /><circle className="tt-tier-crown-star" cx="41" cy="5" r="1.5" /></>}
      </svg>
      <span className="tt-tier-crown-sr">Tier level {level}</span>
    </span>
  );
}
