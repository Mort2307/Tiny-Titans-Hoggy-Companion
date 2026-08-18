import type { ReactNode } from "react";

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
  if (!open) return null;
  return (
    <div className="tiny-titans-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="tiny-titans-confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description">
        <div className="tiny-titans-confirm-icon" aria-hidden="true">{destructive ? "🗑️" : "✨"}</div>
        <h2 id="confirm-action-title">{title}</h2>
        <div className="tiny-titans-confirm-description" id="confirm-action-description">{description}</div>
        <div className="tiny-titans-confirm-actions">
          <button className="tiny-titans-confirm-cancel" type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className={destructive ? "tiny-titans-confirm-danger" : "tiny-titans-confirm-primary"} type="button" onClick={onConfirm} disabled={busy} aria-label={confirmLabel}>{busy ? "Working…" : confirmLabel}</button>
        </div>
        {destructive && <small className="tiny-titans-confirm-warning">This action cannot be undone.</small>}
      </section>
    </div>
  );
}
