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
    <div className="snake-tracker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="snake-tracker-panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description">
        <h2 id="confirm-action-title">{title}</h2>
        <div id="confirm-action-description">{description}</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
          <button type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} disabled={busy} aria-label={confirmLabel}>{busy ? "Working…" : confirmLabel}</button>
        </div>
        {destructive && <small style={{ display: "block", marginTop: "12px" }}>This action cannot be undone.</small>}
      </section>
    </div>
  );
}
