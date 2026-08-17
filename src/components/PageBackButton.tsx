import { useNavigate } from "react-router-dom";

type PageBackButtonProps = {
  fallbackPath: string;
  label?: string;
};

export default function PageBackButton({ fallbackPath, label = "Back" }: PageBackButtonProps) {
  const navigate = useNavigate();

  function handleBack() {
    const historyState = window.history.state as { idx?: unknown } | null;
    const routerIndex = typeof historyState?.idx === "number" ? historyState.idx : 0;
    if (routerIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath, { replace: true });
  }

  return (
    <button className="page-back-button" type="button" onClick={handleBack} aria-label={`${label} to previous page`}>
      <span aria-hidden="true">←</span>
      {label}
    </button>
  );
}
