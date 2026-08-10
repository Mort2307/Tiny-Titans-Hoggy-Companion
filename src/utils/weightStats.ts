import type { WeightRecord } from "../types/Weight";


export function getTotalGrowth(
  startingWeight:number | null | undefined,
  currentWeight:number | null | undefined
){

  if(
    !startingWeight ||
    !currentWeight
  ){

    return null;

  }


  return currentWeight - startingWeight;

}





export function getAverageWeeklyGain(
  history:WeightRecord[]
){

  if(
    !history ||
    history.length < 2
  ){

    return null;

  }



  const sorted =
    [...history].sort(

      (a,b)=>

      new Date(a.date).getTime()

      -

      new Date(b.date).getTime()

    );



  const first =
    sorted[0];


  const last =
    sorted[sorted.length - 1];



  const days =

    (

      new Date(last.date).getTime()

      -

      new Date(first.date).getTime()

    )

    /

    (1000 * 60 * 60 * 24);





  if(days <= 0)

    return null;





  const weightGain =

    last.weight - first.weight;



  return (

    weightGain /

    (days / 7)

  );

}