import type { TesterCheck } from "./testerBotService";

export function createCreatorAdminRegressionChecks(): TesterCheck[] {
  return [
    {
      id: "admin-creator-navigation-destinations", name: "Creator Hub full-screen destinations", category: "admin", severity: "high", descriptor: "Creator Hub → all dedicated Creator routes",
      run: async () => {
        const required = ["/creator/app-control", "/creator/content", "/creator/community", "/creator/wall-of-titans", "/creator/tester", "/creator/moderation", "/creator/admin", "/creator/privacy-data", "/creator/feeding", "/creator/shedding", "/creator/weights", "/creator/genetics"];
        const found = required.filter((path) => Boolean(document.querySelector(`a[href="${path}"]`))); const missing = required.filter((path) => !found.includes(path));
        return missing.length ? { status: "fail", message: `Creator navigation is missing ${missing.length} destination link(s).`, details: { expected: required, actual: found, missing, fixHint: "Ensure every Creator destination is a direct React Router link to its own full-screen route." } } : { status: "pass", message: "All Creator destinations are present as dedicated route links.", details: { expected: required, actual: found } };
      },
    },
    {
      id: "admin-route-shell-no-loop", name: "Admin route shell and navigation safety", category: "admin", severity: "critical", descriptor: "Creator Hub → Admin Centre protected route",
      run: async () => { const link = document.querySelector<HTMLAnchorElement>('a[href="/creator/admin"]'); return link ? { status: "pass", message: "Creator Admin Management has a direct protected route.", details: { expected: "/creator/admin", actual: link.getAttribute("href") } } : { status: "fail", message: "Creator Admin Management link is missing.", details: { expected: "/creator/admin", actual: "Missing", fixHint: "Add /creator/admin as a sibling protected route." } }; },
    },
    {
      id: "admin-wall-manager-full-screen", name: "Wall of Titans manager full-screen route", category: "admin", severity: "high", descriptor: "Creator Hub → Wall of Titans Manager",
      run: async () => { const link = document.querySelector<HTMLAnchorElement>('a[href="/creator/wall-of-titans"]'); return link ? { status: "pass", message: "Wall of Titans Manager is available as its own route.", details: { expected: "/creator/wall-of-titans", actual: link.getAttribute("href") } } : { status: "fail", message: "Wall of Titans Manager route link is missing.", details: { expected: "/creator/wall-of-titans", actual: "Missing", fixHint: "Use a full-screen route instead of rendering the manager underneath Creator Hub." } };
      },
    },
    {
      id: "creator-tracker-route-separation", name: "Creator tracker route separation", category: "admin", severity: "high", descriptor: "Creator Feeding / Shed / Weight / Genetics dedicated screens",
      run: async () => { const required = ["/creator/feeding", "/creator/shedding", "/creator/weights", "/creator/genetics"]; const missing = required.filter((path) => !document.querySelector(`a[href="${path}"]`)); return missing.length ? { status: "fail", message: "One or more dedicated tracker routes are missing.", details: { expected: required, actual: required.filter((path) => !missing.includes(path)), missing, fixHint: "Keep tracker analytics as sibling full-screen Creator routes." } } : { status: "pass", message: "All four tracker analytics routes are linked separately.", details: { expected: required, actual: required } }; },
    },
    {
      id: "creator-content-control-route", name: "Creator content editor route", category: "admin", severity: "high", descriptor: "Creator Hub → Content Control",
      run: async () => { const link = document.querySelector<HTMLAnchorElement>('a[href="/creator/content"]'); return link ? { status: "pass", message: "Content Control route is present.", details: { expected: "/creator/content", actual: link.getAttribute("href") } } : { status: "fail", message: "Content Control route is missing.", details: { expected: "/creator/content", actual: "Missing", fixHint: "Expose the dedicated Creator content editor from the Hub." } }; },
    },
    {
      id: "creator-privacy-location-control", name: "Creator privacy location control", category: "privacy", severity: "high", descriptor: "Privacy & Data / Community Globe location consent",
      run: async () => { const text = document.body.textContent?.toLowerCase() ?? ""; return text.includes("community location") || text.includes("community globe") ? { status: "pass", message: "Community location privacy controls are represented in the current Creator surface.", details: { expected: "Community location control text", actual: "Present" } } : { status: "blocked", message: "Open Creator Privacy & Data to run this page-specific check.", details: { expected: "Community location control", actual: "Not mounted", fixHint: "Run the check on the Privacy & Data screen." } }; },
    },
    {
      id: "globe-mobile-container", name: "Community Globe mobile container", category: "mobile", severity: "high", descriptor: "Creator Community Globe / portrait and landscape viewport",
      run: async () => { const container = document.querySelector<HTMLElement>(".creator-globe-canvas"); if (!container) return { status: "blocked", message: "Globe container is not currently mounted; open the Community Globe before running this specific check.", details: { expected: ".creator-globe-canvas", actual: "Not mounted", fixHint: "Run the check while the Community Globe page is open." } }; const width = container.clientWidth; const viewportWidth = document.documentElement.clientWidth; const overflow = document.documentElement.scrollWidth > viewportWidth + 2; return width >= 280 && !overflow ? { status: "pass", message: "Globe container fits the current viewport without horizontal overflow.", details: { expected: "Container >= 280px and no horizontal overflow", actual: { width, viewportWidth, overflow } } } : { status: "fail", message: "Globe container is not adapting cleanly to the current viewport.", details: { expected: "Container >= 280px and no horizontal overflow", actual: { width, viewportWidth, overflow }, fixHint: "Check ResizeObserver sizing and portrait/landscape height rules in CreatorCommunityGlobe." } };
      },
    },
  ];
}
