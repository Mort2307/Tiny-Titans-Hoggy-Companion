import { useEffect, useState } from "react";

import type { Snake } from "../types/Snake";

import SnakeTile from "../components/SnakeTile";
import BackHomeButton from "../components/BackHomeButton";


function WeightIndex(){

const [snakes,setSnakes] = useState<Snake[]>([]);



useEffect(()=>{

const saved =
  localStorage.getItem(
    "tinyTitansSnakes"
  );


if(!saved)

  return;



try{

  setSnakes(
    JSON.parse(saved)
  );

}

catch(error){

  console.error(
    "Unable to load snakes",
    error
  );

}


},[]);



return (

<div className="page-container">


<BackHomeButton />


<h1>
⚖️ Weight Records
</h1>


<p>
Select a snake to view and manage weight history.
</p>



<div className="snake-grid">


{

snakes.map((snake)=>(


<SnakeTile

key={snake.id}

id={snake.id}

name={snake.name}

photo={snake.photo}

sex={snake.sex}

weight={snake.weight}

weightHistory={
snake.weightHistory ?? []
}

clickDestination="weight"

/>


))

}


</div>


</div>

);

}


export default WeightIndex;