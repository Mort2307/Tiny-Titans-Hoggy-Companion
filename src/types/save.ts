export type SaveStage =
  | "idle"
  | "preparing"
  | "processing-photo"
  | "uploading-photo"
  | "saving-profile"
  | "syncing"
  | "complete"
  | "error";
