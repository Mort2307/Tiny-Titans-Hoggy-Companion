export type CareGuideCategory =
  | 'getting-started'
  | 'housing'
  | 'heating'
  | 'lighting'
  | 'humidity'
  | 'substrate'
  | 'feeding'
  | 'handling'
  | 'shedding'
  | 'health'
  | 'brumation'
  | 'breeding'
  | 'safety'
  | 'troubleshooting';

export type CareGuideAudience = 'beginner' | 'keeper' | 'breeder' | 'advanced';

export interface CareGuideSection {
  id: string;
  title: string;
  body: string;
  important?: boolean;
  warning?: boolean;
}

export interface CareGuide {
  id: string;
  title: string;
  category: CareGuideCategory;
  audience: CareGuideAudience[];
  summary: string;
  sections: CareGuideSection[];
  tags: string[];
  published: boolean;
  version: number;
  reviewedAt?: string;
  reviewedBy?: string;
  sourceNotes?: string[];
  lastUpdated: string;
}
