import { useEffect, useId, useRef, type ReactNode } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import TinyTitansAction from "./TinyTitansAction";

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function ConfirmActionDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", busy = false, destructive = true, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      cancelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        onCancelRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])
        .filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) {
        window.requestAnimationFrame(() => previousFocus.focus());
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="tiny-titans-confirm-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section ref={panelRef} className="tiny-titans-confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}>
        <div className="tiny-titans-confirm-icon" aria-hidden="true"><TinyTitansIcon name={destructive ? "delete" : "titan"} size={28} /></div>
        <h2 id={titleId}>{title}</h2>
        <div className="tiny-titans-confirm-description" id={descriptionId}>{description}</div>
        <div ref={cancelRef} className="tiny-titans-confirm-actions">
          <TinyTitansAction className="tiny-titans-confirm-cancel" variant="secondary" icon="close" label={cancelLabel} onClick={onCancel} disabled={busy} />
          <TinyTitansAction className={destructive ? "tiny-titans-confirm-danger" : "tiny-titans-confirm-primary"} variant={destructive ? "danger" : "primary"} icon={destructive ? "delete" : "check"} label={confirmLabel} onClick={onConfirm} busy={busy} />
        </div>
        {destructive && <small className="tiny-titans-confirm-warning">This action cannot be undone.</small>}
      </section>
    </div>
  );
}
