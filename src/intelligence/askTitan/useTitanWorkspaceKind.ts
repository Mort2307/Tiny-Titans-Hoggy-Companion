import { useEffect, useState } from "react";
import { getWorkspacePresentation, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../../services/workspacePresentationService";
import type { TitanWorkspaceKind } from "./titanChatContracts";

function toTitanWorkspaceKind(presentation: WorkspacePresentation): TitanWorkspaceKind {
  if (presentation.productId === "rescue") return "rescue";
  if (presentation.productId === "titan_seller") return "seller";
  if (["business_starter", "business_plus", "business_advanced"].includes(presentation.productId)) return "business";
  return "personal";
}

export function useTitanWorkspaceKind(): TitanWorkspaceKind {
  const [presentation, setPresentation] = useState<WorkspacePresentation>(() => getWorkspacePresentation());

  useEffect(() => subscribeToWorkspacePresentation(setPresentation), []);

  return toTitanWorkspaceKind(presentation);
}

export { toTitanWorkspaceKind };