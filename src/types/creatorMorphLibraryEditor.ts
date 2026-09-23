import type { ApprovedMorphImage } from "./morphSubmission";

export type MorphImageEditVersion = {
  storagePath: string;
  imageUrl: string;
  editAction?: string;
  editedAt?: unknown;
};

export type EditorImage = ApprovedMorphImage & {
  imageUrl: string;
  editHistory?: MorphImageEditVersion[];
};
