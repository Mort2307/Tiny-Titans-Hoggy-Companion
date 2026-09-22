import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type HeaderOverlayPortalProps = {
  children: ReactNode;
};

export default function HeaderOverlayPortal({ children }: HeaderOverlayPortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
