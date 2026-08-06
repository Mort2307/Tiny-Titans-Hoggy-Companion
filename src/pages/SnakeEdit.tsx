import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { Snake } from "../types/Snake";
import type { Het } from "../types/genetics";
import type { WeightRecord } from "../types/Weight";

import SnakeForm from "../components/SnakeForm";
import BackHomeButton from "../components/BackHomeButton";



const emptyForm = {

  name: "",

  species: "Western Hognose",

  photo: "",

  sex: "Unknown" as Snake["sex"],

  morphs: [] as string[],

  customMorph: "",

  hets: [] as Het[],

  customHets: "",

  startingWeight: null as number | null,

  startingWeightDate: "",

  weight: null as number | null,

  lastWeighedDate: "",

  weightHistory: [] as WeightRecord[],

  hatchDate: "",

  arrivalDate: "",

  notes: "",

};







function SnakeEdit(){


  const { id } = useParams();


  const navigate = useNavigate();





  const [form,setForm] =

    useState(emptyForm);



  const [loaded,setLoaded] =

    useState(false);









  useEffect(()=>{


    const saved =

      localStorage.getItem(

        "tinyTitansSnakes"

      );



    if(!saved || !id)

      return;



    const snakes:Snake[] =

      JSON.parse(saved);





    const snake =

      snakes.find(

        item => item.id === id

      );



    if(!snake)

      return;







    setForm({

      name:snake.name,

      species:snake.species,

      photo:snake.photo,

      sex:snake.sex,

      morphs:snake.morphs ?? [],

      customMorph:snake.customMorph ?? "",

      hets:snake.hets ?? [],

      customHets:snake.customHets ?? "",

      startingWeight:snake.startingWeight ?? null,

      startingWeightDate:

        snake.startingWeightDate ?? "",

      weight:snake.weight ?? null,

      lastWeighedDate:

        snake.lastWeighedDate ?? "",

      weightHistory:

        snake.weightHistory ?? [],

      hatchDate:

        snake.hatchDate ?? "",

      arrivalDate:

        snake.arrivalDate ?? "",

      notes:

        snake.notes ?? "",

    });



    setLoaded(true);



  },[id]);









  function updateField(

    field:string,

    value:any

  ){



    setForm(prev => ({


      ...prev,


      [field]:value


    }));


  }









  function saveSnake(){



    if(!id)

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

      snakes.map(snake =>



        snake.id === id



          ? {


              ...snake,


              ...form,


              id:snake.id


            }



          : snake


      );









    localStorage.setItem(

      "tinyTitansSnakes",

      JSON.stringify(updated)

    );







    navigate(

      `/snakes/${id}`

    );



  }









  if(!loaded){


    return (

      <div className="page-container">


        <BackHomeButton />


        <h2>

          Loading Snake...

        </h2>


      </div>

    );


  }









  return (


    <div className="page-container">


      <BackHomeButton />


      <h1>

        ✏️ Edit Snake

      </h1>







      <SnakeForm


        form={form}


        updateField={updateField}


        onSave={saveSnake}


        editing={true}


      />





      <button

        onClick={()=>navigate(`/snakes/${id}`)}

      >

        Cancel

      </button>



    </div>


  );


}



export default SnakeEdit;