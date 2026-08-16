import type { ReactNode } from "react";

type FullScreenSubviewProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  onBack: () => void;
  children: ReactNode;
};

/**
 * Shared app-wide pattern for drill-down views.
 * Use this instead of rendering secondary detail content underneath a list/card.
 * Modals remain appropriate for short confirmation/review actions.
 */
export default function FullScreenSubview({ eyebrow, title, description, onBack, children }: FullScreenSubviewProps) {
  return (
    <section className="full-screen-subview" aria-label={title}>
      <header className="full-screen-subview__header">
        <button type="button" className="full-screen-subview__back" onClick={onBack} aria-label={`Back from ${title}`}>
          <span aria-hidden="true">←</span>
          Back
        </button>
        <div className="full-screen-subview__heading">
          {eyebrow && <span className="creator-admin-kicker">{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="full-screen-subview__content">{children}</div>
    </section>
  );
}
