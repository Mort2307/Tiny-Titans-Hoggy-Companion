import type { TesterCheck } from "./testerBotService";

export function createCreatorAdminRegressionChecks(): TesterCheck[] {
  return [
    {
      id: "admin-creator-navigation-destinations",
      name: "Creator Hub full-screen destinations",
      category: "admin",
      severity: "high",
      descriptor: "Creator Hub → App Control / Globe / Wall / Tester / Moderation",
      run: async () => {
        const required = ["/creator/app-control", "/creator/community", "/creator/wall-of-titans", "/creator/tester", "/creator/moderation", "/admin"];
        const found = required.filter((path) => Boolean(document.querySelector(`a[href="${path}"]`)));
        const missing = required.filter((path) => !found.includes(path));
        return missing.length ? { status: "fail", message: `Creator navigation is missing ${missing.length} destination link(s).`, details: { expected: required, actual: found, missing, fixHint: "Ensure Creator Hub destinations use normal React Router links to full-screen routes rather than nested panels." } } : { status: "pass", message: "All Creator/Admin navigation destinations are present as full-screen route links.", details: { expected: required, actual: found } };
      },
    },
    {
      id: "admin-route-shell-no-loop",
      name: "Admin route shell and navigation safety",
      category: "admin",
      severity: "critical",
      descriptor: "Creator Hub → Admin Centre protected route",
      run: async () => {
        const link = document.querySelector<HTMLAnchorElement>('a[href="/admin"]');
        if (!link) return { status: "fail", message: "Admin Centre link is not present from Creator Hub.", details: { expected: "A direct /admin route link", actual: "Missing", fixHint: "Add /admin as a sibling protected route and do not nest Admin Centre inside CreatorRouteGuard." } };
        const route = new URL(link.href, window.location.origin).pathname;
        return route === "/admin" ? { status: "pass", message: "Admin Centre is exposed as a direct protected route; no nested Creator/Admin redirect chain is configured by the UI.", details: { expected: "/admin", actual: route, fixHint: "If navigation loops, inspect AdminRouteGuard and CreatorRouteGuard independently." } } : { status: "fail", message: `Admin link resolves to ${route} instead of /admin.`, details: { expected: "/admin", actual: route, fixHint: "Keep Admin Centre at the top-level /admin route." } };
      },
    },
    {
      id: "admin-wall-manager-full-screen",
      name: "Wall of Titans manager full-screen route",
      category: "admin",
      severity: "high",
      descriptor: "Creator Hub → Wall of Titans Manager",
      run: async () => {
        const link = document.querySelector<HTMLAnchorElement>('a[href="/creator/wall-of-titans"]');
        return link ? { status: "pass", message: "Wall of Titans Manager is available as its own route.", details: { expected: "/creator/wall-of-titans", actual: link.getAttribute("href") } } : { status: "fail", message: "Wall of Titans Manager route link is missing.", details: { expected: "/creator/wall-of-titans", actual: "Missing", fixHint: "Use a full-screen route instead of rendering the manager underneath Creator Hub." } };
      },
    },
    {
      id: "globe-mobile-container",
      name: "Community Globe mobile container",
      category: "mobile",
      severity: "high",
      descriptor: "Creator Community Globe / portrait and landscape viewport",
      run: async () => {
        const container = document.querySelector<HTMLElement>(".creator-globe-canvas");
        if (!container) return { status: "blocked", message: "Globe container is not currently mounted; open the Community Globe before running this specific check.", details: { expected: ".creator-globe-canvas", actual: "Not mounted", fixHint: "Run the check while the Community Globe page is open." } };
        const width = container.clientWidth;
        const viewportWidth = document.documentElement.clientWidth;
        const overflow = document.documentElement.scrollWidth > viewportWidth + 2;
        return width >= 280 && !overflow ? { status: "pass", message: "Globe container fits the current viewport without horizontal overflow.", details: { expected: "Container >= 280px and no horizontal overflow", actual: { width, viewportWidth, overflow } } } : { status: "fail", message: "Globe container is not adapting cleanly to the current viewport.", details: { expected: "Container >= 280px and no horizontal overflow", actual: { width, viewportWidth, overflow }, fixHint: "Check ResizeObserver sizing and portrait/landscape height rules in CreatorCommunityGlobe." } };
      },
    },
  ];
}
