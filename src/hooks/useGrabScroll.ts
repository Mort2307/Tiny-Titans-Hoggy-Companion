import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type ScrollElement = HTMLDivElement;

export function useGrabScroll() {
  const ref = useRef<ScrollElement | null>(null);
  const pointerId = useRef<number | null>(null);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const dragged = useRef(false);

  function onPointerDown(event: ReactPointerEvent<ScrollElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const element = ref.current;
    if (!element) return;

    pointerId.current = event.pointerId;
    startY.current = event.clientY;
    startScrollTop.current = element.scrollTop;
    dragged.current = false;
    element.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<ScrollElement>) {
    if (pointerId.current !== event.pointerId) return;

    const element = ref.current;
    if (!element) return;

    const deltaY = event.clientY - startY.current;
    if (Math.abs(deltaY) > 5) dragged.current = true;
    if (!dragged.current) return;

    element.scrollTop = startScrollTop.current - deltaY;
    event.preventDefault();
  }

  function endDrag(event: ReactPointerEvent<ScrollElement>) {
    if (pointerId.current !== event.pointerId) return;

    const element = ref.current;
    if (element?.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }

    pointerId.current = null;
  }

  function onClickCapture(event: React.MouseEvent<ScrollElement>) {
    if (!dragged.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragged.current = false;
  }

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
  };
}
