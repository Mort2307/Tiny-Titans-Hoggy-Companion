import "./Navigation.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { quickNavSearchItems, type QuickNavCapability } from "../../data/quickNavigation";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";
import QuickModeNavigation from "./QuickModeNavigation";

type QuickItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
  group: string;
  description: string;
  keywords: string[];
};

function Navigation() {
  const navigate = useNavigate();
  const { workspace, creatorAuthorized, testerAuthorized, educatorAuthorized } = useNavigationAccess();

  const [moreOpen, setMoreOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const quickItems = [
    ...quickNavSearchItems(quickSearch, authorisedCapabilities),
    {
      id: "marketplace",
      label: "Marketplace",
      icon: "marketplace",
      path: "/marketplace",
      group: "Community",
      description: "Browse active animal marketplace listings.",
      keywords: ["market", "seller", "listing", "shop"],
    },
  ].filter((item, index, items) =>
    items.findIndex((candidate) => candidate.id === item.id) === index,
  ) as QuickItem[];

  const quickGroups = quickItems.reduce<Record<string, QuickItem[]>>((groups, item) => {
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
  );  return (
    <StandardNavigation
      sections={visibleSections}
      restricted={restricted}
      communityUnreadCount={communityUnreadCount}
      unseenProductUpdate={unseenProductUpdate}
      onNavigate={() => setMoreOpen(false)}
    />
  );
}

export default Navigation;
