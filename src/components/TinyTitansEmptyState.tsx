import TinyTitansIcon from "./TinyTitansIcon";
import TinyTitansAction from "./TinyTitansAction";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import "../styles/tiny-titans-empty-state.css";

type EmptyStateAction = {
  label: string;
  icon?: TinyTitansIconName;
  to?: string;
  href?: string;
  onClick?: () => void;
};

type Props = {
  icon?: TinyTitansIconName;
  title: string;
  description: string;
  action?: EmptyStateAction;
  compact?: boolean;
};

export default function TinyTitansEmptyState({
  icon = "info",
  title,
  description,
  action,
  compact = false,
}: Props) {
  return (
    <div className={`tt-empty-state${compact ? " tt-empty-state--compact" : ""}`} role="status">
      <div className="tt-empty-state__icon" aria-hidden="true">
        <TinyTitansIcon name={icon} size={30} />
      </div>
      <div className="tt-empty-state__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action ? (
        <TinyTitansAction
          className="tt-empty-state__action"
          variant="secondary"
          icon={action.icon}
          to={action.to}
          href={action.href}
          onClick={action.onClick}
          label={action.label}
        />
      ) : null}
    </div>
  );
}
