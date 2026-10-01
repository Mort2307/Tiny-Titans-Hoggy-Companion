import type { ReactNode } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import "../styles/tiny-titans-feedback.css";

export type TinyTitansFeedbackKind = "success" | "error" | "warning" | "info" | "loading" | "offline";

type Props = {
  kind?: TinyTitansFeedbackKind;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  role?: "alert" | "status";
};

const ICONS: Record<TinyTitansFeedbackKind, TinyTitansIconName> = {
  success: "check",
  error: "warning",
  warning: "warning",
  info: "info",
  loading: "rotate",
  offline: "warning",
};

export default function TinyTitansFeedback({
  kind = "info",
  children,
  className = "",
  compact = false,
  role,
}: Props) {
  const resolvedRole = role ?? (kind === "error" || kind === "warning" || kind === "offline" ? "alert" : "status");
  return (
    <div
      className={`tt-feedback tt-feedback--${kind}${compact ? " tt-feedback--compact" : ""} ${className}`.trim()}
      role={resolvedRole}
      aria-live={resolvedRole === "alert" ? "assertive" : "polite"}
      aria-busy={kind === "loading" || undefined}
    >
      <span className="tt-feedback__icon" aria-hidden="true">
        <TinyTitansIcon name={ICONS[kind]} size={18} />
      </span>
      <div className="tt-feedback__copy">{children}</div>
    </div>
  );
}
