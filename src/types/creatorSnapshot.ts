import type { GlobalStats } from "../services/creatorService";

export type UserRecord = Record<string, unknown>;
export type TileKey = "users" | "snakes" | "husbandry" | "community" | "mentorship" | "learning" | "genetics" | "operations" | "data" | "growth";
export type ConsentState = { community:boolean; location:boolean; analytics:boolean; established:boolean };
export type DrillRecord = { id:string; source:string; kind:string; ownerId?:string; ownerName?:string; title:string; status?:string; category?:string; date?:string; summary?:string; meta:string[] };
export type UserDetailFilter = "all"|"snakes"|"community"|"declined"|"unset"|"location"|"analytics";
export type OperationsDetailFilter = "all"|"posts"|"feedback"|"issues"|"activeIssues"|"morphs";
export type DetailFilter = UserDetailFilter|OperationsDetailFilter;
export type Snapshot = {
  stats:GlobalStats;
  users:UserRecord[];
  userIds:string[];
  consentByUser:Record<string,ConsentState>;
  consent:{accepted:number;declined:number;unset:number;location:number;analytics:number};
  mentors:{published:number;accepting:number;applications:number;pending:number;requests:number;activeRequests:number;workspaces:number;activeWorkspaces:number};
  community:{posts:number;feedback:number;issues:number;activeIssues:number;morphSubmissions:number;pendingMorphs:number};
  genetics:{calculations:number;approvedMorphImages:number};
  records:Record<TileKey,DrillRecord[]>;
  unavailableSources:string[];
};
