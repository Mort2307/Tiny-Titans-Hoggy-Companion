import { useNavigate } from "react-router-dom";

function BackHomeButton() {

  const navigate = useNavigate();

  function goBack() {

    navigate(-1);

  }


  return (

    <button

      className="back-button"

      onClick={goBack}

    >

      ← Back

    </button>

  );

}


export default BackHomeButton;