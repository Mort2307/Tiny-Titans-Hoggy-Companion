import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import type { Snake } from "../types/Snake";

import BackHomeButton from "../components/BackHomeButton";



function SnakeProfile() {


  const { id } = useParams();

  const navigate = useNavigate();


  const [snake, setSnake] = useState<Snake | null>(null);





  useEffect(() => {


    const saved =
      localStorage.getItem(
        "tinyTitansSnakes"
      );



    if (!saved) {

      setSnake(null);

      return;

    }



    try {


      const snakes: Snake[] =
        JSON.parse(saved);



      const found =
        snakes.find(
          item =>
            item.id === id
        );



      if(found){

        setSnake({

          ...found,

          morphs:
            found.morphs ?? [],

          hets:
            found.hets ?? [],

          weightHistory:
            found.weightHistory ?? []

        });

      }

      else {

        setSnake(null);

      }



    }

    catch(error){


      console.error(
        "Unable to load snake profile",
        error
      );


      setSnake(null);


    }



  }, [id]);









  function calculateAge(date:string){


    if(!date)

      return "-";



    const start =
      new Date(date);


    const now =
      new Date();



    let years =
      now.getFullYear()
      -
      start.getFullYear();



    let months =
      now.getMonth()
      -
      start.getMonth();



    let days =
      now.getDate()
      -
      start.getDate();





    if(days < 0){


      months--;


      const previousMonth =
        new Date(

          now.getFullYear(),

          now.getMonth(),

          0

        );


      days += previousMonth.getDate();


    }






    if(months < 0){


      years--;

      months += 12;


    }





    const result:string[] = [];



    if(years)

      result.push(
        `${years} year${years !== 1 ? "s" : ""}`
      );



    if(months)

      result.push(
        `${months} month${months !== 1 ? "s" : ""}`
      );



    if(days)

      result.push(
        `${days} day${days !== 1 ? "s" : ""}`
      );



    return result.join(", ");



  }









  function deleteSnake(){


    if(!snake)

      return;



    const confirmed =
      window.confirm(
        `Delete ${snake.name}? This cannot be undone.`
      );



    if(!confirmed)

      return;





    const saved =
      localStorage.getItem(
        "tinyTitansSnakes"
      );



    if(!saved)

      return;



    const snakes:Snake[] =
      JSON.parse(saved);





    const updated =
      snakes.filter(

        item =>

          item.id !== snake.id

      );





    localStorage.setItem(

      "tinyTitansSnakes",

      JSON.stringify(updated)

    );



    navigate("/snakes");


  }









  if(!snake){


    return (

      <div className="page-container">


        <BackHomeButton />


        <h2>

          🐍 Snake not found

        </h2>


        <p>

          The snake profile could not be loaded.

        </p>


      </div>

    );

  }









  return (


    <div className="page-container">


      <BackHomeButton />



      <h1>

        🐍 {snake.name}

      </h1>






      <div className="tracker-card">


        {

          snake.photo

          ?

          <img

            src={snake.photo}

            alt={snake.name}

            style={{

              width:"100%",

              borderRadius:"15px"

            }}

          />

          :

          <div

            style={{

              fontSize:"80px",

              textAlign:"center"

            }}

          >

            🐍

          </div>

        }


      </div>








      <div className="tracker-card">


        <h2>

          📋 Basic Information

        </h2>



        <p>

          Species:

          <br/>

          <strong>

            {snake.species}

          </strong>

        </p>




        <p>

          Sex:

          <br/>

          <strong>

            {snake.sex}

          </strong>

        </p>


      </div>








      <div className="tracker-card">


        <h2>

          🧬 Genetics

        </h2>



        <p>

          Morphs:

          <br/>

          <strong>

          {

            snake.morphs?.length

            ?

            snake.morphs.join(", ")

            :

            "None listed"

          }

          </strong>

        </p>




        <p>

          Hets:

          <br/>

          <strong>

          {

            snake.hets?.length

            ?

            snake.hets.map(

              het =>

              `${het.percentage} ${
                het.percentage === "100%"
                ? "Het"
                : "Possible Het"
              } ${het.gene}`

            ).join(", ")

            :

            "None listed"

          }

          </strong>

        </p>


      </div>








      <div className="tracker-card">


        <h2>

          ⚖️ Weight

        </h2>



        <p>

          Current Weight:

          <br/>

          <strong>

            {snake.weight ?? "-"}

            g

          </strong>

        </p>





        <p>

          Starting Weight:

          <br/>

          <strong>

            {snake.startingWeight ?? "-"}

            g

          </strong>

        </p>





        <p>

          Starting Weight Date:

          <br/>

          <strong>

            {snake.startingWeightDate || "-"}

          </strong>

        </p>





        <button

          onClick={() =>
            navigate(
              `/weights/${snake.id}`
            )
          }

        >

          📈 View Weight Records

        </button>


      </div>









      <div className="tracker-card">


        <h2>

          📅 Timeline

        </h2>



        <p>

          🥚 Hatch Date:

          <br/>

          <strong>

            {snake.hatchDate || "-"}

          </strong>

        </p>





        {

          snake.hatchDate &&

          <p>

            🎂 Age:

            <br/>

            <strong>

              {calculateAge(snake.hatchDate)}

            </strong>

          </p>

        }





        <p>

          🏠 Arrival Date:

          <br/>

          <strong>

            {snake.arrivalDate || "-"}

          </strong>

        </p>


      </div>








      <div className="tracker-card">


        <h2>

          📝 Notes

        </h2>



        <p>

          {snake.notes || "No notes added"}

        </p>


      </div>









      <div className="tracker-card snake-profile-actions">


        <button

          onClick={() =>
            navigate(
              `/snakes/${snake.id}/edit`
            )
          }

        >

          ✏️ Edit Snake

        </button>





        <button

          onClick={deleteSnake}

        >

          🗑️ Delete Snake

        </button>





        <button

          onClick={() =>
            navigate(
              `/feeding/${snake.id}`
            )
          }

        >

          🍽 Log Feeding

        </button>





        <button

          onClick={() =>
            navigate(
              `/shedding/${snake.id}`
            )
          }

        >

          🐍 Log Shed

        </button>


      </div>





    </div>


  );


}



export default SnakeProfile;