import "./Navigation.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEasyNav } from "../../context/EasyNavContext";
import { quickNavSearchItems, type QuickNavCapability } from "../../data/quickNavigation";
import { getFreeKeeperNavigationGroups } from "../../config/freeExperience";
import { quickIconFor } from "../../config/navigationIcons";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";
import QuickModeNavigation from "./QuickModeNavigation";
import StandardNavigation, { type NavigationSection } from "./StandardNavigation";

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
  const { isEasyNav } = useEasyNav();
  const navigate = useNavigate();
  const {
    workspace,
    creatorAuthorized,
    testerAuthorized,
    educatorAuthorized,
    communityUnreadCount,
    unseenProductUpdate,
  } = useNavigationAccess();

  const [moreOpen, setMoreOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const sections: NavigationSection[] = getFreeKeeperNavigationGroups().map(({ group, items }) => ({
    label: group,
    links: items.map((item) => [item.path, item.icon, item.label]),
  }));

  const standardPaths = new Set(
    sections.flatMap((section) => section.links.map(([path]) => path)),
  );

  const workspaceLinks: NavigationSection["links"] =
    workspace.productId === "personal"
      ? []
      : workspace.product.nav
          .filter(({ path }) => !standardPaths.has(path))
          .map(({ path, label }) => [
            path,
            quickIconFor(path.split("/").filter(Boolean).pop() ?? "home"),
            label,
          ]);

  const visibleSections =
    workspaceLinks.length > 0
      ? [{ label: `WORKSPACE · ${workspace.product.eyebrow}`, links: workspaceLinks }, ...sections]
      : sections;

  const restricted: NavigationSection[] = [];
  if (educatorAuthorized) {
    restricted.push({
      label: "Educator",
      links: [["/educator", "educator", "Educator Centre"]],
    });
  }
  if (creatorAuthorized) {
    restricted.push({
      label: "Creator",
      links: [
        ["/creator", "creator", "Creator Centre"],
        ["/creator/morph-library", "morph", "Morph Library Editor"],
        ["/creator/community", "community", "Community Manager"],
        ["/creator/mentor-review", "mentorship", "Mentor Review"],
      ],
    });
  }
  if (testerAuthorized) {
    restricted.push({
      label: "Testing",
      links: [["/creator/tester", "testing", "Tester Centre"]],
    });
  }

  const authorisedCapabilities = new Set<QuickNavCapability>(["everyone"]);
  if (creatorAuthorized) authorisedCapabilities.add("creator");
  if (testerAuthorized) authorisedCapabilities.add("tester");
  if (educatorAuthorized) authorisedCapabilities.add("educator");

  const quickItems = [
    ...quickNavSearchItems(quickSearch, authorisedCapabilities),
    {
      id: "marketplace",
      label: "Marketplace",
      icon: "marketplace",
      path: "/marketplace",
      group: "Community",
      description: "Browse active reptile marketplace listings.",
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

  if (isEasyNav) {
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

  return (
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
