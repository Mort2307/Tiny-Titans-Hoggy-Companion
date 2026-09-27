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

  const authorisedCapabilities = new Set<QuickNavCapability>(["everyone"]);
  if (creatorAuthorized) authorisedCapabilities.add("creator");
  if (testerAuthorized) authorisedCapabilities.add("tester");
  if (educatorAuthorized) authorisedCapabilities.add("educator");

  const quickItems = quickNavSearchItems(quickSearch, authorisedCapabilities);

  const quickGroups = quickItems.reduce<Record<string, QuickNavItem[]>>((groups, item) => {
    (groups[item.group] ??= []).push(item);
    return groups;
  }, {});

  const openQuickItem = (path: string) => {
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
      moreOpen={moreOpen}
      onToggleMore={() => setMoreOpen((current) => !current)}
      onClose={() => setMoreOpen(false)}
      onOpenItem={openQuickItem}
    />
  );
}

export default Navigation;
