import { useEffect, useId, useRef, type ReactNode } from "react";
import TinyTitansIcon from "./TinyTitansIcon";

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

export default function ConfirmActionDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", busy = false, destructive = true, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;
  return (
    <div className="tiny-titans-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="tiny-titans-confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}>
        <div className="tiny-titans-confirm-icon" aria-hidden="true"><TinyTitansIcon name={destructive ? "delete" : "titan"} size={28} /></div>
        <h2 id={titleId}>{title}</h2>
        <div className="tiny-titans-confirm-description" id={descriptionId}>{description}</div>
        <div className="tiny-titans-confirm-actions">
          <button ref={cancelRef} className="tiny-titans-confirm-cancel" type="button" onClick={onCancel} disabled={busy}><TinyTitansIcon name="close" size={16} />{cancelLabel}</button>
          <button className={destructive ? "tiny-titans-confirm-danger" : "tiny-titans-confirm-primary"} type="button" onClick={onConfirm} disabled={busy} aria-label={confirmLabel}><TinyTitansIcon name={destructive ? "delete" : "check"} size={16} />{busy ? "Working…" : confirmLabel}</button>
        </div>
        {destructive && <small className="tiny-titans-confirm-warning">This action cannot be undone.</small>}
      </section>
    </div>
  );
}
