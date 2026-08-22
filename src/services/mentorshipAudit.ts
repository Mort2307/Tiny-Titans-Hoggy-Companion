export type MentorshipAuditAction = "request_created" | "request_accepted" | "request_declined" | "workspace_created" | "permission_changed" | "message_sent" | "milestone_updated" | "mentorship_completed" | "workspace_closed";

export type MentorshipAuditEvent = {
  id: string;
  workspaceId: string;
  actorId: string;
  action: MentorshipAuditAction;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
};

export function buildAuditEvent(workspaceId: string, actorId: string, action: MentorshipAuditAction, metadata?: MentorshipAuditEvent["metadata"]): MentorshipAuditEvent {
  return { id: crypto.randomUUID(), workspaceId, actorId, action, metadata, createdAt: new Date().toISOString() };
}

export function canShareHealthRecords(explicitHealthPermission: boolean, veterinaryContext = false) {
  return explicitHealthPermission && !veterinaryContext;
}
