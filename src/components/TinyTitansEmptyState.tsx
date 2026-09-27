import { Link } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
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
  const actionContent = action ? (
    <>
      <TinyTitansIcon name={action.icon ?? "forward"} size={17} />
      <span>{action.label}</span>
    </>
  ) : null;

  return (
    <div className={`tt-empty-state${compact ? " tt-empty-state--compact" : ""}`} role="status">
      <div className="tt-empty-state__icon" aria-hidden="true">
        <TinyTitansIcon name={icon} size={30} />
      </div>
      <div className="tt-empty-state__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action && action.to ? (
        <Link className="tt-empty-state__action" to={action.to}>{actionContent}</Link>
      ) : action && action.href ? (
        <a className="tt-empty-state__action" href={action.href}>{actionContent}</a>
      ) : action && action.onClick ? (
        <button className="tt-empty-state__action" type="button" onClick={action.onClick}>{actionContent}</button>
      ) : null}
    </div>
  );
}
