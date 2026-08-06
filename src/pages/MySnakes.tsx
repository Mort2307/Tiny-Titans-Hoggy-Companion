import { useEffect, useState } from "react";

import type { Snake } from "../types/Snake";

import SnakeTile from "../components/SnakeTile";
import BackHomeButton from "../components/BackHomeButton";


function MySnakes() {


const [snakes, setSnakes] = useState<Snake[]>([]);



useEffect(() => {


const saved = localStorage.getItem(
"tinyTitansSnakes"
);



if(!saved){

setSnakes([]);

return;

}



try {


const loaded: Snake[] = JSON.parse(saved);



setSnakes(

loaded.map((snake)=>({


...snake,


morphs:
snake.morphs ?? [],


hets:
snake.hets ?? [],


weightHistory:
snake.weightHistory ?? []


}))

);



}

catch(error){


console.error(
"Unable to load snakes",
error
);


setSnakes([]);


}



}, []);





return (

<div className="page-container">


<BackHomeButton />



<div className="page-header">


<h1>
🐍 My Hoggies
</h1>



<button

onClick={()=>{

console.log(
"Add Snake form coming next"
);

}}

>

➕ Add Snake

</button>



</div>





{

snakes.length === 0 ?


(

<div className="tracker-card">


<h3>
No snakes added yet
</h3>


<p>
Add your first Western Hognose to begin tracking.
</p>


</div>

)


:


(

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
snake.weightHistory
}


/>


))

}


</div>

)

}



</div>

);

}


export default MySnakes;