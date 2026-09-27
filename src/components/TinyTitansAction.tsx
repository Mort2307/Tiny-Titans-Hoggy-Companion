import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import "../styles/tiny-titans-action.css";

export type TinyTitansActionVariant = "primary" | "secondary" | "danger" | "ghost" | "inline";

type SharedProps = {
  children?: ReactNode;
  label?: string;
  icon?: TinyTitansIconName;
  endIcon?: TinyTitansIconName;
  variant?: TinyTitansActionVariant;
  compact?: boolean;
  busy?: boolean;
  className?: string;
  ariaLabel?: string;
};

type Props = SharedProps & {
  to?: string;
  href?: string;
  onClick?: () => void;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  target?: string;
  rel?: string;
};

export default function TinyTitansAction({
  children,
  label,
  icon,
  endIcon,
  variant = "secondary",
  compact = false,
  busy = false,
  className = "",
  ariaLabel,
  to,
  href,
  onClick,
  type = "button",
  disabled = false,
  target,
  rel,
}: Props) {
  const classes = `tt-action tt-action--${variant}${compact ? " tt-action--compact" : ""} ${className}`.trim();
  const content = (
    <>
      {icon && <TinyTitansIcon name={icon} size={compact ? 15 : 17} />}
      <span>{busy ? "Working…" : children ?? label}</span>
      {endIcon && !busy && <TinyTitansIcon name={endIcon} size={compact ? 14 : 16} />}
    </>
  );
  const accessibleLabel = ariaLabel ?? label;

  if (to && !disabled && !busy) {
    return <Link className={classes} to={to} aria-label={accessibleLabel}>{content}</Link>;
  }

  if (href && !disabled && !busy) {
    return <a className={classes} href={href} target={target} rel={rel} aria-label={accessibleLabel}>{content}</a>;
  }

  return (
    <button
      className={classes}
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={accessibleLabel}
    >
      {content}
    </button>
  );
}
