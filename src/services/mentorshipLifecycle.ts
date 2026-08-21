export type MentorshipLifecycleStatus = "sent" | "accepted" | "declined" | "active" | "paused" | "completed" | "closed";

const transitions: Record<MentorshipLifecycleStatus, MentorshipLifecycleStatus[]> = {
  sent: ["accepted", "declined", "closed"],
  accepted: ["active", "declined", "closed"],
  declined: ["closed"],
  active: ["paused", "completed", "closed"],
  paused: ["active", "closed"],
  completed: ["closed"],
  closed: [],
};

export function canTransitionMentorship(from: MentorshipLifecycleStatus, to: MentorshipLifecycleStatus) {
  return transitions[from].includes(to);
}

export function assertMentorshipTransition(from: MentorshipLifecycleStatus, to: MentorshipLifecycleStatus) {
  if (!canTransitionMentorship(from, to)) throw new Error(`Invalid mentorship transition: ${from} → ${to}`);
}

export function getLifecycleLabel(status: MentorshipLifecycleStatus) {
  return {
    sent: "Request sent",
    accepted: "Accepted",
    declined: "Declined",
    active: "Active mentorship",
    paused: "Paused",
    completed: "Completed",
    closed: "Closed",
  }[status];
}
