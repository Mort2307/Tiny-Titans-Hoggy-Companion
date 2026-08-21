const base = "/community/keeper-meets-breeder";

export const mentorshipDestinations = {
  overview: base,
  mentorProfile: (mentorId: string) => `${base}/mentor/${mentorId}`,
  request: (mentorId: string) => `${base}/request/${mentorId}`,
  workspace: (workspaceId: string) => `${base}/workspace/${workspaceId}`,
  milestones: (workspaceId: string) => `${base}/workspace/${workspaceId}/milestones`,
  mentorDashboard: `${base}/mentor-dashboard`,
  mentorApplication: `${base}/become-a-mentor`,
  creatorReview: "/creator/mentor-review",
} as const;

export type MentorshipDestination = ReturnType<typeof mentorshipDestinations.mentorProfile> | ReturnType<typeof mentorshipDestinations.request> | ReturnType<typeof mentorshipDestinations.workspace> | ReturnType<typeof mentorshipDestinations.milestones> | typeof mentorshipDestinations.overview | typeof mentorshipDestinations.mentorDashboard | typeof mentorshipDestinations.mentorApplication | typeof mentorshipDestinations.creatorReview;
