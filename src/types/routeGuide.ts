export type RouteGuideStep = {
  path: string;
  target: string;
  title?: string;
  instruction?: string;
  allowSkipIfMissing?: boolean;
};

export type RouteGuideDefinition = {
  id: string;
  title: string;
  steps: RouteGuideStep[];
};
