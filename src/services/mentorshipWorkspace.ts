export type WorkspaceStatus = "requested" | "active" | "paused" | "completed" | "closed";
export type WorkspaceRole = "mentor" | "mentee";
export type WorkspacePermission = "view_profile" | "view_weight" | "view_feeding" | "view_sheds" | "view_genetics" | "view_enclosure" | "view_photos" | "view_health";
export type WorkspaceParticipant = { userId:string; role:WorkspaceRole; joinedAt:string };
export type WorkspaceMessage = { id:string; senderId:string; body:string; createdAt:string; editedAt?:string; deletedAt?:string };
export type WorkspaceEvent = { id:string; type:"request"|"accepted"|"permission-changed"|"milestone-updated"|"message"|"completed"; actorId:string; createdAt:string; summary:string };
export type MentorshipWorkspace = { id:string; goal:string; status:WorkspaceStatus; participants:WorkspaceParticipant[]; permissions:Record<WorkspacePermission,boolean>; messages:WorkspaceMessage[]; events:WorkspaceEvent[]; createdAt:string; updatedAt:string };
export const defaultWorkspacePermissions:Record<WorkspacePermission,boolean>={view_profile:true,view_weight:false,view_feeding:false,view_sheds:false,view_genetics:false,view_enclosure:false,view_photos:false,view_health:false};
export function canReadPermission(workspace:MentorshipWorkspace,permission:WorkspacePermission,requesterId:string){return workspace.participants.some(p=>p.userId===requesterId)&&workspace.permissions[permission]===true;}
export function canSendMessage(workspace:MentorshipWorkspace,requesterId:string){return workspace.status==="active"&&workspace.participants.some(p=>p.userId===requesterId);}
export function revokeAllRecordPermissions(workspace:MentorshipWorkspace){return{...workspace,permissions:{...defaultWorkspacePermissions}};}
export function createWorkspace(goal:string,menteeId:string,mentorId:string,now=new Date().toISOString()):MentorshipWorkspace{return{id:crypto.randomUUID(),goal,status:"active",participants:[{userId:menteeId,role:"mentee",joinedAt:now},{userId:mentorId,role:"mentor",joinedAt:now}],permissions:{...defaultWorkspacePermissions},messages:[],events:[],createdAt:now,updatedAt:now};}
