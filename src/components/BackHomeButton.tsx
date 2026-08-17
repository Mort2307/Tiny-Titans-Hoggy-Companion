import { useNavigate } from "react-router-dom";

type Props = {
  fallback?: string;
};

function BackHomeButton({ fallback = "/" }: Props) {
  const navigate = useNavigate();

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }

  return (
    <button type="button" className="back-button" onClick={goBack}>
      <span className="back-button-arrow" aria-hidden="true">←</span>
      <span>Back</span>
    </button>
  );
}

export default BackHomeButton;
