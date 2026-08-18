export type RouteJourneyStep = {
  route: string;
  action?: string;
};

export type RouteJourneyResult = {
  status: "PASS" | "FAIL";
  visitedRoutes: string[];
  uniqueRoutes: string[];
  repeatedCycle?: string[];
  deadEnd: boolean;
  reason: string;
};

function normaliseRoute(route: string): string {
  const [path] = route.split("?");
  return path.replace(/\/+$/, "") || "/";
}

export function analyseRouteJourney(steps: RouteJourneyStep[]): RouteJourneyResult {
  const visitedRoutes = steps.map((step) => normaliseRoute(step.route));
  const uniqueRoutes = [...new Set(visitedRoutes)];

  for (let start = 0; start < visitedRoutes.length - 2; start += 1) {
    const candidate = visitedRoutes.slice(start, start + 3);
    if (candidate[0] === candidate[2] && candidate[0] !== candidate[1]) {
      return {
        status: "FAIL",
        visitedRoutes,
        uniqueRoutes,
        repeatedCycle: candidate,
        deadEnd: false,
        reason: `Navigation cycle detected: ${candidate.join(" → ")}`,
      };
    }
  }

  const lastStep = steps.at(-1);
  const deadEnd = Boolean(lastStep && !lastStep.action);

  return {
    status: deadEnd ? "FAIL" : "PASS",
    visitedRoutes,
    uniqueRoutes,
    deadEnd,
    reason: deadEnd
      ? `Journey ended at ${visitedRoutes.at(-1) ?? "/"} without a recorded destination action.`
      : "No repeated route cycle or dead-end was detected in the supplied journey.",
  };
}
