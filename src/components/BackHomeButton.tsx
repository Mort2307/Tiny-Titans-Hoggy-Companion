import {
  useNavigate,
} from "react-router-dom";

function BackHomeButton() {

  const navigate =
    useNavigate();

  function goBack() {

    navigate(-1);
  }

  return (
    <button
      type="button"
      className="back-button"
      onClick={goBack}
    >
      <span
        className="back-button-arrow"
        aria-hidden="true"
      >
        ←
      </span>

      <span>
        Back
      </span>
    </button>
  );
}

export default BackHomeButton;