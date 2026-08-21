export type CommunityProjectStatus = "idea" | "active" | "completed" | "paused";
export type CommunityProjectRole = "owner" | "collaborator" | "observer";

export type CommunityProjectMilestone = {
  id: string;
  title: string;
  description?: string;
  status: "planned" | "in_progress" | "complete";
  completedAt?: unknown;
};

export type CommunityProjectAnimal = {
  snakeId?: string;
  displayName: string;
  species: string;
  sex?: "male" | "female" | "unknown";
  morph?: string;
  genetics?: string[];
  ownerId: string;
  public: boolean;
};

export type CommunityProject = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  status: CommunityProjectStatus;
  tags: string[];
  goal?: string;
  members: Array<{ userId: string; displayName?: string; role: CommunityProjectRole }>;
  animals: CommunityProjectAnimal[];
  milestones: CommunityProjectMilestone[];
  createdAt?: unknown;
  updatedAt?: unknown;
};
