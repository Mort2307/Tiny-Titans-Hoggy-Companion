import { useNavigate } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";

type Props = {
  fallback?: string;
};

function BackHomeButton({ fallback = "/" }: Props) {
  const navigate = useNavigate();

  function goBack() {
    const historyState = window.history.state as { idx?: unknown } | null;
    const routerIndex = typeof historyState?.idx === "number" ? historyState.idx : 0;
    if (routerIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }

  return (
    <div className="back-home-button-wrap">
      <button type="button" className="back-button" onClick={goBack}>
        <span className="back-button-arrow" aria-hidden="true"><TinyTitansIcon name="back" size={18} /></span>
        <span>Back</span>
      </button>
    </div>
  );
}

export default BackHomeButton;
