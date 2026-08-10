import type { Snake } from "../types/Snake";


export type WeightReminderStatus =
  | "disabled"
  | "upcoming"
  | "due"
  | "overdue";


export type WeightReminder = {

  status: WeightReminderStatus;

  nextDate: string | null;

  daysRemaining: number | null;

};




function getFrequencyDays(
  frequency: Snake["weightTracking"]["frequency"]
) {

  switch (frequency) {

    case "Weekly":
      return 7;

    case "Fortnightly":
      return 14;

    case "Every 3 Weeks":
      return 21;

    case "Monthly":
      return 30;

    default:
      return 30;

  }

}





export function getWeightReminder(
  snake: Snake
): WeightReminder {


  if (!snake.weightTracking?.enabled) {

    return {

      status: "disabled",

      nextDate: null,

      daysRemaining: null

    };

  }




  if (!snake.lastWeighedDate) {

    return {

      status: "due",

      nextDate: null,

      daysRemaining: 0

    };

  }





  const lastDate =
    new Date(
      snake.lastWeighedDate
    );



  const nextDate =
    new Date(lastDate);



  nextDate.setDate(

    nextDate.getDate()

    +

    getFrequencyDays(
      snake.weightTracking.frequency
    )

  );





  const today =
    new Date();



  today.setHours(
    0,
    0,
    0,
    0
  );



  nextDate.setHours(
    0,
    0,
    0,
    0
  );





  const difference =

    Math.ceil(

      (

        nextDate.getTime()

        -

        today.getTime()

      )

      /

      (1000 * 60 * 60 * 24)

    );







  let status: WeightReminderStatus;



  if (difference < 0) {

    status = "overdue";

  }

  else if (difference === 0) {

    status = "due";

  }

  else {

    status = "upcoming";

  }







  return {

    status,

    nextDate:

      nextDate

        .toISOString()

        .split("T")[0],


    daysRemaining:

      difference

  };


}