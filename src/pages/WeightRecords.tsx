import { useState } from "react";
import { useParams } from "react-router-dom";

import BackHomeButton from "../components/BackHomeButton";
import WeightChart from "../components/WeightChart";

import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";


function sortWeightHistory(history:WeightRecord[]){

  return [...history].sort(

    (a,b)=>

      new Date(a.date).getTime()

      -

      new Date(b.date).getTime()

  );

}





function WeightRecords(){


  const { id } = useParams();




  const [snakes,setSnakes] =

    useState<Snake[]>(()=>{


      const saved =

        localStorage.getItem(

          "tinyTitansSnakes"

        );



      if(!saved)

        return [];




      return JSON.parse(saved).map(

        (snake:Snake)=>({


          ...snake,


          weightHistory:

            sortWeightHistory(

              snake.weightHistory ?? []

            )


        })

      );


    });







  const snake = snakes.find(

    item => item.id === id

  );







  const [weight,setWeight] =

    useState("");








  function addWeight(){


    if(!snake)

      return;




    const value = Number(weight);



    if(value <= 0)

      return;





    const today =

      new Date()

      .toISOString()

      .split("T")[0];





    const newRecord = {


      id:crypto.randomUUID(),


      snakeId:snake.id,


      weight:value,


      date:today


    };







    const updated = snakes.map(item=>{


      if(item.id !== snake.id)

        return item;





      return {


        ...item,


        weight:value,


        lastWeighedDate:today,


        weightHistory:

          sortWeightHistory([

            ...(item.weightHistory ?? []),

            newRecord

          ])


      };


    });






    setSnakes(updated);





    localStorage.setItem(

      "tinyTitansSnakes",

      JSON.stringify(updated)

    );





    setWeight("");



  }








  if(!snake){


    return (

      <div className="page-container">

        <BackHomeButton />

        <h2>

          🐍 Snake not found

        </h2>

      </div>

    );

  }







  return (

    <div className="page-container">


      <BackHomeButton />



      <h2>

        ⚖️ {snake.name} Weight Records

      </h2>





      <div className="tracker-card">


        <h3>

          Current Weight

        </h3>


        <strong>

          {snake.weight ?? "-"}g

        </strong>


      </div>







      <div className="tracker-card">


        <h3>

          Add Weight

        </h3>



        <input

          type="number"

          placeholder="Weight in grams"

          value={weight}

          onChange={(e)=>

            setWeight(e.target.value)

          }

        />



        <button

          onClick={addWeight}

        >

          💾 Save Weight

        </button>


      </div>







      <div className="tracker-card">


        <h3>

          📈 Weight History

        </h3>



        {

          snake.weightHistory?.length

          ?

          snake.weightHistory.map(record=>(


            <p key={record.id}>


              {record.date}

              {" - "}

              {record.weight}g


            </p>


          ))

          :

          <p>

            No weights recorded yet.

          </p>


        }


      </div>








      <div className="tracker-card">


        <h3>

          Growth Chart

        </h3>



        <WeightChart

          history={snake.weightHistory ?? []}

        />


      </div>



    </div>

  );


}



export default WeightRecords;