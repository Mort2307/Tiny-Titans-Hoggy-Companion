import type { ReactNode } from "react";

export type PageShellTone = "default" | "compact";

export type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: string;
  actions?: ReactNode;
  children: ReactNode;
  tone?: PageShellTone;
  className?: string;
};

/**
 * Shared page frame for keeper-facing screens.
 * Domain pages own their content; this component owns hierarchy and rhythm.
 */
export default function PageShell({
  eyebrow,
  title,
  description,
  icon,
  actions,
  children,
  tone = "default",
  className = "",
}: PageShellProps) {
  return (
    <main className={`tt-page-shell tt-page-shell--${tone} ${className}`.trim()}>
      <header className="tt-page-header">
        <div className="tt-page-header-copy">
          {eyebrow && <p className="tt-page-eyebrow">{eyebrow}</p>}
          <h1 className="tt-page-title">
            {icon && <span className="tt-page-title-icon" aria-hidden="true">{icon}</span>}
            {title}
          </h1>
          {description && <p className="tt-page-description">{description}</p>}
        </div>
        {actions && <div className="tt-page-header-actions">{actions}</div>}
      </header>
      <div className="tt-page-content">{children}</div>
    </main>
  );
}
