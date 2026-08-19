import type { ReactNode } from "react";

export type EventListItem = {
  id: string;
  date: string;
  title: string;
  detail?: string;
  meta?: string;
  icon?: string;
};

type EventListProps = {
  items: EventListItem[];
  onSelect?: (item: EventListItem) => void;
  empty?: ReactNode;
};

/** One compact visual language for chronological keeper records. */
export default function EventList({ items, onSelect, empty }: EventListProps) {
  if (!items.length) return <>{empty ?? null}</>;

  return (
    <div className="tt-event-list">
      {items.map((item) => {
        const content = (
          <>
            <div className="tt-event-icon" aria-hidden="true">{item.icon ?? "•"}</div>
            <div className="tt-event-main">
              <div className="tt-event-heading">
                <strong>{item.title}</strong>
                <time dateTime={item.date}>{item.date}</time>
              </div>
              {item.detail && <p>{item.detail}</p>}
              {item.meta && <span>{item.meta}</span>}
            </div>
            {onSelect && <span className="tt-event-chevron" aria-hidden="true">›</span>}
          </>
        );

        return onSelect ? (
          <button key={item.id} type="button" className="tt-event-row" onClick={() => onSelect(item)}>
            {content}
          </button>
        ) : (
          <div key={item.id} className="tt-event-row tt-event-row--static">{content}</div>
        );
      })}
    </div>
  );
}
