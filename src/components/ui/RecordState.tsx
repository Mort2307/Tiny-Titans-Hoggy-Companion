import type { ReactNode } from "react";

type RecordStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
  tone?: "empty" | "error" | "success";
};

/** Shared empty/error/success presentation for tracker and record screens. */
export function RecordState({
  title,
  description,
  action,
  icon = "🐍",
  tone = "empty",
}: RecordStateProps) {
  return (
    <section className={`tt-record-state tt-record-state--${tone}`} role={tone === "error" ? "alert" : undefined}>
      <div className="tt-record-state-icon" aria-hidden="true">{icon}</div>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {action && <div className="tt-record-state-action">{action}</div>}
      </div>
    </section>
  );
}

export function LoadingState({ label = "Loading your records…" }: { label?: string }) {
  return (
    <div className="tt-loading-state" role="status" aria-live="polite">
      <span className="tt-loading-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
