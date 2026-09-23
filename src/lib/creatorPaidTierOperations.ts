import type { PaidTierId } from "../config/paidTiers";
import type { TierUser } from "../types/creatorPaidTier";

export function filterPaidTierUsers(users: TierUser[], search: string, tierFilter: "all" | PaidTierId) {
  const term = search.trim().toLowerCase();
  return users.filter((item) =>
    (tierFilter === "all" || item.effectiveTier === tierFilter) &&
    (!term || [item.displayName, item.email, item.profileType, item.effectiveTier, item.actualTier, item.source]
      .some((value) => String(value || "").toLowerCase().includes(term)))
  );
}
