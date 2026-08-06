import { useNavigate } from "react-router-dom";

import type { Het } from "../types/genetics";


type SnakeCardProps = {

  id: string;

  name: string;

  photo: string;

  morphs: string[];

  customMorph: string;

  hets: Het[];

  customHets: string;

  sex: string;

  startingWeight: string;

  weight: string;

  lastWeighedDate: string;

  hatchDate: string;

  arrivalDate: string;

  onDelete: () => void;

  onEdit: () => void;

};





function SnakeCard({

  id,

  name,

  photo,

  morphs,

  customMorph,

  hets,

  customHets,

  sex,

  startingWeight,

  weight,

  lastWeighedDate,

  hatchDate,

  arrivalDate,

  onDelete,

  onEdit,

}: SnakeCardProps) {


const navigate = useNavigate();





function calculateAge(date:string){


  if(!date)
    return "Unknown";



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





  const totalDays =
    Math.floor(

      (
        now.getTime()
        -
        start.getTime()

      )
      /
      (1000 * 60 * 60 * 24)

    );



  const weeks =
    Math.floor(
      (totalDays % 30) / 7
    );





  const parts:string[]=[];



  if(years)
    parts.push(
      `${years} year${years !== 1 ? "s" : ""}`
    );



  if(months)
    parts.push(
      `${months} month${months !== 1 ? "s" : ""}`
    );



  if(weeks)
    parts.push(
      `${weeks} week${weeks !== 1 ? "s" : ""}`
    );



  if(days || parts.length===0)
    parts.push(
      `${days} day${days !== 1 ? "s" : ""}`
    );



  return parts.join(", ");


}







return (

<div className="snake-card">





{photo ? (


<img

src={photo}

alt={name}

style={{

width:"100%",

borderRadius:"10px"

}}

/>


)

:

(

<div>

🐍

<p>
No Photo
</p>

</div>

)

}







<h3>
{name}
</h3>







<p>
Sex: {sex}
</p>







<h4>
🧬 Morphs
</h4>





{morphs?.length > 0 ?


morphs.map((morph)=>(

<span key={morph}>

{morph}

<br/>

</span>


))


:

<p>
No morphs listed
</p>


}







{customMorph && (

<p>

Extra genetics:

<br/>

{customMorph}

</p>

)}







<h4>
🧬 Hets
</h4>






{hets?.length > 0 ?


hets.map((het,index)=>(


<p key={index}>


{het.percentage === "100%"
?
"🧬"
:
"❓"
}


{" "}


{het.percentage}


{" "}


{het.percentage === "100%"
?
"Het"
:
"Pos Het"
}


{" "}


{het.gene}



</p>


))


:

<p>
No hets listed
</p>


}







{customHets && (

<p>

Genetics Notes:

<br/>

{customHets}

</p>

)}









<h4>
⚖️ Weight
</h4>






<p>

Starting Weight:

<br/>

{startingWeight || "-"}g

</p>







<p>

Current Weight:

<br/>

<strong>
{weight || "-"}g
</strong>

</p>







<p>

Last Weighed:

<br/>

{lastWeighedDate || "-"}

</p>









<h4>
📅 Dates
</h4>







<p>

🥚 Hatch Date:

<br/>

{hatchDate || "-"}

</p>







{hatchDate && (

<p>

🎂 Age:

<br/>

<strong>
{calculateAge(hatchDate)}
</strong>

</p>

)}









<p>

🏠 Arrival Date:

<br/>

{arrivalDate || "-"}

</p>







{arrivalDate && (

<p>

⏳ Owned:

<br/>

<strong>
{calculateAge(arrivalDate)}
</strong>

</p>

)}










<div className="snake-card-buttons">


<button

onClick={() =>
navigate(`/snakes/${id}`)
}

>

👁 View Profile

</button>





<button onClick={onEdit}>

✏️ Edit

</button>





<button onClick={onDelete}>

🗑 Delete

</button>


</div>





</div>


);


}



export default SnakeCard;