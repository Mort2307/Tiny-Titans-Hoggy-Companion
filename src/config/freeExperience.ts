import { QUICK_NAV_ITEMS, type QuickNavItem } from "../data/quickNavigation";

/**
 * Canonical baseline for every personal Tiny Titans account.
 *
 * Paid workspaces add capability on top of this surface. They must not replace
 * or hide the core keeper experience.
 *
 * Labels, routes and descriptions remain owned by quickNavigation.ts so this
 * policy does not create a second copy of the navigation catalogue.
 */
export const FREE_KEEPER_NAVIGATION_IDS = [
  "home",
  "snakes",
  "room",
  "conversations",
  "reminders",
  "husbandry",
  "weights",
  "feeding",
  "feeding-preparation",
  "shedding",
  "health",
  "behaviour",
  "behaviour-observatory",
  "enclosure",
  "morphs",
  "calculator",
  "breeding",
  "breeding-academy",
  "intelligence",
  "this-week",
  "keeper-handbook",
  "knowledge",
  "learn",
  "adaptive-learning",
  "challenge",
  "achievements",
  "community",
  "marketplace",
  "feature-voting",
  "vivarium-showcase",
  "mentorship",
  "mentor-directory",
  "become-mentor",
  "wall-of-titans",
  "contribute",
  "submit-species",
  "report",
  "feedback",
  "my-issue-reports",
  "submission-messages",
  "account",
  "profile",
  "settings",
  "personalise",
  "family",
  "security",
  "privacy",
  "intelligence-contribution",
  "become-titan",
] as const;

export type FreeKeeperNavigationId = (typeof FREE_KEEPER_NAVIGATION_IDS)[number];

export const FREE_KEEPER_NAVIGATION_ITEMS: readonly QuickNavItem[] =
  FREE_KEEPER_NAVIGATION_IDS
    .map((id) => QUICK_NAV_ITEMS.find((item) => item.id === id))
    .filter((item): item is QuickNavItem => Boolean(item));

export const FREE_KEEPER_NAVIGATION_GROUP_ORDER = [
  "Overview",
  "Care",
  "Genetics & Breeding",
  "Learn & Intelligence",
  "Community",
  "Account",
] as const;

export function getFreeKeeperNavigationItems(): readonly QuickNavItem[] {
  return FREE_KEEPER_NAVIGATION_ITEMS;
}

export function getFreeKeeperNavigationGroups() {
  return FREE_KEEPER_NAVIGATION_GROUP_ORDER.map((group) => ({
    group,
    items: FREE_KEEPER_NAVIGATION_ITEMS.filter((item) => item.group === group),
  }));
}
