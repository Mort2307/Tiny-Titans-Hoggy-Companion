import "./Navigation.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { quickNavSearchItems, type QuickNavCapability, type QuickNavItem } from "../../data/quickNavigation";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";
import QuickModeNavigation from "./QuickModeNavigation";

function Navigation() {
  const navigate = useNavigate();
  const { workspace, creatorAuthorized, testerAuthorized, educatorAuthorized } = useNavigationAccess();

  const [moreOpen, setMoreOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [recentPaths, setRecentPaths] = useState<string[]>(() => {
    try {
      const stored = window.localStorage.getItem("tinytitans:quick-view:recent");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string").slice(0, 5) : [];
    } catch {
      return [];
    }
  });

  const authorisedCapabilities = new Set<QuickNavCapability>(["everyone"]);
  if (creatorAuthorized) authorisedCapabilities.add("creator");
  if (testerAuthorized) authorisedCapabilities.add("tester");
  if (educatorAuthorized) authorisedCapabilities.add("educator");

  const availableQuickItems = quickNavSearchItems("", authorisedCapabilities);
  const quickItems = quickNavSearchItems(quickSearch, authorisedCapabilities);
  const recentItems = recentPaths
    .map((path) => availableQuickItems.find((item) => item.path === path))
    .filter((item): item is QuickNavItem => Boolean(item));

  const quickGroups = quickItems.reduce<Record<string, QuickNavItem[]>>((groups, item) => {
    (groups[item.group] ??= []).push(item);
    return groups;
  }, {});

  const openQuickItem = (path: string) => {
    const canonicalItem = availableQuickItems.find((item) => item.path === path);
    if (canonicalItem) {
      setRecentPaths((current) => {
        const next = [canonicalItem.path, ...current.filter((itemPath) => itemPath !== canonicalItem.path)].slice(0, 5);
        try { window.localStorage.setItem("tinytitans:quick-view:recent", JSON.stringify(next)); } catch { /* optional convenience cache */ }
        return next;
      });
    }
    setMoreOpen(false);
    setQuickSearch("");
    navigate(path);
  };

  return (
    <QuickModeNavigation
      workspace={workspace}
      quickSearch={quickSearch}
      setQuickSearch={setQuickSearch}
      quickGroups={quickGroups}
      quickItems={quickItems}
      recentItems={recentItems}
      moreOpen={moreOpen}
      onToggleMore={() => setMoreOpen((current) => !current)}
      onClose={() => setMoreOpen(false)}
      onOpenItem={openQuickItem}
    />
  );
}

export default Navigation;
