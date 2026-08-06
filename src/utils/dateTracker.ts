export function calculateAge(dateString: string) {

  if (!dateString) return "Unknown";


  const startDate = new Date(dateString);
  const today = new Date();


  let years =
    today.getFullYear() -
    startDate.getFullYear();


  let months =
    today.getMonth() -
    startDate.getMonth();


  let days =
    today.getDate() -
    startDate.getDate();



  if (days < 0) {

    months--;

    const previousMonth =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        0
      );

    days += previousMonth.getDate();

  }



  if (months < 0) {

    years--;

    months += 12;

  }



  // Remaining days converted into weeks + days
  const weeks = Math.floor(days / 7);

  const remainingDays = days % 7;



  const parts: string[] = [];



  if (years > 0)

    parts.push(
      `${years} year${years !== 1 ? "s" : ""}`
    );



  if (months > 0)

    parts.push(
      `${months} month${months !== 1 ? "s" : ""}`
    );



  if (weeks > 0)

    parts.push(
      `${weeks} week${weeks !== 1 ? "s" : ""}`
    );



  if (remainingDays > 0 || parts.length === 0)

    parts.push(
      `${remainingDays} day${remainingDays !== 1 ? "s" : ""}`
    );



  return parts.join(", ");

}