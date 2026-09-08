export type RouteGuideStep = {
  path: string;
  target: string;
  title?: string;
  instruction?: string;
};

export type RouteGuideDefinition = {
  id: string;
  title: string;
  steps: RouteGuideStep[];
};
