export const mentorshipDestinations = {
  overview: "/keeper-meets-breeder",
  mentorProfile: (mentorId: string) => `/keeper-meets-breeder/mentor/${mentorId}`,
  request: (mentorId: string) => `/keeper-meets-breeder/request/${mentorId}`,
  workspace: (workspaceId: string) => `/keeper-meets-breeder/workspace/${workspaceId}`,
  milestones: (workspaceId: string) => `/keeper-meets-breeder/workspace/${workspaceId}/milestones`,
  mentorDashboard: "/keeper-meets-breeder/mentor-dashboard",
  mentorApplication: "/keeper-meets-breeder/become-a-mentor",
  creatorReview: "/creator-centre/mentor-review",
} as const;

export type MentorshipDestination = ReturnType<typeof mentorshipDestinations.mentorProfile> | ReturnType<typeof mentorshipDestinations.request> | ReturnType<typeof mentorshipDestinations.workspace> | ReturnType<typeof mentorshipDestinations.milestones> | typeof mentorshipDestinations.overview | typeof mentorshipDestinations.mentorDashboard | typeof mentorshipDestinations.mentorApplication | typeof mentorshipDestinations.creatorReview;
