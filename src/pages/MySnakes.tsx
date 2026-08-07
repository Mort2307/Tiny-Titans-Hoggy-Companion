import { useEffect, useState } from "react";

import type { Snake } from "../types/Snake";

import { migrateSnake } from "../utils/snakeMigration";

import SnakeTile from "../components/SnakeTile";
import BackHomeButton from "../components/BackHomeButton";


function MySnakes() {

  const [snakes, setSnakes] = useState<Snake[]>([]);



  useEffect(() => {

    const saved =
      localStorage.getItem(
        "tinyTitansSnakes"
      );



    if (!saved) return;



    try {

      const loaded =
        JSON.parse(saved);



      const migrated =
        loaded.map(
          (snake: Partial<Snake>) =>
            migrateSnake(snake)
        );



      setSnakes(migrated);



      localStorage.setItem(
        "tinyTitansSnakes",
        JSON.stringify(migrated)
      );


    }

    catch(error) {

      console.error(
        "Unable to load snakes",
        error
      );

    }


  }, []);




  return (

    <div className="page-container">


      <BackHomeButton />



      <h1>
        🐍 My Hoggies
      </h1>




      <div className="snake-grid">


        {
          snakes.map(
            (snake)=>(

              <SnakeTile

                key={snake.id}

                id={snake.id}

                name={snake.name}

                photo={snake.photo}

                sex={snake.sex}

                weight={snake.weight}

                weightHistory={
                  snake.weightHistory
                }

                clickDestination="profile"

              />

            )
          )
        }


      </div>


    </div>

  );

}


export default MySnakes;