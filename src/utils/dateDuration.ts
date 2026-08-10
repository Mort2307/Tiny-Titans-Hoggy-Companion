export function getDateDuration(
  startDate: string,
  endDate = new Date()
): string {
  if (!startDate) {
    return "-";
  }

  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return "-";
  }

  const end = new Date(endDate);

  if (start > end) {
    return "Not yet";
  }

  let years =
    end.getFullYear() -
    start.getFullYear();

  let months =
    end.getMonth() -
    start.getMonth();

  let days =
    end.getDate() -
    start.getDate();

  if (days < 0) {
    months--;

    const previousMonth =
      new Date(
        end.getFullYear(),
        end.getMonth(),
        0
      );

    days += previousMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  /*
   * For short periods, show weeks.
   * Once we have months/years, keep the
   * remaining time in days.
   */

  if (years === 0 && months === 0) {
    const totalDays = days;

    if (totalDays === 0) {
      return "Today";
    }

    const weeks =
      Math.floor(totalDays / 7);

    const remainingDays =
      totalDays % 7;

    const parts: string[] = [];

    if (weeks > 0) {
      parts.push(
        `${weeks} week${
          weeks !== 1 ? "s" : ""
        }`
      );
    }

    if (remainingDays > 0) {
      parts.push(
        `${remainingDays} day${
          remainingDays !== 1 ? "s" : ""
        }`
      );
    }

    return parts.join(", ");
  }

  const parts: string[] = [];

  if (years > 0) {
    parts.push(
      `${years} year${
        years !== 1 ? "s" : ""
      }`
    );
  }

  if (months > 0) {
    parts.push(
      `${months} month${
        months !== 1 ? "s" : ""
      }`
    );
  }

  if (days > 0) {
    parts.push(
      `${days} day${
        days !== 1 ? "s" : ""
      }`
    );
  }

  return parts.join(", ");
}