import type { ReactNode } from "react";

type Tone = "default" | "positive" | "attention" | "danger";

export function TTPage({
  eyebrow,
  title,
  description,
  back,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  back?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="tt-page">
      <header className="tt-page-header">
        <div className="tt-page-heading">
          {back}
          {eyebrow && <p className="tt-page-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="tt-page-description">{description}</p>}
        </div>
        {actions && <div className="tt-page-actions">{actions}</div>}
      </header>
      {children}
    </main>
  );
}

export function TTSection({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="tt-section">
      {(title || description || actions) && (
        <header className="tt-section-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="tt-section-actions">{actions}</div>}
        </header>
      )}
      <div className="tt-section-body">{children}</div>
    </section>
  );
}

export function TTStat({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}) {
  return (
    <article className="tt-stat" data-tone={tone}>
      <span className="tt-stat-label">{label}</span>
      <strong className="tt-stat-value">{value}</strong>
      {detail && <span className="tt-stat-detail">{detail}</span>}
    </article>
  );
}

export function TTStatGrid({ children }: { children: ReactNode }) {
  return <div className="tt-stat-grid">{children}</div>;
}

export function TTActions({ children }: { children: ReactNode }) {
  return <div className="tt-actions">{children}</div>;
}

export function TTFeedback({
  tone = "default",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <div className="tt-feedback" data-tone={tone} role={tone === "danger" ? "alert" : "status"}>
      {children}
    </div>
  );
}
