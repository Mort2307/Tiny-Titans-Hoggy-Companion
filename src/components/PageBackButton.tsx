import { useNavigate } from "react-router-dom";

type PageBackButtonProps = {
  fallbackPath: string;
  label?: string;
};

export default function PageBackButton({ fallbackPath, label = "Back" }: PageBackButtonProps) {
  const navigate = useNavigate();

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath);
  }

  return (
    <button className="page-back-button" type="button" onClick={handleBack} aria-label={`${label} to previous page`}>
      <span aria-hidden="true">←</span>
      {label}
    </button>
  );
}
