import type { BehaviourPrimaryCategory } from "../data/behaviourTaxonomy";
export type KeeperObservationStatus = "pending" | "under-review" | "approved" | "rejected" | "archived";
export type KeeperObservationMediaKind = "video" | "image";
export type KeeperObservationConfidence = "unsure" | "fairly-confident" | "very-confident";
export type KeeperObservationCategory = BehaviourPrimaryCategory;
export type KeeperObservationCreditMode = "anonymous" | "credited";
export interface KeeperObservationMedia { id:string; kind:KeeperObservationMediaKind; path:string; fileName:string; contentType:string; sizeBytes:number; durationSeconds?:number; createdAt:string; }
export interface KeeperObservation { id:string; userId:string; contributorDisplayName?:string; contributorCreditMode?:KeeperObservationCreditMode; snakeId?:string; snakeName?:string; species:string; title:string; category:KeeperObservationCategory; subcategory?:string; observedBehaviour:string; description:string; observedAt:string; submittedAt:string; confidence:KeeperObservationConfidence; context:{ beforeEvent:string[]; afterEvent?:string; feedingMethod?:string; temperatureC?:number; humidityPercent?:number; handlingRecently?:boolean; shedStage?:string; enclosureChangeRecently?:boolean; interpretation?:string; }; media:KeeperObservationMedia[]; educationalConsent:boolean; anonymousDisplay:boolean; status:KeeperObservationStatus; reviewerNotes?:string; reviewedAt?:string; reviewedByUid?:string; createdFromAppVersion?:string; updatedAt?:string; }
